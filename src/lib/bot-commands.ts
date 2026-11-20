// Answers for the WhatsApp bot (tools/wa-notifier). The bot has no database access: it forwards a
// commanding number's message to /api/internal/bot, which calls runBotCommand() and sends the text
// back. Anything that changes the store answers with `confirm: true` first; the bot then waits for
// "yes" and calls again with `confirmed: true`.

import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { searchProductIds } from '@/lib/product-search'
import { parseMaintenance } from '@/lib/site-settings-shared'
import { getHeldPrices } from '@/lib/daraz-admin'

export interface BotReply { text: string; confirm?: boolean }

const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000
const DAY_MS = 86_400_000
const SUMMARY_KEY = 'BOT_DAILY_SUMMARY'

/** Midnight Nepal time for the day containing `d`, as a UTC instant. */
export function nptDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + NPT_OFFSET_MS)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - NPT_OFFSET_MS)
}

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`
const nptTime = (d: Date) => new Date(d.getTime() + NPT_OFFSET_MS).toISOString().slice(11, 16)
const nptDate = (d: Date) => new Date(d.getTime() + NPT_OFFSET_MS).toISOString().slice(0, 10)
const ref = (o: { orderCode: string | null; id: string }) => o.orderCode ?? o.id.slice(0, 8).toUpperCase()

async function salesBetween(start: Date, end: Date) {
  const agg = await prisma.order.aggregate({
    where: { createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
    _sum: { total: true }, _count: true,
  })
  return { count: agg._count, revenue: agg._sum.total ?? 0 }
}

async function findOrder(arg: string) {
  const code = arg.trim().replace(/^#/, '')
  if (!code) return null
  const include = { items: true } as const
  const exact = await prisma.order.findFirst({ where: { orderCode: { equals: code, mode: 'insensitive' } }, include })
  if (exact) return exact
  const tail = await prisma.order.findMany({ where: { orderCode: { endsWith: code, mode: 'insensitive' } }, include, take: 2 })
  if (tail.length === 1) return tail[0]
  const byId = await prisma.order.findMany({ where: { id: { startsWith: code.toLowerCase() } }, include, take: 2 })
  return byId.length === 1 ? byId[0] : null
}

type FoundOrder = NonNullable<Awaited<ReturnType<typeof findOrder>>>

function orderText(o: FoundOrder): string {
  return [
    `Order ${ref(o)}  [${o.status}]`,
    `${nptDate(o.createdAt)} ${nptTime(o.createdAt)}  ${o.paymentMethod} ${o.paymentStatus}`,
    `${o.name}, ${o.phone}`,
    [o.address, o.city].filter(Boolean).join(', '),
    ...o.items.map(i => `  ${i.quantity} x ${i.name.slice(0, 55)}${i.variantTitle ? ` (${i.variantTitle})` : ''}  ${rs(i.price * i.quantity)}`),
    `Delivery ${rs(o.deliveryCharge)}  Total ${rs(o.total)}`,
  ].join('\n')
}

async function ordersCommand(): Promise<string> {
  const now = new Date()
  const start = nptDayStart(now)
  const [today, waiting, recent] = await Promise.all([
    salesBetween(start, now),
    prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } } }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 3 * DAY_MS) } }, orderBy: { createdAt: 'desc' }, take: 8 }),
  ])
  return [
    `Today: ${today.count} order${today.count === 1 ? '' : 's'}, ${rs(today.revenue)}`,
    `Not yet shipped: ${waiting}`,
    recent.length ? '' : 'No orders in the last 3 days.',
    ...recent.map(o => `${ref(o)}  ${o.status}  ${rs(o.total)}  ${o.name.slice(0, 20)}  ${nptDate(o.createdAt).slice(5)} ${nptTime(o.createdAt)}`),
    recent.length ? '\nSend "order <code>" for details.' : '',
  ].filter(l => l !== '').join('\n')
}

async function salesCommand(): Promise<string> {
  const now = new Date()
  const start = nptDayStart(now)
  const [today, yesterday, week, month] = await Promise.all([
    salesBetween(start, now),
    salesBetween(new Date(start.getTime() - DAY_MS), start),
    salesBetween(new Date(start.getTime() - 6 * DAY_MS), now),
    salesBetween(new Date(start.getTime() - 29 * DAY_MS), now),
  ])
  const line = (label: string, s: { count: number; revenue: number }) => `${label}: ${s.count} order${s.count === 1 ? '' : 's'}, ${rs(s.revenue)}`
  return ['Website sales (cancelled orders left out)', line('Today', today), line('Yesterday', yesterday), line('Last 7 days', week), line('Last 30 days', month)].join('\n')
}

async function stockCommand(arg: string): Promise<string> {
  if (!arg) return 'Send "stock <product name>", for example: stock water bottle'
  const ids = (await searchProductIds(arg)).slice(0, 6)
  if (ids.length === 0) return `No product matches "${arg}".`
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, stock: true, trackInventory: true, price: true, salePrice: true, variants: { where: { isActive: true }, select: { title: true, stock: true } } },
  })
  rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  return rows.map(p => {
    const head = `${p.name.slice(0, 60)}\n  ${p.trackInventory ? (p.stock > 0 ? `${p.stock} in stock` : 'SOLD OUT') : 'stock not tracked'}, ${rs(p.salePrice ?? p.price)}`
    const variants = p.trackInventory && p.variants.length > 1 ? `\n  ${p.variants.slice(0, 8).map(v => `${v.title}: ${v.stock}`).join(', ')}` : ''
    return head + variants
  }).join('\n')
}

async function maintenanceCommand(arg: string, confirmed: boolean): Promise<BotReply> {
  const row = await prisma.appSetting.findUnique({ where: { key: 'MAINTENANCE_JSON' } })
  const current = parseMaintenance(row?.value)
  const state = current.closed ? 'CLOSED (maintenance screen)' : current.ordersPaused ? 'open, ordering PAUSED' : 'open and taking orders'
  const want = arg.toLowerCase()
  if (!['on', 'off', 'pause'].includes(want)) {
    return { text: `The store is ${state}.\nSend "maintenance on" to close it, "maintenance pause" to stop orders only, "maintenance off" to reopen.` }
  }
  const next = { ...current, closed: want === 'on', ordersPaused: want === 'pause' }
  const effect = want === 'on' ? 'CLOSE the store: customers will see only the maintenance screen'
    : want === 'pause' ? 'PAUSE ordering: customers can browse but not check out'
    : 'REOPEN the store and take orders again'
  if (!confirmed) return { text: `The store is ${state}.\nThis will ${effect}.\nSend "yes" within 2 minutes to do it.`, confirm: true }
  await prisma.appSetting.upsert({
    where: { key: 'MAINTENANCE_JSON' },
    update: { value: JSON.stringify(next) },
    create: { key: 'MAINTENANCE_JSON', value: JSON.stringify(next) },
  })
  revalidatePath('/', 'layout')
  return { text: `Done. The store is now ${want === 'on' ? 'CLOSED' : want === 'pause' ? 'open with ordering PAUSED' : 'open'}. It can take up to a minute to reach every visitor.` }
}

const STATUS_FOR: Record<string, OrderStatus> = { confirm: 'CONFIRMED', ship: 'SHIPPED', deliver: 'DELIVERED', cancel: 'CANCELLED' }
const ALLOWED_FROM: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'SHIPPED', 'CANCELLED'],
  CONFIRMED:  ['SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  [],
  CANCELLED:  [],
}

async function statusCommand(verb: string, arg: string, confirmed: boolean, origin: string): Promise<BotReply> {
  const status = STATUS_FOR[verb]
  if (!arg) return { text: `Send "${verb} <order code>". Send "orders" to see recent codes.` }
  const order = await findOrder(arg)
  if (!order) return { text: `No single order matches "${arg}". Send "orders" to see recent codes.` }
  if (!ALLOWED_FROM[order.status].includes(status)) {
    return { text: `Order ${ref(order)} is ${order.status}, so it cannot be set to ${status}.` }
  }
  if (!confirmed) {
    return { text: `${orderText(order)}\n\nSet this order to ${status}? The customer is notified.\nSend "yes" within 2 minutes to do it.`, confirm: true }
  }
  // Go through the admin endpoint, so the customer email, push and stock handling are exactly
  // what a status change in the admin panel does.
  const token = await signToken({ sub: 'whatsapp-bot', email: 'bot@internal', role: 'ADMIN', name: 'WhatsApp bot' } as Parameters<typeof signToken>[0])
  const res = await fetch(`${origin}/api/admin/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `auth-token=${token}` },
    body: JSON.stringify({ status }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    return { text: `Could not change order ${ref(order)}: ${err.error ?? `the site answered ${res.status}`}` }
  }
  return { text: `Done. Order ${ref(order)} is now ${status}.` }
}

async function darazCommand(): Promise<string> {
  const [stats, held, runs] = await Promise.all([
    prisma.$queryRaw<{ shop: string; open: bigint; today: bigint }[]>`
      SELECT shop,
             count(*) FILTER (WHERE status !~* 'cancel|returned|failed|delivered|lost|damaged|shipped_back') AS open,
             count(*) FILTER (WHERE placed_at >= ${new Date(Date.now() - DAY_MS)}) AS today
        FROM marketplace_orders GROUP BY shop ORDER BY shop`,
    getHeldPrices(),
    prisma.syncRun.findMany({ where: { status: 'FAILED', startedAt: { gte: new Date(Date.now() - DAY_MS) } }, select: { job: true } }),
  ])
  const label: Record<string, string> = { balapasa: 'Bala Pasa', trendwave: 'TrendWave' }
  return [
    'Daraz',
    ...stats.map(s => `${label[s.shop] ?? s.shop}: ${Number(s.open)} open order${Number(s.open) === 1 ? '' : 's'}, ${Number(s.today)} in the last 24 hours`),
    stats.length ? '' : 'No Daraz orders copied yet.',
    `Held prices: ${held.length}${held.length ? ' (send "held")' : ''}`,
    `Failed jobs in the last 24 hours: ${runs.length}${runs.length ? ` (${[...new Set(runs.map(r => r.job))].join(', ')})` : ''}`,
  ].filter(l => l !== '').join('\n')
}

/** The 20:00 daily summary. Returns null when the summary is switched off. */
export async function dailySummary(force = false): Promise<string | null> {
  if (!force) {
    const row = await prisma.appSetting.findUnique({ where: { key: SUMMARY_KEY } })
    if (row?.value === 'off') return null
  }
  const now = new Date()
  const start = nptDayStart(now)
  const [today, yesterday, waiting, visitors, viewed, daraz] = await Promise.all([
    salesBetween(start, now),
    salesBetween(new Date(start.getTime() - DAY_MS), start),
    prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT visitor_id) AS n FROM page_views WHERE created_at >= ${start}`.catch(() => [{ n: BigInt(0) }]),
    prisma.$queryRaw<{ name: string; views: bigint }[]>`
      SELECT p.name, count(*) AS views FROM page_views v JOIN products p ON v.path = '/products/' || p.slug
       WHERE v.created_at >= ${start} GROUP BY p.name ORDER BY count(*) DESC LIMIT 3`.catch(() => []),
    darazCommand(),
  ])
  return [
    `Balapasa daily summary, ${nptDate(now)}`,
    `Website orders today: ${today.count}, ${rs(today.revenue)} (yesterday ${yesterday.count}, ${rs(yesterday.revenue)})`,
    `Not yet shipped: ${waiting}`,
    `Visitors today: ${Number(visitors[0]?.n ?? 0)}`,
    ...(viewed.length ? ['Most viewed:', ...viewed.map(v => `  ${v.name.slice(0, 55)} (${Number(v.views)})`)] : []),
    '',
    daraz,
  ].join('\n')
}

export const BOT_HELP = [
  'orders - today and recent website orders',
  'order <code> - one order in full',
  'sales - sales today, 7 and 30 days',
  'stock <name> - stock of matching products',
  'daraz - Daraz orders, held prices, failed jobs',
  'confirm <code>, ship <code>, deliver <code>, cancel <code> - change an order (asks first)',
  'maintenance on | pause | off - close, pause or reopen the store (asks first)',
  'summary - the daily summary now; "summary off" / "summary on" for the 8 pm message',
].join('\n')

export async function runBotCommand(command: string, arg: string, confirmed: boolean, origin: string): Promise<BotReply | null> {
  switch (command) {
    case 'orders': return { text: await ordersCommand() }
    case 'order': {
      if (!arg) return { text: 'Send "order <code>". Send "orders" to see recent codes.' }
      const order = await findOrder(arg)
      return { text: order ? orderText(order) : `No single order matches "${arg}".` }
    }
    case 'sales': return { text: await salesCommand() }
    case 'stock': return { text: await stockCommand(arg) }
    case 'daraz': return { text: await darazCommand() }
    case 'maintenance': return maintenanceCommand(arg, confirmed)
    case 'confirm': case 'ship': case 'deliver': case 'cancel': return statusCommand(command, arg, confirmed, origin)
    case 'summary': {
      const want = arg.toLowerCase()
      if (want === 'on' || want === 'off') {
        await prisma.appSetting.upsert({ where: { key: SUMMARY_KEY }, update: { value: want }, create: { key: SUMMARY_KEY, value: want } })
        return { text: `The 8 pm daily summary is now ${want}.` }
      }
      return { text: (await dailySummary(true)) ?? '' }
    }
    default: return null
  }
}

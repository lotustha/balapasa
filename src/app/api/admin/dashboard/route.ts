import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Nepal is UTC+5:45 — there is no DST. We compute calendar-day boundaries in NPT
// explicitly (shift into NPT, truncate to midnight, shift back to the UTC
// instant) so "Today"/"Yesterday" mean the Nepal day regardless of the server's
// own timezone. (The previous `new Date(y,m,d)` boundary was only correct if the
// server happened to run on NPT.)
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000
const DAY_MS = 86_400_000

function nptDayStart(d: Date): Date {
  const npt = new Date(d.getTime() + NPT_OFFSET_MS)
  const midnightUtc = Date.UTC(npt.getUTCFullYear(), npt.getUTCMonth(), npt.getUTCDate())
  return new Date(midnightUtc - NPT_OFFSET_MS)
}

type Range = 'today' | 'yesterday' | '7d' | '30d'
const RANGES: Range[] = ['today', 'yesterday', '7d', '30d']

function resolveRange(range: Range, now: Date): { start: Date; end: Date; label: string } {
  const todayStart = nptDayStart(now)
  switch (range) {
    case 'yesterday': return { start: new Date(todayStart.getTime() - DAY_MS), end: todayStart, label: 'Yesterday' }
    case '7d':        return { start: new Date(todayStart.getTime() - 6 * DAY_MS),  end: now, label: 'Last 7 days' }
    case '30d':       return { start: new Date(todayStart.getTime() - 29 * DAY_MS), end: now, label: 'Last 30 days' }
    case 'today':
    default:          return { start: todayStart, end: now, label: 'Today' }
  }
}

function pctChange(curr: number, prev: number): number | null {
  if (prev <= 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export async function GET(req: NextRequest) {
  try {
    const rangeParam = req.nextUrl.searchParams.get('range') as Range | null
    const range: Range = rangeParam && RANGES.includes(rangeParam) ? rangeParam : 'today'

    const now = new Date()
    const { start, end, label } = resolveRange(range, now)
    // Fair like-for-like comparison: the equal-length window immediately before
    // this one. For a partial "today" this compares to the same elapsed slice of
    // yesterday rather than a full day.
    const winLen   = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - winLen)
    const prevEnd   = start

    const [
      revenueAgg, prevRevenueAgg,
      ordersInRange, prevOrdersInRange,
      paidOrdersInRange,
      newCustomers, prevNewCustomers, totalCustomers,
      pendingOrders, confirmedOrders, processingOrders, shippedOrders,
      productCount, outOfStockCount,
      recentOrders, topProducts,
      lowStockProducts,
      dailyRevenue,
    ] = await Promise.all([
      // ── Range-scoped performance ──
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: start, lt: end } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: prevStart, lt: prevEnd } }, _sum: { total: true } }),

      prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.order.count({ where: { createdAt: { gte: prevStart, lt: prevEnd } } }),
      prisma.order.count({ where: { paymentStatus: 'PAID', createdAt: { gte: start, lt: end } } }),

      prisma.profile.count({ where: { role: 'CUSTOMER', createdAt: { gte: start, lt: end } } }),
      prisma.profile.count({ where: { role: 'CUSTOMER', createdAt: { gte: prevStart, lt: prevEnd } } }),
      prisma.profile.count({ where: { role: 'CUSTOMER' } }),

      // ── Live operations (NOT range-scoped — current pipeline / inventory) ──
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),

      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, trackInventory: true, stock: 0 } }),

      prisma.order.findMany({
        orderBy: { createdAt: 'desc' }, take: 8,
        select: {
          id: true, name: true, total: true, status: true,
          paymentMethod: true, paymentStatus: true, createdAt: true,
          items: { select: { name: true }, take: 1 },
        },
      }),

      // Top products by sales — scoped to the selected range.
      prisma.$queryRaw<{ id: string; name: string; images: string[]; total_qty: bigint; total_rev: number }[]>`
        SELECT p.id, p.name, p.images,
               SUM(oi.quantity) AS total_qty,
               SUM(oi.quantity * oi.price) AS total_rev
        FROM products p
        JOIN order_items oi ON oi.product_id = p.id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${start} AND o.created_at < ${end}
        GROUP BY p.id, p.name, p.images
        ORDER BY total_qty DESC LIMIT 5
      `,

      // Low & out of stock — live.
      prisma.product.findMany({
        where: { isActive: true, trackInventory: true, stock: { lte: 10 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, name: true, stock: true, lowStockThreshold: true, images: true, category: { select: { name: true } } },
      }),

      // Daily revenue across the selected range (uniform daily buckets, NPT).
      prisma.$queryRaw<{ day: string; revenue: number }[]>`
        SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD') AS day,
               COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${start} AND created_at < ${end}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD'),
                 DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
        ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
      `,
    ])

    const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM products
      WHERE is_active = true AND track_inventory = true AND stock > 0 AND stock <= low_stock_threshold
    `.then(r => Number(r[0].count)).catch(() => 0)

    const revenue  = revenueAgg._sum.total ?? 0
    const prevRev  = prevRevenueAgg._sum.total ?? 0
    const avgOrder = paidOrdersInRange > 0 ? Math.round(revenue / paidOrdersInRange) : 0

    return Response.json({
      range,
      rangeLabel: label,
      stats: {
        // Range-scoped performance
        revenue:   { value: revenue,        previous: prevRev,         change: pctChange(revenue, prevRev) },
        orders:    { value: ordersInRange,  previous: prevOrdersInRange, change: pctChange(ordersInRange, prevOrdersInRange) },
        customers: { value: newCustomers,   previous: prevNewCustomers,  change: pctChange(newCustomers, prevNewCustomers), total: totalCustomers },
        avgOrder:  { value: avgOrder },
        // Live operations
        pipeline:  { pending: pendingOrders, confirmed: confirmedOrders, processing: processingOrders, shipped: shippedOrders, total: pendingOrders + confirmedOrders + processingOrders + shippedOrders },
        products:  { total: productCount, lowStock: lowStockCount, outOfStock: outOfStockCount },
      },
      dailyRevenue: dailyRevenue.map(r => ({ day: r.day, revenue: Number(r.revenue) })),
      recentOrders: recentOrders.map(o => ({
        id: o.id, customer: o.name, product: o.items[0]?.name ?? '—',
        amount: o.total, status: o.status, payment: o.paymentMethod,
        paid: o.paymentStatus === 'PAID', createdAt: o.createdAt.toISOString(),
      })),
      topProducts: topProducts.map(p => ({
        id: p.id, name: p.name, image: (p.images as string[])[0] ?? null,
        sales: Number(p.total_qty), revenue: Number(p.total_rev),
      })),
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id, name: p.name, stock: p.stock,
        threshold: p.lowStockThreshold, image: p.images[0] ?? null,
        category: p.category.name,
      })),
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

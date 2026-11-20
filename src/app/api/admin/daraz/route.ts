import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { DARAZ_JOBS, getDarazControls, getHeldPrices, type DarazJob } from '@/lib/daraz-admin'
import { isJobRunning } from './run/jobs'

export const dynamic = 'force-dynamic'

// Everything the admin Daraz page shows except the order list: job status, recent runs, held and
// recent price changes, and order totals.
export async function GET() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const [controls, runs, held, prices, orderStats, quiet] = await Promise.all([
    getDarazControls(),
    prisma.syncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 40 }),
    getHeldPrices(),
    prisma.priceHistory.findMany({ where: { status: 'APPLIED' }, orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.$queryRaw<{ shop: string; total: bigint; open: bigint; today: bigint }[]>`
      SELECT shop, count(*) AS total,
             count(*) FILTER (WHERE status !~* 'cancel|returned|failed|delivered|lost|damaged|shipped_back') AS open,
             count(*) FILTER (WHERE placed_at >= ${new Date(Date.now() - 86_400_000)}) AS today
        FROM marketplace_orders GROUP BY shop`,
    prisma.appSetting.findUnique({ where: { key: 'daraz.orders.lastQuietRun' } }).catch(() => null),
  ])

  const enabled: Record<DarazJob, boolean> = { website: controls.websiteSync, mirror: controls.mirrorSync, orders: controls.ordersSync }
  const jobs = (Object.keys(DARAZ_JOBS) as DarazJob[]).map(job => {
    const last = runs.find(r => r.job === job) ?? null
    // The orders job only records runs that changed something; its quiet runs leave a timestamp.
    const quietAt = job === 'orders' && quiet?.value ? new Date(quiet.value) : null
    const lastAt = [last?.startedAt ?? null, quietAt].filter((d): d is Date => Boolean(d)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    return {
      job, label: DARAZ_JOBS[job].label, schedule: DARAZ_JOBS[job].schedule, enabled: enabled[job],
      running: isJobRunning(job),
      lastAt, lastStatus: last && lastAt && last.startedAt.getTime() === lastAt.getTime() ? last.status : lastAt ? 'OK' : null,
      lastChanges: last?.changes ?? 0,
    }
  })

  return Response.json({
    canAct: guard.user.role === 'ADMIN',
    jobs,
    runs: runs.slice(0, 25),
    held,
    prices,
    orderStats: orderStats.map(s => ({ shop: s.shop, total: Number(s.total), open: Number(s.open), today: Number(s.today) })),
  })
}

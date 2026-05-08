import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const months = Number(searchParams.get('months') ?? 6)

  try {
    const now = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - months)

    // Previous period: same duration, ending at "from"
    const prevFrom = new Date(from)
    prevFrom.setMonth(prevFrom.getMonth() - months)
    const prevTo = new Date(from)

    const [
      revenueRows,
      expenseRows,
      byCat,
      prevRevenueRow,
      prevExpenseRow,
      pendingRow,
      orderCountRow,
      recentOrders,
      recentExpenses,
    ] = await Promise.all([
      // Monthly revenue (current period)
      prisma.$queryRaw<{ month: string; revenue: number }[]>`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
               COALESCE(SUM(total), 0)        AS revenue
        FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${from}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `,
      // Monthly expenses (current period)
      prisma.$queryRaw<{ month: string; expenses: number }[]>`
        SELECT TO_CHAR(date, 'YYYY-MM') AS month,
               COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        WHERE date >= ${from}
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
      `,
      // Expense by category (current period)
      prisma.expense.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { date: { gte: from } },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Previous period: total revenue
      prisma.$queryRaw<{ revenue: number }[]>`
        SELECT COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${prevFrom} AND created_at < ${prevTo}
      `,
      // Previous period: total expenses
      prisma.$queryRaw<{ expenses: number }[]>`
        SELECT COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        WHERE date >= ${prevFrom} AND date < ${prevTo}
      `,
      // Pending / outstanding revenue (unpaid, non-cancelled orders)
      prisma.$queryRaw<{ pending: number }[]>`
        SELECT COALESCE(SUM(total), 0) AS pending
        FROM orders
        WHERE payment_status = 'UNPAID' AND status NOT IN ('CANCELLED')
      `,
      // Paid order count for AOV
      prisma.$queryRaw<{ cnt: number }[]>`
        SELECT COUNT(*) AS cnt FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${from}
      `,
      // Recent paid orders (for activity feed)
      prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, total: true, paymentMethod: true, createdAt: true },
      }),
      // Recent expenses (for activity feed)
      prisma.expense.findMany({
        orderBy: { date: 'desc' },
        take: 6,
        select: { id: true, amount: true, category: true, description: true, date: true },
      }),
    ])

    // Build monthly P&L map
    const monthMap: Record<string, { revenue: number; expenses: number }> = {}
    for (const r of revenueRows) monthMap[r.month] = { ...(monthMap[r.month] ?? { expenses: 0 }), revenue: Number(r.revenue) }
    for (const e of expenseRows) monthMap[e.month] = { ...(monthMap[e.month] ?? { revenue: 0 }), expenses: Number(e.expenses) }

    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { revenue, expenses }]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-NP', { month: 'short', year: 'numeric' }),
        revenue, expenses,
        profit: revenue - expenses,
      }))

    const totalRevenue  = monthly.reduce((s, m) => s + m.revenue, 0)
    const totalExpenses = monthly.reduce((s, m) => s + m.expenses, 0)
    const totalProfit   = totalRevenue - totalExpenses

    const prevRevenue  = Number(prevRevenueRow[0]?.revenue  ?? 0)
    const prevExpenses = Number(prevExpenseRow[0]?.expenses ?? 0)
    const prevProfit   = prevRevenue - prevExpenses
    const pendingRevenue = Number(pendingRow[0]?.pending ?? 0)
    const orderCount   = Number(orderCountRow[0]?.cnt ?? 0)
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

    // Merge recent activity
    const recentActivity = [
      ...recentOrders.map(o => ({
        date:          o.createdAt.toISOString().slice(0, 10),
        time:          o.createdAt.toISOString(),
        type:          'IN' as const,
        description:   o.name,
        ref:           o.id.slice(-6).toUpperCase(),
        paymentMethod: o.paymentMethod as string,
        amount:        o.total,
      })),
      ...recentExpenses.map(e => ({
        date:          e.date.toISOString().slice(0, 10),
        time:          e.date.toISOString(),
        type:          'OUT' as const,
        description:   `${e.category}${e.description ? ` — ${e.description}` : ''}`,
        ref:           e.id.slice(-6).toUpperCase(),
        paymentMethod: '',
        amount:        e.amount,
      })),
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8)

    return Response.json({
      monthly,
      totalRevenue,  totalExpenses,  totalProfit,
      prevRevenue,   prevExpenses,   prevProfit,
      pendingRevenue, orderCount,    avgOrderValue,
      byCategory: byCat.map(c => ({ category: c.category, amount: Number(c._sum.amount ?? 0) })),
      recentActivity,
    })
  } catch (e) {
    console.error('[finance/summary]', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

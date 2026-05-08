import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const months = Number(searchParams.get('months') ?? 6)

  try {
    const from = new Date()
    from.setMonth(from.getMonth() - months)

    const [revenueRows, expenseRows, supplierRows] = await Promise.all([
      // Monthly revenue from paid orders
      prisma.$queryRaw<{ month: string; revenue: number }[]>`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
               COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${from}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `,
      // Monthly expenses
      prisma.$queryRaw<{ month: string; expenses: number }[]>`
        SELECT TO_CHAR(date, 'YYYY-MM') as month,
               COALESCE(SUM(amount), 0) as expenses
        FROM expenses
        WHERE date >= ${from}
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
      `,
      // Supplier payment summary
      prisma.supplier.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    // Merge into monthly P&L
    const monthMap: Record<string, { revenue: number; expenses: number }> = {}
    for (const r of revenueRows)  monthMap[r.month] = { ...(monthMap[r.month] ?? { expenses: 0 }), revenue: Number(r.revenue) }
    for (const e of expenseRows)  monthMap[e.month] = { ...(monthMap[e.month] ?? { revenue: 0 }), expenses: Number(e.expenses) }

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

    // Expense by category
    const byCat = await prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { date: { gte: from } },
      orderBy: { _sum: { amount: 'desc' } },
    })

    return Response.json({
      monthly, totalRevenue, totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      byCategory: byCat.map(c => ({ category: c.category, amount: c._sum.amount ?? 0 })),
      suppliers: supplierRows,
    })
  } catch (e) {
    console.error('[finance/summary]', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

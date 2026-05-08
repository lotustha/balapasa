import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const now = new Date()
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from')!)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()
  to.setHours(23, 59, 59, 999)

  try {
    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: { paymentStatus: 'PAID', createdAt: { gte: from, lte: to } },
        select: { id: true, name: true, total: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
    ])

    const raw = [
      ...orders.map(o => ({
        date: o.createdAt.toISOString().slice(0, 10),
        type: 'IN' as const,
        description: `Sales — ${o.name}`,
        ref: o.id.slice(-8).toUpperCase(),
        paymentMethod: o.paymentMethod as string,
        amount: o.total,
      })),
      ...expenses.map(e => ({
        date: e.date.toISOString().slice(0, 10),
        type: 'OUT' as const,
        description: `${e.category}${e.description ? ` — ${e.description}` : ''}${e.paidTo ? ` (${e.paidTo})` : ''}`,
        ref: e.id.slice(-8).toUpperCase(),
        paymentMethod: '',
        amount: e.amount,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'IN' ? -1 : 1))

    let balance = 0
    const entries = raw.map(r => {
      balance += r.type === 'IN' ? r.amount : -r.amount
      return { ...r, balance }
    })

    const totalIn  = orders.reduce((s, o) => s + o.total, 0)
    const totalOut = expenses.reduce((s, e) => s + e.amount, 0)

    return Response.json({
      from: from.toISOString().slice(0, 10),
      to:   to.toISOString().slice(0, 10),
      entries, totalIn, totalOut,
      closingBalance: totalIn - totalOut,
    })
  } catch (e) {
    console.error('[finance/cashbook]', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

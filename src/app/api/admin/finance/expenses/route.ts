import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Number(searchParams.get('limit') ?? 100)
  const from  = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to    = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined

  try {
    const expenses = await prisma.expense.findMany({
      where: { date: { ...(from && { gte: from }), ...(to && { lte: to }) } },
      orderBy: { date: 'desc' },
      take: limit,
    })
    const total = expenses.reduce((s, e) => s + e.amount, 0)
    return Response.json({ expenses, total })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, category, description, paidTo, supplierId, date } = body
    if (!amount || !category) return Response.json({ error: 'amount and category required' }, { status: 400 })
    const expense = await prisma.expense.create({
      data: {
        amount: Number(amount), category,
        description: description || null,
        paidTo: paidTo || null,
        supplierId: supplierId || null,
        date: date ? new Date(date) : new Date(),
      },
    })
    return Response.json({ expense }, { status: 201 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const body = await req.json()
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.amount      !== undefined && { amount: Number(body.amount) }),
        ...(body.category    !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.paidTo      !== undefined && { paidTo: body.paidTo || null }),
        ...(body.date        !== undefined && { date: new Date(body.date) }),
      },
    })
    return Response.json({ expense })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    await prisma.expense.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

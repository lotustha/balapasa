import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

async function recalcTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } })
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { deliveryCharge: true } })
  const total = subtotal + (order?.deliveryCharge ?? 0)
  await prisma.order.update({ where: { id: orderId }, data: { subtotal, total } })
  return { subtotal, total }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const { action, itemId, productId, name, price, quantity, image } = body

    if (action === 'remove') {
      await prisma.orderItem.delete({ where: { id: itemId } })
      const totals = await recalcTotals(id)
      return Response.json({ ok: true, ...totals })
    }

    if (action === 'update') {
      if (quantity <= 0) {
        await prisma.orderItem.delete({ where: { id: itemId } })
      } else {
        await prisma.orderItem.update({ where: { id: itemId }, data: { quantity } })
      }
      const totals = await recalcTotals(id)
      return Response.json({ ok: true, ...totals })
    }

    if (action === 'add') {
      if (!productId || !name || !price || !quantity) {
        return Response.json({ error: 'productId, name, price, quantity required' }, { status: 400 })
      }
      // If item for this product already exists, increment qty
      const existing = await prisma.orderItem.findFirst({ where: { orderId: id, productId } })
      if (existing) {
        await prisma.orderItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } })
      } else {
        await prisma.orderItem.create({ data: { orderId: id, productId, name, price, quantity, image: image ?? null } })
      }
      const totals = await recalcTotals(id)
      return Response.json({ ok: true, ...totals })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

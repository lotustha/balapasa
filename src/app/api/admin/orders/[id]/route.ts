import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const allowed = ['status','paymentStatus','notes','name','phone','email',
      'address','house','road','city','lat','lng','deliveryCharge',
      'shippingOption','pathaoOrderId','pathaoHash','trackingUrl']
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key] === '' ? null : body[key]
    }
    const order = await prisma.order.update({
      where: { id }, data,
      include: { items: true },
    })

    // Fire WA shipped notification when status → SHIPPED
    if (body.status === 'SHIPPED' && order.trackingUrl && order.phone) {
      import('@/lib/notifications').then(({ sendShippingNotification }) =>
        sendShippingNotification(order.id, order.phone, order.trackingUrl!).catch(() => {})
      ).catch(() => {})
    }

    return Response.json({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

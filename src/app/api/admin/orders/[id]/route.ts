import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pushOrderEvent } from '@/lib/push'

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

    // Push + WhatsApp on status changes
    if (body.status === 'SHIPPED') {
      if (order.trackingUrl && order.phone) {
        import('@/lib/notifications').then(({ sendShippingNotification }) =>
          sendShippingNotification(order.id, order.phone, order.trackingUrl!).catch(() => {})
        ).catch(() => {})
      }
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '🚚 Your order is on its way!',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} has been shipped via Pathao.${order.trackingUrl ? ' Tap to track.' : ''}`,
      }).catch(() => {})
    }

    if (body.status === 'DELIVERED') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '✅ Order Delivered!',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} was delivered. Enjoy your purchase!`,
      }).catch(() => {})
    }

    if (body.status === 'CANCELLED') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '❌ Order Cancelled',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled. Contact support if this was unexpected.`,
      }).catch(() => {})
    }

    if (body.paymentStatus === 'PAID' && order.paymentStatus === 'PAID') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '💳 Payment Confirmed',
        body:    `Rs. ${Math.round(order.total).toLocaleString('en-IN')} payment received for order #${order.id.slice(0, 8).toUpperCase()}.`,
      }).catch(() => {})
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

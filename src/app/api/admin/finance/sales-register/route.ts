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
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { select: { name: true, quantity: true, price: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({
      from: from.toISOString().slice(0, 10),
      to:   to.toISOString().slice(0, 10),
      orders: orders.map(o => ({
        id:            o.id.slice(-8).toUpperCase(),
        date:          o.createdAt.toISOString().slice(0, 10),
        customer:      o.name,
        phone:         o.phone,
        items:         o.items.map(i => `${i.name} ×${i.quantity}`).join(', '),
        itemCount:     o.items.reduce((s, i) => s + i.quantity, 0),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status:        o.status,
        subtotal:      o.subtotal,
        deliveryCharge: o.deliveryCharge,
        discount:      (o.couponDiscount ?? 0) + (o.autoDiscount ?? 0),
        total:         o.total,
        source:        o.source,
      })),
      totalRevenue: orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.total, 0),
      totalOrders:  orders.length,
    })
  } catch (e) {
    console.error('[finance/sales-register]', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

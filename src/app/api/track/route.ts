import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public tracking endpoint. Two query shapes:
//   ?code=<orderCode>            → single order detail (404 if not found)
//   ?phone=<digits>              → list of orders for that phone, grouped
//
// No external tracking URL is ever surfaced in the response — our own UI
// owns the experience end-to-end.

const PHONE_DIGITS = (s: string) => s.replace(/\D/g, '')

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')?.trim()
  const phone = searchParams.get('phone')?.trim()

  if (code) {
    const order = await findOrderByCode(code)
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
    return Response.json({ kind: 'single', order })
  }

  if (phone) {
    const digits = PHONE_DIGITS(phone)
    if (digits.length < 7) return Response.json({ error: 'Enter at least 7 digits of your phone number' }, { status: 400 })

    // Match the last-10 digits of the order phone against the last-10 of the
    // input; covers users who enter with/without country code.
    const last10 = digits.slice(-10)
    const orders = await prisma.order.findMany({
      where:   { phone: { contains: last10 } },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select: {
        id:            true,
        orderCode:     true,
        status:        true,
        paymentStatus: true,
        total:         true,
        createdAt:     true,
        shippingOption:true,
        items: {
          select: { name: true, image: true, quantity: true },
          take:   3,
        },
        _count: { select: { items: true } },
      },
    })
    return Response.json({
      kind:   'list',
      orders: orders.map(o => ({
        id:             o.id,
        orderCode:      o.orderCode,
        status:         o.status,
        paymentStatus:  o.paymentStatus,
        total:          o.total,
        createdAt:      o.createdAt.toISOString(),
        shippingOption: o.shippingOption,
        firstImage:     o.items[0]?.image ?? null,
        firstItem:      o.items[0]?.name  ?? null,
        itemCount:      o._count.items,
      })),
    })
  }

  return Response.json({ error: 'Provide ?code=<orderCode> or ?phone=<digits>' }, { status: 400 })
}

async function findOrderByCode(code: string) {
  // First try the human-readable code; fall back to a cuid prefix match so
  // legacy customers who only have the old "#abcd1234" can still look up.
  const upper = code.toUpperCase()
  const byCode = await prisma.order.findFirst({ where: { orderCode: upper } })
  const order  = byCode
    ?? await prisma.order.findFirst({ where: { id: { startsWith: code.toLowerCase() } } })
  if (!order) return null

  return projectOrderDetail(order.id)
}

export async function projectOrderDetail(orderId: string) {
  const [order, logs] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { name: true, image: true, quantity: true, price: true } },
      },
    }),
    prisma.orderStatusLog.findMany({
      where:   { orderId },
      orderBy: { createdAt: 'asc' },
      select:  {
        id: true, source: true, rawStatus: true, mappedStatus: true,
        comment: true, epodUrl: true, createdAt: true,
      },
    }),
  ])
  if (!order) return null

  // Mask the address: keep the locality + city but hide the unit/street so
  // anyone with the order code can't pinpoint the home.
  const maskedAddress = maskAddress(order.address, order.city)

  return {
    id:             order.id,
    orderCode:      order.orderCode,
    status:         order.status,
    paymentStatus:  order.paymentStatus,
    paymentMethod:  order.paymentMethod,
    total:          order.total,
    subtotal:       order.subtotal,
    deliveryCharge: order.deliveryCharge,
    shippingOption: order.shippingOption,
    shippingProvider: order.shippingProvider,
    createdAt:      order.createdAt.toISOString(),
    items: order.items.map(it => ({
      name:     it.name,
      image:    it.image,
      quantity: it.quantity,
      price:    it.price,
    })),
    address: maskedAddress,
    customerName: order.name,
    logs: logs.map(l => ({
      id:           l.id,
      source:       l.source,
      rawStatus:    l.rawStatus,
      mappedStatus: l.mappedStatus,
      comment:      l.comment,
      epodUrl:      l.epodUrl,
      createdAt:    l.createdAt.toISOString(),
    })),
  }
}

function maskAddress(addr: string | null, city: string): string {
  if (!addr) return city
  // Keep the last segment (typically city/district) + previous segment if it
  // looks like a locality. Strip everything before that so a leaked code
  // doesn't expose the door.
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  return `… ${parts.slice(-2).join(', ')}`
}

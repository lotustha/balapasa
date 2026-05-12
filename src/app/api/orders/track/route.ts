import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchCarrierStatus } from '@/lib/tracking'

export async function GET(req: NextRequest) {
  const id    = req.nextUrl.searchParams.get('id')?.trim()    ?? ''
  const phone = req.nextUrl.searchParams.get('phone')?.trim() ?? ''

  if (!id && !phone) return Response.json({ error: 'Order ID or phone required' }, { status: 400 })

  try {
    let order = null

    if (id) {
      order = await prisma.order.findFirst({
        where: phone
          ? {
              phone: { contains: digitsOnly(phone) },
              OR: [
                { id:            { contains: id, mode: 'insensitive' } },
                { pathaoOrderId: { contains: id, mode: 'insensitive' } },
              ],
            }
          : {
              OR: [
                { id:            { contains: id, mode: 'insensitive' } },
                { pathaoOrderId: { contains: id, mode: 'insensitive' } },
              ],
            },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Phone-only lookup → most recent order
      order = await prisma.order.findFirst({
        where:   { phone: { contains: digitsOnly(phone) } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

    const carrier = await fetchCarrierStatus(order.id, {
      shippingProvider:           (order as { shippingProvider?: string | null }).shippingProvider ?? null,
      pathaoHash:                 order.pathaoHash ?? null,
      pathaoOrderId:              order.pathaoOrderId ?? null,
      trackingUrl:                order.trackingUrl ?? null,
      internalStatus:             order.status,
      shippingProviderTrackingId: order.pathaoOrderId ?? null,
    })

    return Response.json({ order, carrier })
  } catch (e) {
    console.error('[track] DB error:', e)
    return Response.json({ error: 'DB unavailable' }, { status: 503 })
  }
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

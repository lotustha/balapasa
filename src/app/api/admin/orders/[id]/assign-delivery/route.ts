import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { estimateDelivery, createParcel } from '@/lib/pathao'
import { calculatePndRates, createPndOrder } from '@/lib/pickndrop'
import { getPicknDropConfig, getPathaoConfig } from '@/lib/logistics-config'

type Ctx = { params: Promise<{ id: string }> }

// Pathao operates in Bangladesh — always use configured receiver defaults (Dhaka area)
const PATHAO_RX_LAT = parseFloat(process.env.PATHAO_RECEIVER_DEFAULT_LAT ?? '23.73547839871336')
const PATHAO_RX_LNG = parseFloat(process.env.PATHAO_RECEIVER_DEFAULT_LNG ?? '90.38390121513216')

// PnD zones use district names, but order.city stores the municipality.
// Map municipality → district so calculatePndRates gets the right zone.
const KTM_MUNICIPALITIES = new Set([
  'kathmandu','kirtipur','nagarjun','tokha','budhanilkantha','tarakeshwor',
  'shankharapur','gokarneshwor','kageshworimanohara','chandragiri','dakshinkali',
])
const LALITPUR_MUNICIPALITIES = new Set([
  'lalitpur','godawari','mahalaxmi','bagmati',
])
const BHAKTAPUR_MUNICIPALITIES = new Set([
  'bhaktapur','madhyapurthimi','suryabinayak','changunarayan',
])

function cityToDistrict(city: string): string {
  const key = city.toLowerCase().replace(/[\s-_]/g, '')
  if (KTM_MUNICIPALITIES.has(key))      return 'Kathmandu'
  if (LALITPUR_MUNICIPALITIES.has(key)) return 'Lalitpur'
  if (BHAKTAPUR_MUNICIPALITIES.has(key))return 'Bhaktapur'
  // For other cities, capitalise and return as-is (matches PND_ZONES keys)
  return city.charAt(0).toUpperCase() + city.slice(1)
}

// GET — estimate from all active providers
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const provider = req.nextUrl.searchParams.get('provider') ?? 'PATHAO'
  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

    if (provider === 'PICKNDROP') {
      const cfg = await getPicknDropConfig()
      if (!cfg.isActive) return Response.json({ error: 'Pick & Drop is disabled' }, { status: 400 })
      const toDistrict = cityToDistrict(order.city)
      const options = calculatePndRates('Kathmandu', toDistrict)
      return Response.json({ provider: 'PICKNDROP', options })
    }

    // Pathao: use Dhaka receiver coordinates (Pathao only services Bangladesh)
    const estimate = await estimateDelivery({
      receiverLat:     PATHAO_RX_LAT,
      receiverLng:     PATHAO_RX_LNG,
      receiverAddress: `${order.address}, ${order.city}`,
      totalValue:      order.total,
      isCodActive:     order.paymentMethod === 'COD',
    })
    return Response.json(estimate)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

// POST — assign delivery (Pathao parcel or manual tracking)
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const { type, sid, serviceOptionId, trackingNumber, trackingUrl, deliveryCharge, notes } = body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

    if (type === 'PATHAO') {
      const parcel = await createParcel({
        sid, serviceOptionId,
        receiverName:    order.name,
        receiverPhone:   order.phone,
        receiverAddress: `${order.address}, ${order.city}`,
        receiverHouse:   order.house   ?? undefined,
        receiverRoad:    order.road    ?? undefined,
        receiverLat:     PATHAO_RX_LAT,
        receiverLng:     PATHAO_RX_LNG,
        totalValue:      order.total,
        externalRefId:   order.id,
        isCod:           order.paymentMethod === 'COD',
      })

      // Pathao response: data.order_id (display), data.hashed_id (cancel ref), data.tracking_url
      const d = parcel.data ?? {}
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:         'CONFIRMED',
          pathaoOrderId:  String(d.order_id  ?? ''),          // display tracking ID e.g. "4LHV8CX"
          pathaoHash:     String(d.hashed_id ?? ''),           // for cancellation
          trackingUrl:    d.tracking_url ?? null,
          deliveryCharge: deliveryCharge ?? d.charge ?? 0,
          shippingOption: `Pathao`,
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() }, pathao: d })
    }

    if (type === 'PICKNDROP') {
      const { fromBranch, toBranch, serviceType } = body
      const cfg = await getPicknDropConfig()
      const result = await createPndOrder({
        customerName:    order.name,
        senderName:      'Balapasa Store',
        senderPhone:     process.env.PATHAO_PICKUP_PHONE ?? '9800000000',
        receiverName:    order.name,
        receiverPhone:   order.phone,
        receiverAddress: `${order.address}, ${order.city}`,
        fromBranch:      fromBranch ?? 'KATHMANDU',
        toBranch:        toBranch   ?? order.city.toUpperCase(),
        itemValue:       order.total,
        codAmount:       order.paymentMethod === 'COD' ? order.total : 0,
        serviceType:     serviceType ?? 'STANDARD',
        orderId:         order.id,
      })

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:         'CONFIRMED',
          pathaoOrderId:  result.trackingId,                   // PnD tracking number
          pathaoHash:     result.trackingId,                   // reuse for lookup
          trackingUrl:    result.trackingUrl,
          deliveryCharge: deliveryCharge ?? result.charge ?? 0,
          shippingOption: `Pick & Drop — ${serviceType ?? 'STANDARD'}`,
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() }, pnd: result })
    }

    if (type === 'MANUAL') {
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:         'CONFIRMED',
          pathaoOrderId:  trackingNumber ?? null,
          pathaoHash:     trackingNumber ?? null,
          trackingUrl:    trackingUrl    ?? null,
          deliveryCharge: deliveryCharge ?? 0,
          shippingOption: notes?.split(':')[0] ?? 'Manual delivery',
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } })
    }

    return Response.json({ error: 'Invalid type. Use PATHAO or MANUAL' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

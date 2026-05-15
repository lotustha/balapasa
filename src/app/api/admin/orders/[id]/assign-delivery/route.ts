import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { estimateDelivery, createParcel } from '@/lib/pathao'
import { calculatePndRates, createPndOrder, resolveBranchForArea } from '@/lib/pickndrop'
import { getPicknDropConfig } from '@/lib/logistics-config'

type Ctx = { params: Promise<{ id: string }> }

// Pathao Nepal — Kathmandu receiver default coordinates used for estimates
// and parcel creation when the customer hasn't supplied coords. Kept as code
// constants (operational defaults, not credentials).
const PATHAO_RX_LAT = 27.7172
const PATHAO_RX_LNG = 85.3240

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
      const options = await calculatePndRates('Kathmandu', toDistrict)
      return Response.json({ provider: 'PICKNDROP', options })
    }

    // Pathao Nepal: use Kathmandu receiver coordinates as default fallback.
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
      const { destinationBranch, instruction, weightKg, lengthCm, widthCm, heightCm } = body
      // Resolve destination branch from order.city if admin didn't override.
      const resolved = destinationBranch ?? (await resolveBranchForArea(order.city))?.branch_name ?? cityToDistrict(order.city)

      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } })
      const itemSummary = orderItems.map(i => `${i.quantity}× ${i.name}`).join(', ')

      // Aggregate package dimensions from item products: total weight, longest
      // L/W/H across items. Admin body overrides win when provided.
      const productIds = orderItems.map(i => i.productId).filter((x): x is string => !!x)
      const products = productIds.length
        ? await prisma.product.findMany({
            where:  { id: { in: productIds } },
            select: { id: true, weight: true, length: true, width: true, height: true },
          })
        : []
      const pById = new Map(products.map(p => [p.id, p]))

      let totalWeightKg = 0, maxLen = 0, maxWid = 0, maxHgt = 0
      for (const it of orderItems) {
        const p = it.productId ? pById.get(it.productId) : null
        if (p?.weight) totalWeightKg += p.weight * it.quantity
        if (p?.length) maxLen = Math.max(maxLen, p.length)
        if (p?.width)  maxWid = Math.max(maxWid, p.width)
        if (p?.height) maxHgt = Math.max(maxHgt, p.height)
      }

      const result = await createPndOrder({
        customerName:        order.name,
        primaryMobileNo:     order.phone.replace(/\D/g, '').slice(-10),
        destinationBranch:   resolved,
        destinationCityArea: order.city,
        landmark:            [order.house, order.road, order.address].filter(Boolean).join(', ').slice(0, 200),
        codAmount:           order.paymentMethod === 'COD' ? order.total : 0,
        orderDescription:    itemSummary || `Order ${order.id}`,
        weightKg:            weightKg ?? (totalWeightKg > 0 ? totalWeightKg : 1),
        dimWeight: (lengthCm || widthCm || heightCm || maxLen || maxWid || maxHgt)
          ? {
              lengthCm: lengthCm ?? (maxLen || 1),
              widthCm:  widthCm  ?? (maxWid || 1),
              heightCm: heightCm ?? (maxHgt || 1),
            }
          : undefined,
        instruction:         instruction,
        customerLatitude:    order.lat ?? undefined,
        customerLongitude:   order.lng ?? undefined,
        vendorTrackingNumber: order.id,
      })

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:           'CONFIRMED',
          shippingProvider: 'PICKNDROP',
          pathaoOrderId:    result.trackingId,                 // PnD orderID
          pathaoHash:       result.trackingId,                 // reuse for lookup
          trackingUrl:      result.trackingUrl,
          deliveryCharge:   deliveryCharge ?? result.charge ?? 0,
          shippingOption:   `Pick & Drop — ${resolved}`,
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

    return Response.json({ error: 'Invalid type. Use PATHAO, PICKNDROP, or MANUAL' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { estimateDelivery, createParcel } from '@/lib/pathao'
import { calculatePndRates, createPndOrder, cancelPndOrder, resolveBranchForAddress, addressAtoms, cityToDistrict } from '@/lib/pickndrop'
import { getPicknDropConfig } from '@/lib/logistics-config'
import { aggregateOrderPackage } from '@/lib/order-package'
import { notifyDeliveryDispatched } from '@/lib/notify-delivery-dispatched'
import { computeOrderTotal } from '@/lib/order-total'

type Ctx = { params: Promise<{ id: string }> }

// Pathao Nepal — Kathmandu receiver default coordinates used for estimates
// and parcel creation when the customer hasn't supplied coords. Kept as code
// constants (operational defaults, not credentials).
const PATHAO_RX_LAT = 27.7172
const PATHAO_RX_LNG = 85.3240


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
      // Branch resolution mirrors checkout: multi-atom match over the full
      // address (not just cityToDistrict), so the admin sees the SAME branch the
      // customer's quote used. `branch` query param locks an explicit branch
      // (admin override); `fresh=1` bypasses the 1h rate cache.
      const branchOverride = req.nextUrl.searchParams.get('branch')?.trim() || undefined
      const fresh          = req.nextUrl.searchParams.get('fresh') === '1'
      const options = await calculatePndRates('Kathmandu', cityToDistrict(order.city), {
        destinationAtoms:          addressAtoms(order.address, order.city),
        destinationBranchOverride: branchOverride,
        force:                     fresh,
      })
      return Response.json({ provider: 'PICKNDROP', options, pickupBranch: cfg.pickupBranch })
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
      const pathaoCharge = deliveryCharge ?? d.charge ?? 0
      const pathaoTotal  = await computeOrderTotal(order, pathaoCharge)
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:         'CONFIRMED',
          pathaoOrderId:  String(d.order_id  ?? ''),          // display tracking ID e.g. "4LHV8CX"
          pathaoHash:     String(d.hashed_id ?? ''),           // for cancellation
          trackingUrl:    d.tracking_url ?? null,
          deliveryCharge: pathaoCharge,
          total:          pathaoTotal,
          shippingOption: `Pathao`,
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      notifyDeliveryDispatched({
        orderId:        updated.id,
        courierName:    'Pathao',
        trackingNumber: updated.pathaoOrderId,
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() }, pathao: d })
    }

    if (type === 'PICKNDROP') {
      const { destinationBranch, instruction, weightKg, lengthCm, widthCm, heightCm } = body

      // Re-assign hygiene: if this order already has a PnD order, cancel it on
      // PnD's side before creating a new one — otherwise each re-assign leaves a
      // live duplicate on their dashboard. Best-effort; never blocks the new one.
      const existingPndId = order.pndOrderId || order.pathaoOrderId
      if ((order.shippingProvider === 'PICKNDROP' || order.shippingOption?.toLowerCase().includes('pick')) && existingPndId) {
        try { await cancelPndOrder(existingPndId) } catch (e) { console.warn('[assign-delivery] prior PnD cancel failed (non-fatal):', String(e)) }
      }
      // Resolve destination branch when admin didn't override: multi-atom match
      // over the full address (same matcher checkout uses), falling back to the
      // municipality→district map only as a last resort.
      const resolved = destinationBranch
        ?? (await resolveBranchForAddress(addressAtoms(order.address, order.city))).branch?.branch_name
        ?? cityToDistrict(order.city)

      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } })
      const itemSummary = orderItems.map(i => `${i.quantity}× ${i.name}`).join(', ')

      // Aggregate package dimensions from item products. Admin body overrides
      // win when provided.
      const pkg = await aggregateOrderPackage(order.id)
      const { weightKg: totalWeightKg, lengthCm: maxLen, widthCm: maxWid, heightCm: maxHgt } = pkg

      // New delivery charge for this (re)assignment. The admin UI sends the
      // selected estimate; if it's omitted, keep whatever was already on the
      // order so a re-assign never silently zeroes the agreed price.
      const newCharge = typeof deliveryCharge === 'number' ? deliveryCharge : order.deliveryCharge
      // Recompute total authoritatively (subtotal − discounts + charge) so it
      // can't drift across cancel/re-assign cycles.
      const newTotal = await computeOrderTotal(order, newCharge)

      // Unique vendor reference per dispatch attempt. PnD treats
      // vendorTrackingNumber as a reference and can reject/duplicate a repeated
      // one. pndAttempts increments on every dispatch (checkout + each
      // re-assign): attempt 0 = bare id, attempt 1 = "<id>-1", etc.
      const attempt   = order.pndAttempts ?? 0
      const vendorRef = attempt > 0 ? `${order.id}-${attempt}` : order.id

      const result = await createPndOrder({
        customerName:        order.name,
        primaryMobileNo:     order.phone.replace(/\D/g, '').slice(-10),
        destinationBranch:   resolved,
        destinationCityArea: order.city,
        landmark:            [order.house, order.road, order.address].filter(Boolean).join(', ').slice(0, 200),
        codAmount:           order.paymentMethod === 'COD' ? newTotal : 0,
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
        vendorTrackingNumber: vendorRef,
        expressDelivery:     order.expressDelivery,   // paid same-day → express_delivery:"1"
      })

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:           'CONFIRMED',
          shippingProvider: 'PICKNDROP',
          pathaoOrderId:    result.trackingId,                 // PnD orderID
          pndOrderId:       result.trackingId,                 // keep both carrier id columns aligned
          pathaoHash:       result.trackingId,                 // reuse for lookup
          trackingUrl:      result.trackingUrl,
          deliveryCharge:   newCharge,
          total:            newTotal,
          pndAttempts:      attempt + 1,
          shippingOption:   `Pick & Drop — ${resolved}`,
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      notifyDeliveryDispatched({
        orderId:        updated.id,
        courierName:    'Pick & Drop',
        trackingNumber: result.trackingId,
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() }, pnd: result })
    }

    if (type === 'MANUAL') {
      const manualCharge = deliveryCharge ?? 0
      const manualTotal  = await computeOrderTotal(order, manualCharge)
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status:         'CONFIRMED',
          pathaoOrderId:  trackingNumber ?? null,
          pathaoHash:     trackingNumber ?? null,
          trackingUrl:    trackingUrl    ?? null,
          deliveryCharge: manualCharge,
          total:          manualTotal,
          shippingOption: notes?.split(':')[0] ?? 'Manual delivery',
          notes: notes ? `${order.notes ?? ''}\n[Delivery] ${notes}`.trim() : order.notes,
        },
        include: { items: true },
      })
      notifyDeliveryDispatched({
        orderId:        updated.id,
        courierName:    updated.shippingOption ?? 'Manual courier',
        trackingNumber: trackingNumber ?? null,
      })
      return Response.json({ ok: true, order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } })
    }

    return Response.json({ error: 'Invalid type. Use PATHAO, PICKNDROP, or MANUAL' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

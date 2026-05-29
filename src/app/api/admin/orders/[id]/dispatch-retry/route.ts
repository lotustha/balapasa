import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createPndOrder, resolveBranchForAddress, addressAtoms, cityToDistrict } from '@/lib/pickndrop'
import { notifyDeliveryDispatched } from '@/lib/notify-delivery-dispatched'

// Admin-only: re-runs the Pick & Drop create_order call for an order whose
// initial dispatch failed (sentinel "PND_DISPATCH_FAILED:" is written into
// Order.notes by /api/orders POST when the first attempt fails).
//
// On success: persists pndOrderId + trackingUrl, clears the sentinel from
// notes, fires the delivery-dispatched email.
// On failure: returns the new error to the admin UI and leaves the order
// untouched so they can fix the underlying issue and retry again.

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  // Optional manual override: admin can POST { destinationBranch: "Kalanki" }
  // when auto-resolution can't pin a branch from the address.
  const body = (await req.json().catch(() => ({}))) as { destinationBranch?: string }
  const explicitBranch = (body.destinationBranch ?? '').trim()

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { name: true, quantity: true } } },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  if (order.shippingProvider !== 'PICKNDROP') {
    return Response.json({ error: 'Order is not assigned to Pick & Drop' }, { status: 400 })
  }
  if (order.pndOrderId) {
    return Response.json({ error: 'Order already has a Pick & Drop tracking ID — nothing to retry' }, { status: 400 })
  }

  try {
    let resolved = explicitBranch
    if (!resolved) {
      // Multi-atom match over the full flattened address (structured atoms
      // aren't persisted on the Order row, so tokenise Order.address + city).
      const match = await resolveBranchForAddress(addressAtoms(order.address, order.city))
      resolved = match.branch?.branch_name ?? cityToDistrict(order.city ?? '')
      if (!resolved) {
        return Response.json({
          error: 'Could not resolve a destination branch from the address. Pick one of the suggested branches and retry.',
          candidates: match.candidates.map(b => b.branch_name),
        }, { status: 400 })
      }
    }

    const itemNames = order.items.map(i => `${i.quantity}× ${i.name}`).join(', ').slice(0, 120) || `Order ${order.id.slice(0, 8)}`
    const isCod = order.paymentMethod === 'COD' || order.paymentMethod === 'PARTIAL_COD'
    const codAmount = isCod
      ? Math.max(0, order.total - (order.advancePaid ?? 0))
      : 0

    const result = await createPndOrder({
      customerName:        order.name,
      primaryMobileNo:     String(order.phone ?? '').replace(/\D/g, '').slice(-10),
      destinationBranch:   resolved,
      destinationCityArea: order.city ?? '',
      codAmount,
      orderDescription:    itemNames,
      customerLatitude:    order.lat ?? undefined,
      customerLongitude:   order.lng ?? undefined,
      vendorTrackingNumber: order.id,
      orderType:           'Regular',
    })

    // Clear the failure sentinel from notes — keep any other admin notes intact.
    const cleanedNotes = (order.notes ?? '')
      .split('\n')
      .filter(line => !line.startsWith('PND_DISPATCH_FAILED:'))
      .join('\n')
      .trim() || null

    await prisma.order.update({
      where: { id: order.id },
      data: {
        pndOrderId:  result.trackingId,
        trackingUrl: result.trackingUrl,
        notes:       cleanedNotes,
      },
    })

    notifyDeliveryDispatched({
      orderId:        order.id,
      courierName:    'Pick & Drop',
      trackingNumber: result.trackingId,
    })

    return Response.json({
      ok:             true,
      trackingId:     result.trackingId,
      trackingUrl:    result.trackingUrl,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[orders dispatch-retry] still failing:', msg)
    return Response.json({ error: msg }, { status: 502 })
  }
}

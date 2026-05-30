import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelParcel } from '@/lib/pathao'
import { cancelPndOrder } from '@/lib/pickndrop'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

    const errors: string[] = []

    // If Pathao parcel — cancel via Pathao API using the hashed_id
    const isPathao = order.shippingOption?.toLowerCase().includes('pathao') ||
                     order.shippingProvider === 'PATHAO'
    if (isPathao && order.pathaoHash) {
      try {
        await cancelParcel(order.pathaoHash)
      } catch (e) {
        // Log but don't block DB cleanup — parcel may already be cancelled or expired
        errors.push(`Pathao cancel: ${String(e)}`)
      }
    }

    // If Pick & Drop — cancel on PnD's side too, otherwise the order stays live
    // on their dashboard and re-assigning piles up duplicates. Use the PnD
    // orderID (pndOrderId; pathaoOrderId holds the same value for PnD).
    const isPnd = order.shippingProvider === 'PICKNDROP' ||
                  order.shippingOption?.toLowerCase().includes('pick')
    const pndId = order.pndOrderId || order.pathaoOrderId
    if (isPnd && pndId) {
      try {
        await cancelPndOrder(pndId)
      } catch (e) {
        // Non-fatal: still clear local state. The warning surfaces in the UI so
        // the admin knows to cancel manually on the PnD dashboard if needed.
        errors.push(`Pick & Drop cancel: ${String(e)}`)
      }
    }

    // Clear delivery fields from the order, revert status to PENDING
    const updated = await prisma.order.update({
      where: { id },
      data: {
        pathaoOrderId:  null,
        pndOrderId:     null,
        pathaoHash:     null,
        trackingUrl:    null,
        deliveryCharge: 0,
        // Pull the (now-removed) delivery charge back out of total so a later
        // re-assign starts from a clean subtotal-only figure. Without this the
        // old charge stays baked into total and the next assignment double-adds.
        total:          order.total - order.deliveryCharge,
        shippingOption: null,
        status:         'PENDING',
        notes: order.notes
          ? `${order.notes}\n[Delivery cancelled]`.trim()
          : '[Delivery cancelled]',
      },
      include: { items: true },
    })

    return Response.json({
      ok: true,
      order: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
      warnings: errors.length ? errors : undefined,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

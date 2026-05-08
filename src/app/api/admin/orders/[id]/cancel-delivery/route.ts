import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelParcel } from '@/lib/pathao'

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

    // Clear delivery fields from the order, revert status to PENDING
    const updated = await prisma.order.update({
      where: { id },
      data: {
        pathaoOrderId:  null,
        pathaoHash:     null,
        trackingUrl:    null,
        deliveryCharge: 0,
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

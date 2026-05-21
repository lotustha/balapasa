import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { restoreStockForOrder } from '@/lib/restore-stock'
import { notifyOrderCancelled } from '@/lib/notify-order-cancelled'

// Customer-initiated pre-shipped cancellation. Allowed only while the order
// hasn't left the store (PENDING / CONFIRMED / PROCESSING). For wallet-paid
// orders we move paymentStatus to REFUNDED and tag the order with the
// REFUND_PENDING_ADMIN sentinel so an admin picks up the manual payback in
// the returns queue.

const EDITABLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await ctx.params

  const order = await prisma.order.findUnique({
    where:  { id },
    select: { id: true, userId: true, status: true, paymentStatus: true, paymentMethod: true, notes: true },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.userId !== user.sub) return Response.json({ error: 'Not your order' }, { status: 403 })
  if (!EDITABLE_STATUSES.has(order.status)) {
    return Response.json(
      { error: `Sorry — this order is already ${order.status.toLowerCase()} and can't be cancelled here. Reach out to support if you need help.` },
      { status: 409 },
    )
  }

  let body: { reason?: string }
  try { body = await req.json() } catch { body = {} }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''

  // Wallet-paid orders flip to REFUNDED + drop a sentinel so admin sees there's
  // a manual refund owed. COD untouched (nothing was paid).
  const flipToRefunded = order.paymentStatus === 'PAID' &&
    (order.paymentMethod === 'ESEWA' || order.paymentMethod === 'KHALTI')

  const notesAfter = flipToRefunded
    ? `${order.notes ?? ''}\nREFUND_PENDING_ADMIN: customer cancelled before shipment`.trim()
    : order.notes

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        ...(flipToRefunded ? { paymentStatus: 'REFUNDED' } : {}),
        notes: notesAfter,
      },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId:     order.id,
        source:      'SYSTEM',
        rawStatus:   'cancelled_by_customer',
        mappedStatus:'CANCELLED',
        comment:     reason || null,
      },
    }),
  ])

  // Stock restore + email run after the tx (best-effort).
  restoreStockForOrder(order.id, 'SYSTEM').catch(e =>
    console.warn('[orders cancel] stock restore failed (non-fatal):', e),
  )
  notifyOrderCancelled(order.id)

  return Response.json({ ok: true, refundPending: flipToRefunded })
}

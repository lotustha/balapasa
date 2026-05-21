import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isOrderReturnable } from '@/lib/return-eligibility'
import { notifyReturnState, notifyReturnRequestedToAdmin } from '@/lib/notify-return-state'

const VALID_REASONS = new Set(['DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER'])
const TERMINAL_STATUSES = new Set(['REJECTED', 'REFUNDED', 'CANCELLED_BY_CUSTOMER'])

// GET — returns the customer's existing ReturnRequest for this order (or null).
// Used by the return form to detect an in-flight request.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await ctx.params
  const order = await prisma.order.findUnique({
    where:  { id },
    select: { id: true, userId: true },
  })
  if (!order || order.userId !== user.sub) return Response.json({ error: 'Order not found' }, { status: 404 })

  const existing = await prisma.returnRequest.findFirst({
    where:   { orderId: id },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })
  return Response.json({ existing })
}

// POST — file a new return.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await ctx.params

  const order = await prisma.order.findUnique({
    where:   { id },
    select:  { id: true, userId: true, status: true, items: { select: { id: true, productId: true, name: true, quantity: true, price: true } } },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.userId !== user.sub) return Response.json({ error: 'Not your order' }, { status: 403 })

  const eligibility = await isOrderReturnable(order.id)
  if (!eligibility.ok) return Response.json({ error: eligibility.reason }, { status: 409 })

  // Reject if a non-terminal request already exists.
  const open = await prisma.returnRequest.findFirst({
    where:  { orderId: order.id, status: { notIn: Array.from(TERMINAL_STATUSES) as never[] } },
    select: { id: true, status: true },
  })
  if (open) {
    return Response.json({ error: `A return request for this order is already ${open.status.toLowerCase().replace(/_/g, ' ')}.` }, { status: 409 })
  }

  let body: { items?: Array<{ orderItemId: string; quantity: number }>; reason?: string; customerNote?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const reason = typeof body.reason === 'string' ? body.reason.toUpperCase() : ''
  if (!VALID_REASONS.has(reason)) return Response.json({ error: 'Pick a return reason.' }, { status: 400 })

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: 'Pick at least one item to return.' }, { status: 400 })
  }

  // Validate each requested line — must belong to this order and the requested
  // quantity can't exceed what was originally bought.
  const itemMap = new Map(order.items.map(i => [i.id, i]))
  const lines: Array<{ orderItemId: string; quantity: number; lineRefundAmount: number }> = []
  let refundAmount = 0
  for (const raw of body.items) {
    if (typeof raw?.orderItemId !== 'string' || typeof raw?.quantity !== 'number') {
      return Response.json({ error: 'Bad item payload.' }, { status: 400 })
    }
    const oi = itemMap.get(raw.orderItemId)
    if (!oi) return Response.json({ error: 'One of the items isn\'t part of this order.' }, { status: 400 })
    const qty = Math.floor(raw.quantity)
    if (qty <= 0 || qty > oi.quantity) {
      return Response.json({ error: `Invalid quantity for "${oi.name}".` }, { status: 400 })
    }
    const lineRefundAmount = Math.round(oi.price * qty)
    refundAmount += lineRefundAmount
    lines.push({ orderItemId: oi.id, quantity: qty, lineRefundAmount })
  }

  const created = await prisma.$transaction(async tx => {
    const rr = await tx.returnRequest.create({
      data: {
        orderId:      order.id,
        userId:       user.sub,
        status:       'REQUESTED',
        reason:       reason as 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'CHANGED_MIND' | 'OTHER',
        customerNote: typeof body.customerNote === 'string' && body.customerNote.trim() ? body.customerNote.trim().slice(0, 1000) : null,
        refundAmount,
        items: {
          create: lines,
        },
      },
    })
    await tx.orderStatusLog.create({
      data: {
        orderId:   order.id,
        source:    'SYSTEM',
        rawStatus: 'return_filed',
        comment:   `Customer filed return for ${lines.reduce((s, l) => s + l.quantity, 0)} item(s) — reason: ${reason}`,
      },
    })
    return rr
  })

  notifyReturnState(created.id, 'FILED')
  notifyReturnRequestedToAdmin(created.id)

  return Response.json({ ok: true, id: created.id })
}

// DELETE — customer withdraws an as-yet-unapproved return.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await ctx.params
  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true } })
  if (!order || order.userId !== user.sub) return Response.json({ error: 'Order not found' }, { status: 404 })

  const open = await prisma.returnRequest.findFirst({
    where:   { orderId: id, status: 'REQUESTED' },
    orderBy: { createdAt: 'desc' },
    select:  { id: true },
  })
  if (!open) return Response.json({ error: 'No pending return to cancel.' }, { status: 404 })

  await prisma.$transaction([
    prisma.returnRequest.update({
      where: { id: open.id },
      data:  { status: 'CANCELLED_BY_CUSTOMER' },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId:   id,
        source:    'SYSTEM',
        rawStatus: 'return_cancelled_by_customer',
      },
    }),
  ])
  return Response.json({ ok: true })
}

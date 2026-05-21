import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { restoreStockForReturn } from '@/lib/restore-stock'
import { notifyReturnState } from '@/lib/notify-return-state'

// Allowed FSM transitions for admin. Skipping states (REQUESTED → REFUNDED)
// is rejected so the inventory + refund side-effects fire in the right order.
const TRANSITIONS: Record<string, Set<string>> = {
  REQUESTED: new Set(['APPROVED', 'REJECTED']),
  APPROVED:  new Set(['RECEIVED']),
  RECEIVED:  new Set(['REFUNDED']),
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const rr = await prisma.returnRequest.findUnique({
    where:   { id },
    include: { items: true },
  })
  if (!rr) return Response.json({ error: 'Not found' }, { status: 404 })

  // Hydrate order + items so the admin detail page has everything in one fetch.
  const order = await prisma.order.findUnique({
    where:  { id: rr.orderId },
    include: { items: { select: { id: true, name: true, image: true, quantity: true, price: true } } },
  })

  return Response.json({
    ...rr,
    createdAt:  rr.createdAt.toISOString(),
    updatedAt:  rr.updatedAt.toISOString(),
    refundedAt: rr.refundedAt?.toISOString() ?? null,
    approvedAt: rr.approvedAt?.toISOString() ?? null,
    receivedAt: rr.receivedAt?.toISOString() ?? null,
    rejectedAt: rr.rejectedAt?.toISOString() ?? null,
    order:      order ? { ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() } : null,
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as { status?: string; adminNote?: string }
  const target = body.status?.toUpperCase()
  if (!target) return Response.json({ error: 'Missing status' }, { status: 400 })

  const rr = await prisma.returnRequest.findUnique({ where: { id } })
  if (!rr) return Response.json({ error: 'Not found' }, { status: 404 })

  const allowed = TRANSITIONS[rr.status]
  if (!allowed || !allowed.has(target)) {
    return Response.json({ error: `Can't transition from ${rr.status} to ${target}.` }, { status: 400 })
  }

  const now = new Date()
  const data: Record<string, unknown> = { status: target }
  if (typeof body.adminNote === 'string' && body.adminNote.trim()) data.adminNote = body.adminNote.trim().slice(0, 2000)

  if (target === 'APPROVED') data.approvedAt = now
  if (target === 'REJECTED') data.rejectedAt = now
  if (target === 'RECEIVED') data.receivedAt = now
  if (target === 'REFUNDED') data.refundedAt = now

  // Refund needs to also flip the parent Order.paymentStatus.
  const updated = await prisma.$transaction(async tx => {
    const u = await tx.returnRequest.update({ where: { id: rr.id }, data })
    if (target === 'REFUNDED') {
      await tx.order.update({
        where: { id: rr.orderId },
        data:  { paymentStatus: 'REFUNDED' },
      })
    }
    await tx.orderStatusLog.create({
      data: {
        orderId:   rr.orderId,
        source:    'ADMIN',
        rawStatus: `return_${target.toLowerCase()}`,
        comment:   typeof body.adminNote === 'string' && body.adminNote.trim() ? body.adminNote.trim() : null,
      },
    })
    return u
  })

  // Post-tx side effects.
  if (target === 'RECEIVED') {
    restoreStockForReturn(rr.id).catch(e => console.warn('[admin returns] stock restore failed:', e))
  }
  if (target === 'APPROVED') notifyReturnState(rr.id, 'APPROVED')
  if (target === 'REJECTED') notifyReturnState(rr.id, 'REJECTED')
  if (target === 'REFUNDED') notifyReturnState(rr.id, 'REFUNDED')

  return Response.json({ ok: true, status: updated.status })
}

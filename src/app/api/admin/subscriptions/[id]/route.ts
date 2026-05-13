import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import type { SubscriptionStatus } from '@prisma/client'

const ALLOWED: SubscriptionStatus[] = ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED', 'TRIALING']

/**
 * PATCH supports:
 *   { action: 'cancel' }                  -> CANCELLED, cancelledAt = now
 *   { action: 'cancel_at_period_end' }    -> cancelAtPeriodEnd = true (stays ACTIVE)
 *   { action: 'pause' }                   -> PAUSED
 *   { action: 'resume' }                  -> ACTIVE
 *   { status: '<one of ALLOWED>' }        -> raw set (admin override)
 *   { notes: '...' }                      -> update notes
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const body = await req.json() as Partial<{
      action: 'cancel' | 'cancel_at_period_end' | 'pause' | 'resume'
      status: SubscriptionStatus
      notes:  string
    }>

    const data: Record<string, unknown> = {}

    switch (body.action) {
      case 'cancel':
        data.status = 'CANCELLED'
        data.cancelledAt = new Date()
        data.cancelAtPeriodEnd = false
        break
      case 'cancel_at_period_end':
        data.cancelAtPeriodEnd = true
        break
      case 'pause':
        data.status = 'PAUSED'
        break
      case 'resume':
        data.status = 'ACTIVE'
        data.cancelAtPeriodEnd = false
        data.cancelledAt = null
        break
    }
    if (body.status && ALLOWED.includes(body.status)) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null

    if (Object.keys(data).length === 0) {
      return Response.json({ error: 'no updatable fields' }, { status: 400 })
    }

    const sub = await prisma.subscription.update({ where: { id }, data })
    return Response.json({ subscription: sub })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const invoices = await prisma.invoice.count({ where: { subscriptionId: id } })
    if (invoices > 0) {
      return Response.json(
        { error: 'Cannot delete a subscription with invoices. Cancel it instead.' },
        { status: 409 },
      )
    }
    await prisma.subscription.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

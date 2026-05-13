import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import type { PlanInterval } from '@prisma/client'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const body = await req.json() as Partial<{
      name: string; description: string | null; amount: number
      interval: PlanInterval; intervalCount: number; trialDays: number
      isActive: boolean
    }>

    const data: Record<string, unknown> = {}
    if (body.name !== undefined)        data.name = String(body.name).trim()
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
    if (body.amount !== undefined)      data.amount = Number(body.amount)
    if (body.interval !== undefined)    data.interval = body.interval
    if (body.intervalCount !== undefined) data.intervalCount = Math.max(1, Math.floor(Number(body.intervalCount)))
    if (body.trialDays !== undefined)   data.trialDays = Math.max(0, Math.floor(Number(body.trialDays)))
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    const plan = await prisma.plan.update({ where: { id }, data })
    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const subs = await prisma.subscription.count({ where: { planId: id } })
    if (subs > 0) {
      return Response.json(
        { error: 'Cannot delete a plan with active subscriptions. Deactivate it instead.' },
        { status: 409 },
      )
    }
    await prisma.plan.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

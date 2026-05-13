import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import type { PlanInterval } from '@prisma/client'

export async function GET() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscriptions: true } } },
    })
    return Response.json({ plans })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  try {
    const body = await req.json() as Partial<{
      name: string; description: string; amount: number
      interval: PlanInterval; intervalCount: number; trialDays: number
      isActive: boolean
    }>

    if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 })
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: 'amount must be > 0' }, { status: 400 })
    }
    const interval = body.interval
    if (interval !== 'WEEKLY' && interval !== 'MONTHLY' && interval !== 'YEARLY') {
      return Response.json({ error: 'interval must be WEEKLY|MONTHLY|YEARLY' }, { status: 400 })
    }

    const plan = await prisma.plan.create({
      data: {
        name:          body.name.trim(),
        description:   body.description?.trim() || null,
        amount,
        interval,
        intervalCount: body.intervalCount && body.intervalCount > 0 ? Math.floor(body.intervalCount) : 1,
        trialDays:     body.trialDays && body.trialDays > 0 ? Math.floor(body.trialDays) : 0,
        isActive:      body.isActive ?? true,
      },
    })
    return Response.json({ plan }, { status: 201 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

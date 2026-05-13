import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { nextPeriodEnd } from '@/lib/billing'
import type { SubscriptionStatus } from '@prisma/client'

const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED', 'TRIALING']

export async function GET(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const status = req.nextUrl.searchParams.get('status') as SubscriptionStatus | null
  const where = status && STATUSES.includes(status) ? { status } : undefined

  try {
    const subs = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { id: true, name: true, amount: true, interval: true, intervalCount: true } },
        _count: { select: { invoices: true } },
      },
    })

    // No FK on userId; fetch profile names separately for display
    const userIds = Array.from(new Set(subs.map(s => s.userId)))
    const users = userIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    return Response.json({
      subscriptions: subs.map(s => ({ ...s, user: userMap.get(s.userId) ?? null })),
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  try {
    const body = await req.json() as Partial<{
      userId: string; planId: string; trialDays: number; notes: string
    }>
    if (!body.userId || !body.planId) {
      return Response.json({ error: 'userId and planId required' }, { status: 400 })
    }
    const plan = await prisma.plan.findUnique({ where: { id: body.planId } })
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

    const now = new Date()
    const trialDays = Math.max(0, Math.floor(Number(body.trialDays ?? plan.trialDays)))
    const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * 86_400_000) : null
    const periodStart = trialEndsAt ?? now
    const periodEnd = nextPeriodEnd(periodStart, plan.interval, plan.intervalCount)

    const sub = await prisma.subscription.create({
      data: {
        userId:             body.userId,
        planId:             plan.id,
        status:             trialEndsAt ? 'TRIALING' : 'ACTIVE',
        startedAt:          now,
        trialEndsAt,
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        notes:              body.notes?.trim() || null,
      },
    })
    return Response.json({ subscription: sub }, { status: 201 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

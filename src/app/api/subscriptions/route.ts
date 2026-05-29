import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { nextPeriodEnd, createInvoiceForSubscription } from '@/lib/billing'

// GET — the signed-in customer's own subscriptions (newest first).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in to view subscriptions' }, { status: 401 })
  try {
    const subscriptions = await prisma.subscription.findMany({
      where:   { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    })
    return Response.json({ subscriptions })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in to subscribe' }, { status: 401 })
  const userId = user.sub

  try {
    const { planId } = await req.json() as { planId?: string }
    if (!planId) return Response.json({ error: 'planId required' }, { status: 400 })

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) return Response.json({ error: 'Plan not found or inactive' }, { status: 404 })

    // A live (paid, trialing, or paused) subscription to this plan blocks a new one.
    const live = await prisma.subscription.findFirst({
      where: { userId, planId, status: { in: ['ACTIVE', 'TRIALING', 'PAUSED'] } },
    })
    if (live) return Response.json({ error: 'You already have an active subscription to this plan' }, { status: 409 })

    const now = new Date()

    // ── Trial plans: no upfront charge — start the trial immediately. ──
    // The first real charge happens when the trial ends (recurring cron, deferred).
    if (plan.trialDays > 0) {
      const subscription = await prisma.subscription.create({
        data: {
          userId, planId,
          status:             'TRIALING',
          startedAt:          now,
          trialEndsAt:        new Date(now.getTime() + plan.trialDays * 86_400_000),
          currentPeriodStart: now,
          currentPeriodEnd:   nextPeriodEnd(now, plan.interval, plan.intervalCount),
        },
      })
      return Response.json({ subscription, requiresPayment: false }, { status: 201 })
    }

    // ── Paid plans: create the subscription in PAST_DUE (exists but not yet
    // paid → stays out of the "active" set) plus an OPEN invoice, then hand the
    // client off to /pay. Reuse an existing unpaid attempt so a re-click doesn't
    // pile up duplicate subscriptions/invoices. markInvoicePaid flips it ACTIVE.
    let subscription = await prisma.subscription.findFirst({
      where: { userId, planId, status: 'PAST_DUE' },
    })
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId, planId,
          status:             'PAST_DUE',
          startedAt:          now,
          currentPeriodStart: now,
          currentPeriodEnd:   nextPeriodEnd(now, plan.interval, plan.intervalCount),
        },
      })
    }

    let invoice = await prisma.invoice.findFirst({
      where:   { subscriptionId: subscription.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    })
    if (!invoice) invoice = await createInvoiceForSubscription(subscription.id)

    return Response.json({ subscription, invoiceId: invoice.id, requiresPayment: true }, { status: 201 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

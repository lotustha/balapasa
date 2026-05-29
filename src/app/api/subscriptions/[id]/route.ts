import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH — customer cancels or resumes THEIR OWN subscription.
// Ownership is enforced: a user can only touch subscriptions whose userId
// matches their own. Admin-side pause/cancel lives under /api/admin/subscriptions.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 })

  const { id } = await ctx.params
  const { action } = await req.json().catch(() => ({})) as { action?: string }

  const sub = await prisma.subscription.findUnique({ where: { id } })
  if (!sub || sub.userId !== user.sub) {
    return Response.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (action === 'cancel') {
    if (sub.status === 'CANCELLED') {
      return Response.json({ error: 'Already cancelled' }, { status: 409 })
    }
    // No recurring billing is wired yet, so cancel immediately and honestly —
    // the subscription stops now rather than recording an intent a cron would
    // later honour. When billing lands, switch this to cancelAtPeriodEnd.
    const updated = await prisma.subscription.update({
      where: { id },
      data:  { status: 'CANCELLED', cancelledAt: new Date(), cancelAtPeriodEnd: false },
      include: { plan: true },
    })
    return Response.json({ subscription: updated })
  }

  if (action === 'resume') {
    if (sub.status !== 'CANCELLED' && sub.status !== 'PAUSED') {
      return Response.json({ error: 'Only cancelled or paused subscriptions can be resumed' }, { status: 409 })
    }
    const updated = await prisma.subscription.update({
      where: { id },
      data:  { status: 'ACTIVE', cancelledAt: null, cancelAtPeriodEnd: false },
      include: { plan: true },
    })
    return Response.json({ subscription: updated })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

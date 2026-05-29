import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoiceForSubscription } from '@/lib/billing'

// Reading headers/query forces dynamic anyway; this is cheap insurance against
// any caching of the cron endpoint.
export const dynamic = 'force-dynamic'

// POST (or GET, for easy curl) /api/cron/billing
// The recurring-billing engine described in src/lib/billing-cron.md. Run daily.
// All timestamps are UTC and every step is idempotent so the job is safe to
// re-run (e.g. after a crash or a manual retry).
//
// Auth: a cron secret is infrastructure auth, not a business setting, so it
// lives in process.env (unlike payment/logistics config which lives in
// app_settings). Provide it as `Authorization: Bearer <CRON_SECRET>` or
// `?token=<CRON_SECRET>`.

const STALE_GRACE_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

// Retry createInvoiceForSubscription on a duplicate-number collision. The
// invoice number generator is not race-safe (see billing.ts); the unique
// constraint on Invoice.number rejects collisions with Prisma P2002. Because
// generateInvoiceNumber re-queries the current max on every call, simply
// re-invoking the whole helper yields a fresh number — never cache it.
async function createInvoiceWithRetry(subscriptionId: string, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await createInvoiceForSubscription(subscriptionId)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002' && attempt < tries) continue
      throw err
    }
  }
}

async function runBilling() {
  const now = new Date()
  let renewed = 0
  let trialsEnded = 0
  let markedOverdue = 0

  // (a) RENEWALS — active subscriptions whose period has ended.
  const dueRenewals = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lte: now } },
    select: { id: true },
  })
  for (const sub of dueRenewals) {
    // The existence check guards only invoice CREATION. The PAST_DUE flip runs
    // unconditionally: if a prior run created the invoice but crashed before the
    // status update, this still moves the sub off ACTIVE so it isn't reselected
    // forever. The ACTIVE filter above then drops it from future runs.
    const open = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id, status: { in: ['OPEN', 'OVERDUE'] } },
      select: { id: true },
    })
    if (!open) await createInvoiceWithRetry(sub.id)
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    })
    renewed++
  }

  // (b) TRIAL EXPIRY — trialing subscriptions whose trial has ended.
  // We deliberately move to PAST_DUE (NOT ACTIVE, despite the older wording in
  // billing-cron.md). Nepal PSPs (eSewa/Khalti) have no card-on-file / auto-debit,
  // so we cannot silently charge the customer — they must pay the generated
  // invoice to continue. Same idempotent create + unconditional status flip as
  // renewals.
  const expiredTrials = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { lte: now } },
    select: { id: true },
  })
  for (const sub of expiredTrials) {
    const open = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id, status: { in: ['OPEN', 'OVERDUE'] } },
      select: { id: true },
    })
    if (!open) await createInvoiceWithRetry(sub.id)
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    })
    trialsEnded++
  }

  // (c) STALE INVOICES — OPEN invoices past their due date plus a 3-day grace
  // flip to OVERDUE for visibility. Runs last so an invoice freshly created
  // above (dueDate = currentPeriodEnd, possibly already past) is only reaped
  // here if it is genuinely beyond the grace window.
  const staleCutoff = new Date(now.getTime() - STALE_GRACE_MS)
  const stale = await prisma.invoice.updateMany({
    where: { status: 'OPEN', dueDate: { lt: staleCutoff } },
    data: { status: 'OVERDUE' },
  })
  markedOverdue = stale.count

  console.log(
    `[cron/billing] renewed=${renewed} trialsEnded=${trialsEnded} markedOverdue=${markedOverdue}`,
  )

  return { ok: true, renewed, trialsEnded, markedOverdue }
}

function authorize(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET
  // Never run unauthenticated, and never compare against an undefined secret.
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const token = req.nextUrl.searchParams.get('token')
  if (bearer !== secret && token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json(await runBilling())
}

// Accept GET as well so the job can be triggered with a plain curl.
export async function GET(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json(await runBilling())
}

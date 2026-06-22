import { prisma } from './prisma'
import type { PlanInterval, Prisma } from '@prisma/client'
import { render } from './emails/registry'
import { sendEmailLogged } from './email'
import { getSiteSettings } from './site-settings'

type InvoiceWithSub = Prisma.InvoiceGetPayload<{ include: { subscription: { include: { plan: true } } } }>

// Fire-and-forget receipt email when an invoice becomes PAID. Best-effort: any
// failure is logged by sendEmailLogged and never propagates to the payment path.
async function sendInvoicePaidEmail(invoice: InvoiceWithSub, paymentMethod: string): Promise<void> {
  try {
    const user = await prisma.profile.findUnique({
      where:  { id: invoice.userId },
      select: { name: true, email: true },
    })
    if (!user?.email) return

    const { siteName, storeUrl, logoUrl } = await getSiteSettings()
    const description = invoice.notes?.trim()
      || (invoice.subscription ? `${invoice.subscription.plan.name} — subscription` : 'Service / Product')

    const { subject, html } = await render('invoice-paid', {
      recipientName: user.name ?? 'Customer',
      invoiceNumber: invoice.number,
      amount:        invoice.amount,
      method:        paymentMethod,
      description,
      invoiceUrl:    `${storeUrl.replace(/\/+$/, '')}/api/account/invoices/${invoice.id}/print`,
      siteUrl:       storeUrl,
      siteName,
      logoUrl,
    })
    await sendEmailLogged('invoice-paid', { to: user.email, subject, html, context: { invoice: invoice.number } })
  } catch (e) {
    console.warn('[billing] invoice-paid email failed:', e)
  }
}

/**
 * Compute the next period-end date given a start, an interval, and a count.
 * Pure: no DB, no side effects. Uses calendar math (months add by month, not 30 days).
 */
export function nextPeriodEnd(start: Date, interval: PlanInterval, count: number): Date {
  const n = Math.max(1, Math.floor(count || 1))
  const d = new Date(start.getTime())
  switch (interval) {
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7 * n)
      return d
    case 'MONTHLY':
      d.setUTCMonth(d.getUTCMonth() + n)
      return d
    case 'YEARLY':
      d.setUTCFullYear(d.getUTCFullYear() + n)
      return d
    default:
      return d
  }
}

/**
 * Generate a sequential invoice number per calendar year, e.g. INV-2026-00001.
 * NOTE: not race-safe — relies on the unique constraint on Invoice.number to
 * reject collisions under contention. The cron engine should retry on conflict.
 * See billing-cron.md for the full design.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  })

  let next = 1
  if (last?.number) {
    const tail = last.number.slice(prefix.length)
    const parsed = parseInt(tail, 10)
    if (Number.isFinite(parsed)) next = parsed + 1
  }

  return prefix + String(next).padStart(5, '0')
}

/**
 * Create the next OPEN invoice for a subscription.
 * Pure-ish: writes one Invoice row and returns it. Does NOT advance the
 * subscription's period — that's the cron engine's job (see billing-cron.md).
 *
 * dueDate defaults to currentPeriodEnd (i.e. due by the end of the current cycle).
 */
export async function createInvoiceForSubscription(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  })
  if (!sub) throw new Error('Subscription not found')

  const number = await generateInvoiceNumber()

  return prisma.invoice.create({
    data: {
      subscriptionId: sub.id,
      userId:         sub.userId,
      number,
      amount:         sub.plan.amount,
      status:         'OPEN',
      dueDate:        sub.currentPeriodEnd,
    },
  })
}

/**
 * Canonical OPEN -> PAID transition (billing-cron.md step 3). The single place
 * an invoice becomes paid — used by the payment-verify path today and by the
 * recurring cron when it lands. Idempotent: a second call on an already-PAID
 * invoice is a no-op.
 *
 * When the invoice belongs to a subscription it also advances the billing
 * period and re-activates the subscription:
 *   - Renewal (period already lapsed): roll the window forward one interval.
 *   - Initial/early payment (period still in the future): keep the window that
 *     was set at signup — paying seconds after signup must not double it.
 * If the customer had flagged cancel-at-period-end, the paid invoice closes the
 * subscription as CANCELLED instead of re-activating it.
 */
export async function markInvoicePaid(
  invoiceId: string,
  opts: { paymentMethod: string; transactionId?: string | null },
): Promise<{ ok: boolean; alreadyPaid: boolean }> {
  const invoice = await prisma.invoice.findUnique({
    where:   { id: invoiceId },
    include: { subscription: { include: { plan: true } } },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'PAID') return { ok: true, alreadyPaid: true }

  await prisma.$transaction(async tx => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status:        'PAID',
        paidAt:        new Date(),
        paymentMethod: opts.paymentMethod,
        transactionId: opts.transactionId ?? null,
      },
    })

    const sub = invoice.subscription
    if (sub) {
      const now = new Date()
      let periodStart = sub.currentPeriodStart
      let periodEnd   = sub.currentPeriodEnd
      if (sub.currentPeriodEnd <= now) {
        periodStart = sub.currentPeriodEnd
        periodEnd   = nextPeriodEnd(periodStart, sub.plan.interval, sub.plan.intervalCount)
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status:             sub.cancelAtPeriodEnd ? 'CANCELLED' : 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd:   periodEnd,
          ...(sub.cancelAtPeriodEnd ? { cancelledAt: now } : {}),
        },
      })
    }
  })

  // Receipt email on the OPEN → PAID transition. Best-effort; never blocks the
  // paid result. `invoice` already has subscription+plan included above.
  await sendInvoicePaidEmail(invoice, opts.paymentMethod)

  return { ok: true, alreadyPaid: false }
}

import { prisma } from './prisma'
import type { PlanInterval } from '@prisma/client'

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

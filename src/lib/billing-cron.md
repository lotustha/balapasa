# Recurring billing engine — design notes (NOT YET IMPLEMENTED)

This file is a placeholder. The recurring engine is intentionally not built in v1.

## What the engine should do

A daily cron job iterates `Subscription` rows where `status = ACTIVE` and
`currentPeriodEnd <= now()`:

1. For each due subscription, call `createInvoiceForSubscription(sub.id)` from
   `src/lib/billing.ts`. That writes a fresh OPEN `Invoice`.
2. Mark the subscription `PAST_DUE`. It stays that way until an admin (or an
   auto-charge, see below) marks the invoice `PAID`.
3. When an invoice transitions OPEN -> PAID:
   - Advance `currentPeriodStart` to the old `currentPeriodEnd`.
   - Advance `currentPeriodEnd` to `nextPeriodEnd(currentPeriodStart, plan.interval, plan.intervalCount)`.
   - Flip status back to `ACTIVE` (or `CANCELLED` if `cancelAtPeriodEnd` was set).
4. Trial handling: when `trialEndsAt <= now()` and status is `TRIALING`,
   transition to `ACTIVE` and start the first billing cycle.
5. Stale-OPEN invoices (`dueDate < now() - grace`) flip to `OVERDUE` for visibility.

## Nepal payment-provider reality

eSewa and Khalti **do not natively support card-on-file or recurring auto-debit**
for merchants. The realistic v1 flow is:

- Cron generates the invoice + emails/SMSes the customer a payment link.
- Customer manually pays via eSewa/Khalti/COD/bank transfer per cycle.
- Admin (or webhook from `src/app/api/payment/verify`) marks the invoice paid.

If/when card-on-file becomes available (Stripe-NP, FonePay tokenization), wire
auto-charge into the same OPEN -> PAID transition above.

## Scheduler

Recommended options, in order of fit:

- **Vercel Cron** — simplest if the app already deploys on Vercel. Add a
  `vercel.json` cron entry pointing at `/api/cron/billing` (a route to be built).
- **Inngest** — better if you want retries, observability, and step functions.
- **Supabase pg_cron** — works but pushes scheduling into the DB layer; harder to
  reason about.

## Known issues to address when building

- `generateInvoiceNumber()` is **not race-safe**. The unique constraint on
  `Invoice.number` will reject duplicates; the engine must catch
  `P2002` and retry with a fresh number.
- Idempotency: the cron must be safe to re-run. Before creating an invoice for a
  cycle, check `prisma.invoice.findFirst({ where: { subscriptionId, status: { in: ['OPEN','OVERDUE'] } } })`
  — if an unpaid invoice already exists for this cycle, skip.
- Time zone: store + compare in UTC (Prisma defaults). Render in `Asia/Kathmandu`
  in admin UI only.

## Out of scope for v1 (also not built)

- Customer-facing self-service portal (subscribe/cancel/update payment).
- Checkout flow that creates a `Subscription` when a `kind=SUBSCRIPTION` product
  is purchased — for now, admin manually creates subscriptions.
- Proration on plan change.
- Dunning emails / retry ladders.

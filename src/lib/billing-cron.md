# Recurring billing engine — design notes

**Implemented.** The engine route now lives at `src/app/api/cron/billing/route.ts`
and is scheduled by `.github/workflows/billing-cron.yml` (GitHub Actions, daily at
`0 2 * * *` UTC). It authenticates with `process.env.CRON_SECRET` (Bearer header or
`?token=`) and returns `{ ok, renewed, trialsEnded, markedOverdue }`. Every step is
idempotent so the job is safe to re-run.

The notes below describe the design; one decision deviates from the original wording
(see Trial handling).

## What the engine does

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
4. Trial handling: when `trialEndsAt <= now()` and status is `TRIALING`, treat it
   like a renewal — create an OPEN invoice (if none open/overdue) and set status
   `PAST_DUE`. **This intentionally deviates from the original "→ ACTIVE" wording.**
   Because Nepal PSPs (eSewa/Khalti) have no card-on-file / auto-debit, we cannot
   silently charge the customer; they must pay the generated invoice to continue,
   so we never grant `ACTIVE` for free at trial end.
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

**In use:** GitHub Actions (`.github/workflows/billing-cron.yml`) curls
`POST $SITE_URL/api/cron/billing` daily with the `CRON_SECRET` Bearer token. The app
deploys to a VPS (not Vercel), so Actions is the natural fit — it already runs the
deploy chain. The workflow needs two repo secrets: `CRON_SECRET` (matching
`process.env.CRON_SECRET` on the server) and `SITE_URL` (production base URL).

Other options considered:

- **Vercel Cron** — N/A, not a Vercel deploy.
- **Inngest** — better if you later want retries, observability, and step functions.
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

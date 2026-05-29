import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { esewaFormData, getEsewaPaymentUrl, khaltiInitiate } from '@/lib/payment'

// POST /api/subscriptions/[id]/pay  { method: 'esewa' | 'khalti' }
// Initiates online payment for the subscription's open invoice. Returns the
// data the client needs to hand the user to the gateway:
//   esewa  → { method, action, fields }  (client builds an auto-submitting form)
//   khalti → { method, payment_url }      (client redirects)
// The gateway redirects back to /checkout/verify?...&type=subscription, which
// calls markInvoicePaid() to activate the subscription. COD/partial-COD don't
// apply to subscriptions — they're prepaid only.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 })

  const { id } = await ctx.params
  const { method } = await req.json().catch(() => ({})) as { method?: string }

  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } })
  if (!sub || sub.userId !== user.sub) {
    return Response.json({ error: 'Subscription not found' }, { status: 404 })
  }

  const invoice = await prisma.invoice.findFirst({
    where:   { subscriptionId: sub.id, status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
  })
  if (!invoice) return Response.json({ error: 'No open invoice to pay' }, { status: 400 })

  if (method === 'esewa') {
    const fields = await esewaFormData(invoice.id, invoice.amount, 0, 'subscription')
    const action = await getEsewaPaymentUrl()
    return Response.json({ method: 'esewa', action, fields })
  }

  if (method === 'khalti') {
    const profile = await prisma.profile.findUnique({ where: { id: user.sub } })
    const khalti = await khaltiInitiate({
      orderId:       invoice.id,
      orderName:     sub.plan.name,
      amount:        invoice.amount,
      customerName:  profile?.name ?? user.name ?? 'Customer',
      customerEmail: user.email ?? profile?.email ?? '',
      customerPhone: profile?.phone ?? '',
      kind:          'subscription',
    })
    if (khalti.error || !khalti.payment_url) {
      return Response.json({ error: 'Could not start Khalti payment. Please try again.' }, { status: 502 })
    }
    return Response.json({ method: 'khalti', payment_url: khalti.payment_url })
  }

  return Response.json({ error: 'Choose eSewa or Khalti' }, { status: 400 })
}

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/account/invoices — the signed-in customer's own invoices
// (subscription-cycle + one-off), newest first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Sign in to view invoices' }, { status: 401 })

  try {
    const invoices = await prisma.invoice.findMany({
      where:   { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { subscription: { select: { plan: { select: { name: true } } } } },
    })

    return Response.json({
      invoices: invoices.map(i => ({
        id:            i.id,
        number:        i.number,
        amount:        i.amount,
        status:        i.status,
        dueDate:       i.dueDate.toISOString(),
        paidAt:        i.paidAt ? i.paidAt.toISOString() : null,
        paymentMethod: i.paymentMethod,
        notes:         i.notes,
        createdAt:     i.createdAt.toISOString(),
        planName:      i.subscription?.plan.name ?? null,
      })),
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

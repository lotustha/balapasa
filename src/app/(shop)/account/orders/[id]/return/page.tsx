import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isOrderReturnable, getReturnWindowDays } from '@/lib/return-eligibility'
import ReturnForm from './ReturnForm'

export const metadata = {
  title: 'Request return',
  robots: { index: false, follow: false },
}

interface PageProps { params: Promise<{ id: string }> }

export default async function ReturnRequestPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/account/orders/' + id + '/return')}`)

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true, userId: true, status: true, orderCode: true, total: true,
      items: { select: { id: true, name: true, quantity: true, price: true, image: true } },
    },
  })
  if (!order || order.userId !== user.sub) notFound()

  const eligibility = await isOrderReturnable(order.id)
  const window = await getReturnWindowDays()
  const existing = await prisma.returnRequest.findFirst({
    where:   { orderId: order.id },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })

  const code = order.orderCode ?? order.id.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-screen pt-6 pb-16" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 35%, #FFF0F9 65%, #F0FDF4 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Return request</p>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">Order {code}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick the items you&apos;d like to return. Window: {window} days from delivery.
          </p>
        </div>

        <ReturnForm
          orderId={order.id}
          items={order.items}
          existing={existing
            ? {
                id:            existing.id,
                status:        existing.status,
                reason:        existing.reason,
                customerNote:  existing.customerNote,
                adminNote:     existing.adminNote,
                refundAmount:  existing.refundAmount,
                createdAt:     existing.createdAt.toISOString(),
                items:         existing.items.map(i => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
              }
            : null}
          eligibility={eligibility.ok ? { ok: true } : { ok: false, reason: eligibility.reason }}
        />
      </div>
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import EditAddressForm from './EditAddressForm'

const EDITABLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])

export const metadata = {
  title: 'Edit delivery address',
  robots: { index: false, follow: false },
}

interface PageProps { params: Promise<{ id: string }> }

export default async function EditAddressPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/account/orders/' + id + '/edit-address')}`)

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true, userId: true, status: true, orderCode: true,
      name: true, phone: true,
      address: true, city: true, house: true, road: true,
      lat: true, lng: true,
    },
  })
  if (!order || order.userId !== user.sub) notFound()

  const editable = EDITABLE_STATUSES.has(order.status)
  const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-screen pt-6 pb-16" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 35%, #FFF0F9 65%, #F0FDF4 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Edit address</p>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">Order {code}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Update the delivery address. We&apos;ll relay it to the courier on the next dispatch attempt.
          </p>
        </div>

        {!editable ? (
          <div className="glass-card p-6">
            <p className="text-sm font-bold text-amber-700">
              This order is already {order.status.toLowerCase()} — we can&apos;t change the address self-serve any more.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Reach out via WhatsApp or call the store and we&apos;ll see what&apos;s possible if the rider hasn&apos;t left yet.
            </p>
          </div>
        ) : (
          <EditAddressForm
            orderId={order.id}
            initial={{
              address: order.address,
              city:    order.city,
              house:   order.house,
              road:    order.road,
              lat:     order.lat,
              lng:     order.lng,
            }}
          />
        )}
      </div>
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Package, ShoppingBag, Clock, MapPin, CreditCard,
  Truck, ChevronRight, RotateCcw, Pencil, Download,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isOrderReturnable } from '@/lib/return-eligibility'
import { friendlyStatusLabel } from '@/lib/pnd-status-labels'
import { formatPrice } from '@/lib/utils'

export const metadata = {
  title: 'Order details',
  robots: { index: false, follow: false },
}

interface PageProps { params: Promise<{ id: string }> }

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200'  },
  CONFIRMED:  { label: 'Confirmed',  cls: 'bg-blue-100 text-blue-700 border-blue-200'        },
  PROCESSING: { label: 'Processing', cls: 'bg-purple-100 text-purple-700 border-purple-200'  },
  SHIPPED:    { label: 'Shipped',    cls: 'bg-indigo-100 text-indigo-700 border-indigo-200'  },
  DELIVERED:  { label: 'Delivered',  cls: 'bg-green-100 text-green-700 border-green-200'     },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-red-100 text-red-700 border-red-200'           },
}

const PAY_META: Record<string, { label: string; cls: string }> = {
  UNPAID:   { label: 'Unpaid',   cls: 'bg-slate-100 text-slate-500'   },
  PAID:     { label: 'Paid',     cls: 'bg-green-100 text-green-700'   },
  FAILED:   { label: 'Failed',   cls: 'bg-red-100 text-red-600'       },
  REFUNDED: { label: 'Refunded', cls: 'bg-amber-100 text-amber-700'   },
}

const PRE_SHIPPED = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])

function fmtDateTime(d: Date) {
  return d.toLocaleString('en-NP', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/account/orders/' + id)}`)

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  })
  if (!order || order.userId !== user.sub) notFound()

  const timeline = await prisma.orderStatusLog.findMany({
    where:   { orderId: order.id },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, source: true, rawStatus: true, mappedStatus: true, comment: true, createdAt: true },
  })

  const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
  const status   = STATUS_META[order.status]        ?? { label: order.status,        cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  const pay      = PAY_META[order.paymentStatus]    ?? { label: order.paymentStatus, cls: 'bg-slate-100 text-slate-500' }
  const canEdit  = PRE_SHIPPED.has(order.status)
  const returnInfo = order.status === 'DELIVERED' ? await isOrderReturnable(order.id) : null
  const canReturn  = returnInfo?.ok === true

  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#8B5CF6', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <Link href="/account/orders"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Order details</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight truncate">
              <span className="font-mono">#{code}</span>
            </h1>
          </div>
          <span className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.cls}`}>
            {status.label}
          </span>
        </div>

        {/* Summary card */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} /> Placed {fmtDateTime(order.createdAt)}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pay.cls}`}>{pay.label}</span>
            <span className="text-[10px] text-slate-400">{order.paymentMethod}</span>
            {order.shippingOption && (
              <span className="text-[10px] text-slate-400">· {order.shippingOption}</span>
            )}
            <span className="ml-auto font-extrabold text-lg text-slate-900">{formatPrice(order.total)}</span>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <Link
              href={`/track-order?id=${order.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
            >
              <Truck size={13} /> Track order <ChevronRight size={12} />
            </Link>
            <a
              href={`/api/account/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Download size={13} /> Download invoice
            </a>
            {canEdit && (
              <Link
                href={`/account/orders/${order.id}/edit-address`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <Pencil size={13} /> Edit address
              </Link>
            )}
            {canReturn && (
              <Link
                href={`/account/orders/${order.id}/return`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} /> Request return
              </Link>
            )}
          </div>

          {/* Cancellation hint — cannot do it from server component, link sends back to list which has the handler */}
          {canEdit && (
            <p className="text-[11px] text-slate-400 mt-3">
              Need to cancel? Head back to <Link href="/account/orders" className="text-primary hover:underline">My Orders</Link>.
            </p>
          )}
        </div>

        {/* Items */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Package size={15} className="text-primary" />
            <h2 className="font-heading font-bold text-sm text-slate-800">
              Items <span className="text-slate-400 font-normal">({order.items.length})</span>
            </h2>
          </div>
          <ul className="space-y-3">
            {order.items.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {item.image
                    ? <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                    : <ShoppingBag size={18} className="absolute inset-0 m-auto text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Qty {item.quantity} · {formatPrice(item.price)} each</p>
                </div>
                <p className="font-bold text-sm text-slate-900 shrink-0">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment summary */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-primary" />
            <h2 className="font-heading font-bold text-sm text-slate-800">Payment summary</h2>
          </div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.autoDiscount ? (
              <div className="flex justify-between text-emerald-600"><dt>Auto discount</dt><dd>-{formatPrice(order.autoDiscount)}</dd></div>
            ) : null}
            {order.couponCode && order.couponDiscount ? (
              <div className="flex justify-between text-emerald-600"><dt>Coupon ({order.couponCode})</dt><dd>-{formatPrice(order.couponDiscount)}</dd></div>
            ) : null}
            <div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : 'Free'}</dd></div>
            <div className="flex justify-between pt-2 mt-2 border-t border-slate-100 font-bold text-slate-900">
              <dt>Total</dt><dd>{formatPrice(order.total)}</dd>
            </div>
            {order.advancePaid != null && order.advancePaid > 0 && (
              <div className="flex justify-between text-slate-500 text-xs pt-1"><dt>Advance paid ({order.advanceMethod})</dt><dd>{formatPrice(order.advancePaid)}</dd></div>
            )}
            {order.codAmount != null && order.codAmount > 0 && (
              <div className="flex justify-between text-slate-500 text-xs"><dt>To collect on delivery</dt><dd>{formatPrice(order.codAmount)}</dd></div>
            )}
          </dl>
        </div>

        {/* Shipping */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} className="text-primary" />
            <h2 className="font-heading font-bold text-sm text-slate-800">Delivery address</h2>
          </div>
          <p className="text-sm font-semibold text-slate-800">{order.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{order.phone}</p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {[order.house, order.road, order.address, order.city].filter(Boolean).join(', ')}
          </p>
          {order.deliveryNote && (
            <p className="text-xs text-slate-400 mt-2 italic">Note: {order.deliveryNote}</p>
          )}
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-primary" />
              <h2 className="font-heading font-bold text-sm text-slate-800">Order activity</h2>
            </div>
            <ol className="relative pl-5 border-l-2 border-slate-100 space-y-4">
              {timeline.map(log => {
                // Carrier sub-states (e.g. "Picked up", "Out for delivery",
                // "Rider is nearby") render with their friendly label + icon.
                // Internal/admin statuses fall back to Title Case. The mapped
                // stage (SHIPPED, DELIVERED…) is shown as a small chip so each
                // carrier step reads clearly as a sub-state of that stage.
                const { label, icon } = friendlyStatusLabel(log.rawStatus)
                return (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span aria-hidden="true">{icon}</span> {label}
                      {log.mappedStatus && (
                        <span className="ml-1 font-normal text-[9px] text-slate-400 uppercase tracking-wider bg-slate-100 rounded px-1.5 py-0.5">{log.mappedStatus}</span>
                      )}
                    </p>
                    {log.comment && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.comment}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {fmtDateTime(log.createdAt)}
                      <span className="ml-2 uppercase tracking-wider">{log.source}</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

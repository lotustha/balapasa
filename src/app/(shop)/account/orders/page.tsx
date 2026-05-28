'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, ArrowLeft, ShoppingBag, CheckCircle2,
  Clock, ChevronRight, Loader2, Search, AlertTriangle, X,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderItem { name: string; quantity: number; price: number; image?: string | null }
interface Order {
  id: string; orderCode: string | null
  status: string; paymentStatus: string; paymentMethod: string
  total: number; subtotal: number; deliveryCharge: number
  name: string; address: string; city: string
  shippingOption?: string | null; createdAt: string; items: OrderItem[]
}

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OrdersContent() {
  const searchParams  = useSearchParams()
  const paymentResult = searchParams.get('payment')
  const method        = searchParams.get('method')

  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [unauth,  setUnauth]  = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason]   = useState<string>('')
  const [cancelError, setCancelError]     = useState<string | null>(null)

  function promptCancel(order: Order) {
    setCancelError(null)
    setCancelReason('')
    setConfirmTarget(order)
  }

  async function confirmCancel() {
    if (!confirmTarget || !cancelReason) return
    const orderId = confirmTarget.id
    setCancellingId(orderId)
    setCancelError(null)
    try {
      const res = await fetch(`/api/account/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCancelError(json.error ?? `Something went wrong (HTTP ${res.status}). Please try again.`)
        setCancellingId(null)
        return
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
      setConfirmTarget(null)
    } catch {
      setCancelError('Network error — please check your connection and try again.')
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    fetch('/api/orders')
      .then(r => {
        if (r.status === 401) { setUnauth(true); return null }
        return r.json()
      })
      .then(d => { if (d) setOrders(d.orders ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#8B5CF6', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">My Orders</h1>
          </div>
          {!loading && orders.length > 0 && (
            <span className="ml-auto text-xs font-bold text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Payment success banner */}
        {paymentResult === 'success' && (
          <div className="mb-5 flex items-center gap-3 px-5 py-4 rounded-2xl border border-green-200 bg-green-50 animate-fade-in-up">
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-sm">Payment successful!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Your {method === 'esewa' ? 'eSewa' : method === 'khalti' ? 'Khalti' : ''} payment was confirmed. Your order is being processed.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading your orders…</p>
          </div>
        )}

        {/* Not signed in */}
        {!loading && unauth && (
          <div className="glass-card p-10 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Sign in to view your orders</p>
            <p className="text-slate-400 text-xs mt-1.5">Your order history is saved to your account.</p>
            <Link href="/login"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Sign In
            </Link>
          </div>
        )}

        {/* Empty */}
        {!loading && !unauth && orders.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No orders yet</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
              Start shopping to see your order history here.
            </p>
            <Link href="/products"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Browse Products
            </Link>
          </div>
        )}

        {/* Order list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const status  = STATUS_META[order.status]  ?? { label: order.status,       cls: 'bg-slate-100 text-slate-600 border-slate-200' }
              const pay     = PAY_META[order.paymentStatus] ?? { label: order.paymentStatus, cls: 'bg-slate-100 text-slate-500' }
              return (
                <div key={order.id}
                  className="glass-card overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        Order <span className="font-mono text-primary">#{order.orderCode ?? order.id.slice(0, 8).toUpperCase()}</span>
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {timeAgo(order.createdAt)}
                        {order.shippingOption && <> · {order.shippingOption}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item, j) => (
                        <div key={j} className="relative w-10 h-10 rounded-xl border-2 border-white overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                          {item.image
                            ? <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
                            : <ShoppingBag size={14} className="absolute inset-0 m-auto text-slate-300" />
                          }
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-10 h-10 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 font-medium truncate">
                        {order.items.map(i => i.name).join(', ')}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pay.cls}`}>
                        {pay.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{order.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <p className="font-extrabold text-sm text-slate-900">{formatPrice(order.total)}</p>
                      {/* Pre-shipped actions — edit address + cancel. Hidden the
                          moment the order moves past PROCESSING. */}
                      {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (
                        <>
                          <Link href={`/account/orders/${order.id}/edit-address`}
                            className="text-xs font-semibold text-slate-500 hover:text-primary cursor-pointer underline-offset-2 hover:underline">
                            Edit address
                          </Link>
                          <button
                            type="button"
                            onClick={() => promptCancel(order)}
                            disabled={cancellingId === order.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                          </button>
                        </>
                      )}
                      {/* Post-delivery return entry point — only DELIVERED. The
                          server gates the 7-day window separately. */}
                      {order.status === 'DELIVERED' && (
                        <Link href={`/account/orders/${order.id}/return`}
                          className="text-xs font-semibold text-slate-500 hover:text-primary cursor-pointer underline-offset-2 hover:underline">
                          Request return
                        </Link>
                      )}
                      <Link href={`/account/orders/${order.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                        View details <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Track another order */}
            <Link href="/track-order"
              className="glass-card flex items-center justify-center gap-2 py-4 text-sm font-bold text-primary hover:bg-white/80 transition-colors cursor-pointer">
              <Search size={14} /> Track a different order
            </Link>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setConfirmTarget(null) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-heading font-extrabold text-slate-900 text-base leading-tight">Cancel order?</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    #{confirmTarget.orderCode ?? confirmTarget.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setConfirmTarget(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer flex-shrink-0">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-2">
              <p className="text-sm text-slate-500 leading-relaxed mb-3">
                Please tell us why you want to cancel. This helps us improve.
              </p>

              {/* Reason chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Changed my mind',
                  'Ordered by mistake',
                  'Found a better price',
                  'Delivery taking too long',
                  'Wrong item ordered',
                  'Other',
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCancelReason(r)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      cancelReason === r
                        ? 'bg-red-500 border-red-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {(confirmTarget.paymentMethod === 'ESEWA' || confirmTarget.paymentMethod === 'KHALTI') && (
                <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You paid via {confirmTarget.paymentMethod === 'ESEWA' ? 'eSewa' : 'Khalti'}. Refunds are processed manually by our team within 3–5 business days.
                  </p>
                </div>
              )}
              {cancelError && (
                <div className="mt-3 px-3.5 py-3 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-xs text-red-600">{cancelError}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 py-5">
              <button type="button" onClick={() => setConfirmTarget(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                Keep order
              </button>
              <button type="button" onClick={confirmCancel} disabled={!!cancellingId || !cancelReason}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-sm font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2">
                {cancellingId ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</> : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <OrdersContent />
    </Suspense>
  )
}

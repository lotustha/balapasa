'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, ArrowLeft, ShoppingBag, CheckCircle2,
  Clock, ChevronRight, Loader2, Search,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderItem { name: string; quantity: number; price: number; image?: string | null }
interface Order {
  id: string; status: string; paymentStatus: string; paymentMethod: string
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
                        Order <span className="font-mono text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
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
                    <div className="flex items-center gap-3">
                      <p className="font-extrabold text-sm text-slate-900">{formatPrice(order.total)}</p>
                      <Link href={`/track-order?id=${order.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                        Track <ChevronRight size={12} />
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

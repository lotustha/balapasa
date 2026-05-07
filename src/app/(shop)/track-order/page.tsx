'use client'

import { useState } from 'react'
import {
  Truck, Package, Search, CheckCircle, Clock, AlertCircle,
  MapPin, Phone, ArrowRight, Loader2, ExternalLink,
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface OrderItem { name: string; quantity: number; price: number; image?: string | null }
interface Order {
  id: string; status: string; paymentStatus: string; paymentMethod: string
  total: number; subtotal: number; deliveryCharge: number
  name: string; phone: string; address: string; city: string
  shippingOption?: string | null; trackingUrl?: string | null; pathaoOrderId?: string | null
  createdAt: string; items: OrderItem[]
}

const STATUS_STEPS = [
  { key: 'PENDING',    label: 'Order Placed',    icon: Package    },
  { key: 'CONFIRMED',  label: 'Confirmed',        icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing',       icon: Clock       },
  { key: 'SHIPPED',    label: 'Out for Delivery', icon: Truck       },
  { key: 'DELIVERED',  label: 'Delivered',        icon: CheckCircle },
]

const STATUS_ORDER = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED']

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

export default function TrackOrderPage() {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [order,   setOrder]   = useState<Order | null>(null)
  const [error,   setError]   = useState('')

  async function track(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(''); setOrder(null)
    try {
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Order not found'); return }
      setOrder(data.order)
    } catch {
      setError('Could not connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? STATUS_ORDER.indexOf(order.status) : -1

  return (
    <div
      className="min-h-screen py-12"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 50%, #F0FDF4 100%)' }}
    >
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 left-0 w-80 h-80" style={{ background: '#8B5CF6', opacity: 0.10 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-1/3 right-0 w-64 h-64" style={{ background: '#06B6D4', opacity: 0.08 }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-0 left-1/3 w-72 h-72" style={{ background: '#EC4899', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 glass-card rounded-3xl mb-5">
            <Truck size={28} className="text-primary" />
          </div>
          <h1 className="font-heading font-extrabold text-4xl text-slate-900">Track Your Order</h1>
          <p className="text-slate-500 mt-3">Enter your order ID to see real-time delivery status</p>
        </div>

        {/* Search box */}
        <div className="glass-card p-6 mb-6 animate-fade-in-up delay-100">
          <form onSubmit={track} className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Enter Order ID (e.g. cma1x2y3…)"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? 'Searching…' : 'Track'}
            </button>
          </form>

          <p className="text-xs text-slate-400 mt-3 text-center">
            You can find your Order ID in the confirmation message or your account&apos;s order history.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-5 mb-6 flex items-start gap-3 border border-red-100 animate-fade-in">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">{error}</p>
              <p className="text-xs text-red-400 mt-0.5">Double-check the ID and try again, or contact support.</p>
            </div>
          </div>
        )}

        {/* Order result */}
        {order && (
          <div className="space-y-5 animate-fade-in-up">
            {/* Status header */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Order ID</p>
                  <p className="font-mono font-bold text-slate-900 text-sm">{order.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
              </div>

              {/* Progress timeline */}
              {order.status !== 'CANCELLED' && (
                <div className="relative">
                  {/* Track line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-primary to-primary-dark transition-all duration-700"
                    style={{ width: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
                  />

                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map(({ key, label, icon: Icon }, i) => {
                      const done    = i <= currentStep
                      const current = i === currentStep
                      return (
                        <div key={key} className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                            done
                              ? 'bg-primary shadow-lg shadow-primary/30'
                              : 'bg-white border-2 border-slate-200'
                          } ${current ? 'ring-4 ring-primary/20' : ''}`}>
                            <Icon size={14} className={done ? 'text-white' : 'text-slate-300'} />
                          </div>
                          <span className={`text-[10px] font-semibold text-center max-w-[60px] leading-tight ${
                            done ? 'text-primary' : 'text-slate-400'
                          }`}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tracking URL */}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-5 flex items-center gap-2 px-4 py-3 bg-primary-bg text-primary rounded-2xl text-sm font-semibold hover:bg-green-100 transition-colors cursor-pointer">
                  <Truck size={15} /> Track live on Pathao
                  <ExternalLink size={13} className="ml-auto" />
                </a>
              )}
            </div>

            {/* Delivery info */}
            <div className="glass-card p-6">
              <h3 className="font-heading font-bold text-slate-900 mb-4">Delivery Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">{order.name}</p>
                    <p className="text-slate-500">{order.address}, {order.city}</p>
                    <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {order.phone}
                    </p>
                  </div>
                </div>
                {order.shippingOption && (
                  <div className="flex items-center gap-3">
                    <Truck size={15} className="text-primary shrink-0" />
                    <span className="text-slate-600">{order.shippingOption}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock size={15} className="text-primary shrink-0" />
                  <span className="text-slate-500">Placed on {formatDate(order.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="glass-card p-6">
              <h3 className="font-heading font-bold text-slate-900 mb-4">
                Items ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-slate-700 truncate max-w-[200px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery</span><span>{formatPrice(order.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total</span><span className="text-primary">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-0.5">
                  <span>Payment</span>
                  <span className={order.paymentStatus === 'PAID' ? 'text-green-600 font-semibold' : ''}>
                    {order.paymentMethod} · {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/account/orders"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer">
                View all orders <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

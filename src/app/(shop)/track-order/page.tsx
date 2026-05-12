'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Truck, Package, Search, CheckCircle, Clock, AlertCircle,
  MapPin, Phone, ArrowRight, Loader2, ExternalLink, RefreshCw,
  MessageCircle, Mail, User as UserIcon,
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ACTIVE_STATES } from '@/lib/tracking-shared'

interface OrderItem { name: string; quantity: number; price: number; image?: string | null }
interface Order {
  id: string; status: string; paymentStatus: string; paymentMethod: string
  total: number; subtotal: number; deliveryCharge: number
  name: string; phone: string; address: string; city: string
  shippingOption?: string | null; trackingUrl?: string | null; pathaoOrderId?: string | null
  createdAt: string; items: OrderItem[]
}

interface CarrierStatus {
  provider: 'PATHAO' | 'PICKNDROP' | null
  label:    string | null
  liveStatus:  string | null
  mappedStage: number
  eta:         string | null
  rider:       { name: string; phone: string } | null
  events:      { at: string; label: string }[]
  trackingUrl: string | null
  fetchedAt:   string
  error:       string | null
  isMock:      boolean
}

type LookupMode = 'id' | 'phone'

const STATUS_STEPS = [
  { label: 'Placed',      icon: Package     },
  { label: 'Confirmed',   icon: CheckCircle },
  { label: 'Processing',  icon: Clock       },
  { label: 'Shipped',     icon: Truck       },
  { label: 'Delivered',   icon: CheckCircle },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

function relativeTime(iso: string) {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function TrackOrderPage() {
  const [mode,    setMode]    = useState<LookupMode>('id')
  const [orderId, setOrderId] = useState('')
  const [phone,   setPhone]   = useState('')
  const [last4,   setLast4]   = useState('')
  const [loading, setLoading] = useState(false)
  const [order,   setOrder]   = useState<Order | null>(null)
  const [carrier, setCarrier] = useState<CarrierStatus | null>(null)
  const [error,   setError]   = useState('')
  const [tick,    setTick]    = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const lookup = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const params = new URLSearchParams()
      if (mode === 'id') {
        if (!orderId.trim()) return
        params.set('id', orderId.trim())
      } else {
        if (!phone.trim())   return
        params.set('phone', phone.trim())
        if (last4.trim()) params.set('id', last4.trim())
      }
      const res  = await fetch(`/api/orders/track?${params}`)
      const data = await res.json()
      if (!res.ok) {
        if (!silent) setError(data.error ?? 'Order not found')
        return
      }
      setOrder(data.order)
      setCarrier(data.carrier ?? null)
    } catch {
      if (!silent) setError('Could not connect to server. Please try again.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [mode, orderId, phone, last4])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void lookup(false)
  }

  // Auto-refresh every 30s while order is in active states
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (!order || !ACTIVE_STATES.has(order.status)) return
    pollRef.current = setInterval(() => void lookup(true), 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [order, lookup])

  // Re-render every 10s so "12s ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const stage = carrier ? carrier.mappedStage : -1
  const isCancelled = order?.status === 'CANCELLED'

  return (
    <div className="min-h-screen py-12"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 50%, #F0FDF4 100%)' }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 left-0 w-80 h-80" style={{ background: '#8B5CF6', opacity: 0.10 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-1/3 right-0 w-64 h-64" style={{ background: '#06B6D4', opacity: 0.08 }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-0 left-1/3 w-72 h-72" style={{ background: '#EC4899', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 glass-card rounded-3xl mb-5">
            <Truck size={28} className="text-primary" />
          </div>
          <h1 className="font-heading font-extrabold text-4xl text-slate-900">Track Your Order</h1>
          <p className="text-slate-500 mt-3 text-sm">Live updates from {carrier?.label ?? 'our delivery partners'}</p>
        </div>

        {/* Lookup tabs + form */}
        <div className="glass-card p-5 mb-6 animate-fade-in-up delay-100">
          <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 mb-4">
            <button type="button" onClick={() => setMode('id')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                mode === 'id' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Order ID
            </button>
            <button type="button" onClick={() => setMode('phone')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                mode === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Phone Number
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'id' ? (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
                    placeholder="Enter Order ID (e.g. cma1x2y3…)"
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
                <button type="submit" disabled={loading || !orderId.trim()}
                  className="flex items-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer whitespace-nowrap">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Track
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative col-span-2">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                  </div>
                  <input
                    type="text" value={last4} onChange={e => setLast4(e.target.value)} maxLength={6}
                    placeholder="Last 4–6"
                    className="px-3 py-3.5 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-center font-mono"
                  />
                </div>
                <button type="submit" disabled={loading || !phone.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Find my order
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Last 4 of order ID is optional — without it we&apos;ll show your most recent order.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-5 mb-6 flex items-start gap-3 border border-red-100 animate-fade-in">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">{error}</p>
              <p className="text-xs text-red-400 mt-0.5">Double-check the input and try again, or contact support.</p>
            </div>
          </div>
        )}

        {/* Result */}
        {order && (
          <div className="space-y-5 animate-fade-in-up">
            {/* Status header */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Order ID</p>
                  <p className="font-mono font-bold text-slate-900 text-sm break-all">{order.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
              </div>

              {/* Timeline */}
              {!isCancelled && (
                <div className="relative">
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-primary to-primary-dark transition-all duration-700"
                    style={{ width: stage >= 0 ? `calc(${(stage / (STATUS_STEPS.length - 1)) * 100}% - ${stage * 0.5}rem)` : '0%' }}
                  />
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map(({ label, icon: Icon }, i) => {
                      const done    = i <= stage
                      const current = i === stage
                      return (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                            done ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-white border-2 border-slate-200'
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
            </div>

            {/* Live carrier card */}
            {carrier && carrier.provider && (
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center shrink-0">
                    <Truck size={17} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm">Delivered by {carrier.label}</p>
                      {carrier.isMock && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">Test</span>
                      )}
                    </div>
                    {carrier.liveStatus && (
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{carrier.liveStatus}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => void lookup(true)} aria-label="Refresh"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors">
                    <RefreshCw size={14} className="text-slate-500" />
                  </button>
                </div>

                {/* ETA / rider */}
                {(carrier.eta || carrier.rider) && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    {carrier.eta && (
                      <div className="flex items-start gap-2.5">
                        <Clock size={14} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ETA</p>
                          <p className="text-sm font-semibold text-slate-800">{carrier.eta}</p>
                        </div>
                      </div>
                    )}
                    {carrier.rider && (
                      <div className="flex items-start gap-2.5">
                        <UserIcon size={14} className="text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rider</p>
                          <p className="text-sm font-semibold text-slate-800 truncate">{carrier.rider.name}</p>
                          <a href={`tel:${carrier.rider.phone}`} className="text-xs text-primary hover:underline">{carrier.rider.phone}</a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Updated indicator */}
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5" aria-live="polite">
                  <span key={tick} className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Updated {relativeTime(carrier.fetchedAt)}
                  {ACTIVE_STATES.has(order.status) && <span className="text-slate-300">· auto-refresh on</span>}
                </p>

                {carrier.error && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Couldn&apos;t reach {carrier.label}: {carrier.error.slice(0, 120)}. Showing internal status.
                  </p>
                )}

                {/* Live tracking URL */}
                {carrier.trackingUrl && (
                  <a href={carrier.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-primary-bg text-primary rounded-2xl text-sm font-semibold hover:bg-primary/15 transition-colors cursor-pointer">
                    <Truck size={15} /> Open live map on {carrier.label}
                    <ExternalLink size={13} className="ml-auto" />
                  </a>
                )}
              </div>
            )}

            {/* Event log */}
            {carrier && carrier.events.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-heading font-bold text-slate-900 text-sm mb-4">Live updates</h3>
                <ol className="relative pl-5 space-y-3">
                  <span className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" aria-hidden="true" />
                  {carrier.events.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`} />
                      <p className="text-sm text-slate-800 capitalize">{ev.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(ev.at)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Delivery details */}
            <div className="glass-card p-6">
              <h3 className="font-heading font-bold text-slate-900 mb-4">Delivery details</h3>
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
              <h3 className="font-heading font-bold text-slate-900 mb-4">Items ({order.items.length})</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-slate-700 truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 shrink-0 ml-2">{formatPrice(item.price * item.quantity)}</span>
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

            {/* Need help */}
            <NeedHelpCard order={order} />

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

// ── Need help card ─────────────────────────────────────────────────────────────

function NeedHelpCard({ order }: { order: Order }) {
  const [whatsapp, setWhatsapp] = useState<string>('')
  const [storePhone, setStorePhone] = useState<string>('')
  const [storeEmail, setStoreEmail] = useState<string>('')

  useEffect(() => {
    fetch('/api/store-config').then(r => r.json()).then(d => {
      setWhatsapp(String(d.WHATSAPP_NUMBER ?? d.STORE_PHONE ?? ''))
      setStorePhone(String(d.STORE_PHONE ?? ''))
      setStoreEmail(String(d.STORE_EMAIL ?? ''))
    }).catch(() => {})
  }, [])

  const waMsg = encodeURIComponent(
    `Hi! I need help with order #${order.id.slice(-8)} (status: ${order.status}).`,
  )
  const waPhone = whatsapp.replace(/\D/g, '')

  return (
    <div className="glass-card p-5">
      <h3 className="font-heading font-bold text-slate-900 text-sm mb-3">Need help with this order?</h3>
      <div className="grid grid-cols-3 gap-2">
        {waPhone && (
          <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer">
            <MessageCircle size={16} className="text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-700">WhatsApp</span>
          </a>
        )}
        {storePhone && (
          <a href={`tel:${storePhone}`}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <Phone size={16} className="text-blue-600" />
            <span className="text-[11px] font-bold text-blue-700">Call</span>
          </a>
        )}
        {storeEmail && (
          <a href={`mailto:${storeEmail}?subject=Order ${order.id.slice(-8)}`}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-violet-50 hover:bg-violet-100 transition-colors cursor-pointer">
            <Mail size={16} className="text-violet-600" />
            <span className="text-[11px] font-bold text-violet-700">Email</span>
          </a>
        )}
      </div>
    </div>
  )
}

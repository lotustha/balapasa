'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, ShoppingBag, Package, Truck, CheckCircle2, Clock, AlertCircle,
  ArrowLeft, Phone, MessageCircle, ChevronDown, ChevronRight, MapPin, Loader2,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { friendlyStatusLabel } from '@/lib/pnd-status-labels'

// ── Shapes ─────────────────────────────────────────────────────────────────

interface OrderItem { name: string; image: string | null; quantity: number; price: number }
interface OrderStatusLog {
  id: string; source: string; rawStatus: string; mappedStatus: string | null
  comment: string | null; epodUrl: string | null; createdAt: string
}
interface OrderDetail {
  id: string; orderCode: string | null
  status: string; paymentStatus: string; paymentMethod: string
  total: number; subtotal: number; deliveryCharge: number
  shippingOption: string | null; shippingProvider: string | null
  createdAt: string
  items: OrderItem[]
  address: string
  customerName: string
  logs: OrderStatusLog[]
}
interface OrderSummary {
  id: string; orderCode: string | null
  status: string; paymentStatus: string
  total: number; createdAt: string
  shippingOption: string | null
  firstImage: string | null
  firstItem: string | null
  itemCount: number
}

type Mode = 'code' | 'phone'
type View =
  | { kind: 'lookup' }
  | { kind: 'list'; orders: OrderSummary[]; phone: string }
  | { kind: 'detail'; order: OrderDetail; fromList: boolean }

const STATUS_PILL: Record<string, string> = {
  PENDING:    'bg-slate-100 text-slate-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}
const PAYMENT_PILL: Record<string, string> = {
  UNPAID:   'bg-amber-50 text-amber-700',
  PAID:     'bg-green-50 text-green-700',
  REFUNDED: 'bg-blue-50 text-blue-700',
  FAILED:   'bg-red-50 text-red-700',
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TrackOrderPage() {
  const [view, setView]       = useState<View>({ kind: 'lookup' })
  const [mode, setMode]       = useState<Mode>('code')
  const [query, setQuery]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const value = query.trim()

    if (mode === 'code') {
      if (!value) { setError('Enter your order code.'); return }
      setSubmitting(true)
      try {
        const res = await fetch(`/api/track?code=${encodeURIComponent(value)}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Order not found.'); return }
        setView({ kind: 'detail', order: json.order, fromList: false })
      } catch {
        setError('Could not reach our server. Please try again.')
      } finally { setSubmitting(false) }
      return
    }

    // phone mode
    const digits = value.replace(/\D/g, '')
    if (digits.length < 7) { setError('Enter at least 7 digits of your phone number.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/track?phone=${encodeURIComponent(digits)}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Lookup failed.'); return }
      if (!json.orders || json.orders.length === 0) {
        setError('No orders found for that phone number.')
        return
      }
      setView({ kind: 'list', orders: json.orders, phone: digits })
    } catch {
      setError('Could not reach our server. Please try again.')
    } finally { setSubmitting(false) }
  }

  async function openOrder(code: string) {
    setSubmitting(true); setError(null)
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(code)}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Order not found.'); return }
      setView(v => ({ kind: 'detail', order: json, fromList: v.kind === 'list' }))
    } catch {
      setError('Could not reach our server. Please try again.')
    } finally { setSubmitting(false) }
  }

  function back() {
    setError(null)
    setView(v => {
      if (v.kind === 'detail' && v.fromList) return { kind: 'lookup' }
      return { kind: 'lookup' }
    })
    setQuery('')
  }

  return (
    <div className="min-h-screen pt-6 pb-16 relative" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 35%, #FFF0F9 65%, #F0FDF4 100%)' }}>
      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 -left-20 w-[400px] h-[400px]"
          style={{ background: '#8B5CF6', opacity: 0.18 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-1/4 -right-10 w-[320px] h-[320px]"
          style={{ background: '#06B6D4', opacity: 0.15 }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-20 left-1/3 w-[360px] h-[360px]"
          style={{ background: '#EC4899', opacity: 0.13 }} />
        <div className="blob animate-blob-morph animate-blob-float-a absolute top-1/2 right-1/4 w-[260px] h-[260px]"
          style={{ background: '#10B981', opacity: 0.12 }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">

        {view.kind === 'lookup' && (
          <LookupView
            mode={mode}
            setMode={(m) => { setMode(m); setError(null); setQuery('') }}
            query={query}
            setQuery={setQuery}
            error={error}
            submitting={submitting}
            onSubmit={submit}
          />
        )}

        {view.kind === 'list' && (
          <ListView
            phone={view.phone}
            orders={view.orders}
            onBack={back}
            onOpen={openOrder}
          />
        )}

        {view.kind === 'detail' && (
          <DetailView
            order={view.order}
            fromList={view.fromList}
            onBack={back}
            onRefresh={fresh => setView({ kind: 'detail', order: fresh, fromList: view.fromList })}
          />
        )}

      </div>
    </div>
  )
}

// ── Lookup view ────────────────────────────────────────────────────────────

function LookupView({ mode, setMode, query, setQuery, error, submitting, onSubmit }: {
  mode: Mode; setMode: (m: Mode) => void
  query: string; setQuery: (v: string) => void
  error: string | null; submitting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="pt-6 sm:pt-12 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-5 shadow-lg shadow-primary/20"
          style={{ background: 'linear-gradient(135deg, #16A34A, #06B6D4)' }}>
          <Package size={28} className="text-white" strokeWidth={2.2} />
        </div>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-primary mb-2">Track your order</p>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900 leading-tight">
          Where&apos;s my package?
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
          Type your order code or the phone number you used at checkout — we&apos;ll show you the full journey, live.
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass-card p-5 sm:p-7" aria-label="Order lookup">

        <div className="inline-flex p-1 bg-slate-100/80 rounded-2xl mb-5" role="tablist" aria-label="Lookup mode">
          {(['code', 'phone'] as const).map(m => (
            <button key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors min-h-[36px] ${
                mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {m === 'code' ? 'Order code' : 'Phone number'}
            </button>
          ))}
        </div>

        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="track-input">
          {mode === 'code' ? 'Order code' : 'Phone number'}
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="track-input"
            type={mode === 'phone' ? 'tel' : 'text'}
            inputMode={mode === 'phone' ? 'tel' : 'text'}
            autoComplete={mode === 'phone' ? 'tel' : 'off'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'code' ? 'e.g. BLP-AIRP-123-0001' : 'e.g. 98XXXXXXXX'}
            className="w-full pl-11 pr-4 py-4 rounded-2xl text-base border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(8px)' }}
            aria-describedby={error ? 'lookup-error' : undefined}
          />
        </div>

        {error && (
          <div id="lookup-error" role="alert" className="mt-3 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs font-semibold text-red-700 leading-snug">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !query.trim()}
          className="w-full mt-5 flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/20 min-h-[52px]">
          {submitting
            ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Looking up…</>
            : <>Track order <ChevronRight size={16} aria-hidden="true" /></>}
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          We don&apos;t share tracking with carriers — your status is updated automatically as the rider moves.
        </p>
      </form>

      <p className="text-center text-xs text-slate-400 mt-6">
        New here? <Link href="/products" className="font-semibold text-primary hover:text-primary-dark underline-offset-2 hover:underline">Browse the shop →</Link>
      </p>
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────

function ListView({ phone, orders, onBack, onOpen }: {
  phone: string; orders: OrderSummary[]
  onBack: () => void; onOpen: (code: string) => void
}) {
  const masked = phone.length > 4 ? `••• ${phone.slice(-4)}` : phone

  const inProgress = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recent = orders.filter(o => (o.status === 'DELIVERED' || o.status === 'CANCELLED') && new Date(o.createdAt).getTime() >= ninetyDaysAgo)
  const older  = orders.filter(o => (o.status === 'DELIVERED' || o.status === 'CANCELLED') && new Date(o.createdAt).getTime() < ninetyDaysAgo)

  return (
    <div className="animate-fade-in">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer mb-5 transition-colors">
        <ArrowLeft size={13} aria-hidden="true" /> Different phone or code
      </button>

      <div className="glass-card p-5 sm:p-6 mb-5">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Orders matching</p>
        <h1 className="font-heading font-extrabold text-2xl text-slate-900">Phone {masked}</h1>
        <p className="text-xs text-slate-500 mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} in the last 90+ days</p>
      </div>

      {inProgress.length > 0 && (
        <Section title="In progress" subtitle="These are still on their way." defaultOpen forceOpen>
          <div className="space-y-3">
            {inProgress.map(o => <OrderListCard key={o.id} order={o} onOpen={onOpen} />)}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Recent" subtitle="Last 90 days." defaultOpen>
          <div className="space-y-3">
            {recent.map(o => <OrderListCard key={o.id} order={o} onOpen={onOpen} />)}
          </div>
        </Section>
      )}

      {older.length > 0 && (
        <Section title="Older" subtitle={`${older.length} order${older.length !== 1 ? 's' : ''} older than 90 days.`} defaultOpen={false}>
          <div className="space-y-3">
            {older.map(o => <OrderListCard key={o.id} order={o} onOpen={onOpen} />)}
          </div>
        </Section>
      )}

      {inProgress.length === 0 && recent.length === 0 && older.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Package size={32} className="text-slate-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600">No orders found.</p>
          <p className="text-xs text-slate-400 mt-1">Try a different phone number or use your order code.</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, subtitle, defaultOpen, forceOpen, children }: {
  title: string; subtitle: string
  defaultOpen: boolean; forceOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = forceOpen || open
  return (
    <div className="mb-5">
      <button type="button"
        onClick={() => !forceOpen && setOpen(o => !o)}
        disabled={forceOpen}
        className="w-full flex items-center justify-between gap-3 px-1 py-2 cursor-pointer disabled:cursor-default group"
        aria-expanded={isOpen}>
        <div className="text-left min-w-0">
          <h2 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            {title}
            {forceOpen && <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Active</span>}
          </h2>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
        {!forceOpen && (
          <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 group-hover:text-slate-600 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  )
}

function OrderListCard({ order, onOpen }: { order: OrderSummary; onOpen: (code: string) => void }) {
  const code = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
  return (
    <button type="button" onClick={() => onOpen(code)}
      className="w-full text-left glass-card p-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-white/80">
          {order.firstImage ? (
            <Image src={order.firstImage} alt="" fill className="object-cover" sizes="64px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag size={20} className="text-slate-300" aria-hidden="true" /></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono font-bold text-sm text-slate-900">{code}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_PILL[order.status] ?? 'bg-slate-100 text-slate-700'}`}>
              {order.status}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_PILL[order.paymentStatus] ?? 'bg-slate-50 text-slate-600'}`}>
              {order.paymentStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {order.firstItem ?? 'Order'}{order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ''}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock size={10} aria-hidden="true" /> {timeAgo(order.createdAt)}
            </p>
            <p className="font-bold text-sm text-primary">{formatPrice(order.total)}</p>
          </div>
        </div>

        <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1 group-hover:text-primary transition-colors" aria-hidden="true" />
      </div>
    </button>
  )
}

// ── Detail view (with 30s polling) ─────────────────────────────────────────

function DetailView({ order: initialOrder, fromList, onBack, onRefresh }: {
  order: OrderDetail; fromList: boolean; onBack: () => void
  onRefresh: (fresh: OrderDetail) => void
}) {
  const [order, setOrder] = useState<OrderDetail>(initialOrder)
  useEffect(() => { setOrder(initialOrder) }, [initialOrder])

  const code = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
  const lastLog = order.logs[order.logs.length - 1]
  const lastUpdate = lastLog?.createdAt ?? order.createdAt

  // 30s polling — paused when tab hidden, cancelled on unmount.
  const abortRef = useRef<AbortController | null>(null)
  const pollOnce = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(code)}`, { signal: ctrl.signal, cache: 'no-store' })
      if (!res.ok) return
      const fresh = await res.json() as OrderDetail
      // Only update if the timeline grew or status changed — avoids needless re-renders.
      if (fresh.logs.length !== order.logs.length || fresh.status !== order.status || fresh.paymentStatus !== order.paymentStatus) {
        setOrder(fresh)
        onRefresh(fresh)
      }
    } catch { /* aborted or network */ }
  }, [code, order.logs.length, order.status, order.paymentStatus, onRefresh])

  useEffect(() => {
    const interval = setInterval(pollOnce, 30_000)
    const onVis = () => { if (document.visibilityState === 'visible') pollOnce() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
      abortRef.current?.abort()
    }
  }, [pollOnce])

  return (
    <div className="animate-fade-in">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer mb-4 transition-colors">
        <ArrowLeft size={13} aria-hidden="true" /> {fromList ? 'All orders for this phone' : 'Track another'}
      </button>

      {/* Hero */}
      <div className="glass-card p-5 sm:p-6 mb-5">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Order</p>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 font-mono break-all">{code}</h1>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_PILL[order.status] ?? 'bg-slate-100 text-slate-700'}`}>
            {order.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${PAYMENT_PILL[order.paymentStatus] ?? 'bg-slate-50 text-slate-600'}`}>
            {order.paymentStatus}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
            <Clock size={11} aria-hidden="true" /> Last update {timeAgo(lastUpdate)}
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Total <span className="font-bold text-slate-900 ml-1">{formatPrice(order.total)}</span>
          <span className="mx-2 text-slate-300">·</span>
          {order.shippingOption ?? 'Delivery'}
        </p>
      </div>

      {/* Timeline */}
      <div className="glass-card p-5 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            <Truck size={15} className="text-primary" aria-hidden="true" /> Status timeline
          </h2>
          <span className="text-[10px] text-slate-400">auto-updates every 30s</span>
        </div>

        {order.logs.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={24} className="text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-600">No updates yet.</p>
            <p className="text-xs text-slate-400 mt-1">We&apos;ll log every step here the moment it happens.</p>
          </div>
        ) : (
          <ol className="relative">
            {[...order.logs].reverse().map((log, i, all) => (
              <TimelineItem key={log.id} log={log} isFirst={i === 0} isLast={i === all.length - 1} />
            ))}
          </ol>
        )}
      </div>

      {/* Items */}
      <div className="glass-card p-5 sm:p-6 mb-5">
        <h2 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
          <ShoppingBag size={15} className="text-primary" aria-hidden="true" /> Items ({order.items.length})
        </h2>
        <div className="space-y-3">
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-white/80">
                {it.image ? <Image src={it.image} alt="" fill className="object-cover" sizes="56px" />
                  : <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag size={18} className="text-slate-300" aria-hidden="true" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                <p className="text-[11px] text-slate-400">Qty {it.quantity}</p>
              </div>
              <p className="text-sm font-bold text-slate-700 shrink-0">{formatPrice(it.price * it.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span><span className="font-semibold text-slate-700">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Delivery</span>
            <span className={`font-semibold ${order.deliveryCharge > 0 ? 'text-slate-700' : 'text-green-600'}`}>
              {order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : 'Free'}
            </span>
          </div>
          <div className="flex justify-between font-bold pt-1.5 border-t border-slate-50">
            <span className="text-slate-700">Total</span><span className="text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="glass-card p-5 sm:p-6 mb-5">
        <h2 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <MapPin size={15} className="text-primary" aria-hidden="true" /> Delivery to
        </h2>
        <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{order.address}</p>
      </div>

      {/* Help */}
      <div className="glass-card p-5 sm:p-6">
        <h2 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <MessageCircle size={15} className="text-primary" aria-hidden="true" /> Need help?
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          We&apos;ll always have the latest status here. If something looks wrong, ping us — we&apos;ll sort it out fast.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="https://wa.me/9779800000000"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-green-500/20 min-h-[44px]">
            <MessageCircle size={15} aria-hidden="true" /> WhatsApp
          </a>
          <a href="tel:+9779800000000"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold cursor-pointer transition-colors min-h-[44px]">
            <Phone size={15} aria-hidden="true" /> Call store
          </a>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ log, isFirst, isLast }: { log: OrderStatusLog; isFirst: boolean; isLast: boolean }) {
  const friendly = friendlyStatusLabel(log.rawStatus)
  const when = new Date(log.createdAt)
  const timeStr = when.toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <li className="relative pl-10 pb-5 last:pb-0">
      {!isLast && <span className="absolute left-[15px] top-7 bottom-0 w-0.5 bg-slate-200" aria-hidden="true" />}
      <span aria-hidden="true"
        className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-base ${
          isFirst ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 text-slate-500'
        }`}>
        {friendly.icon}
      </span>
      <div className="pt-0.5">
        <p className={`text-sm font-bold ${isFirst ? 'text-slate-900' : 'text-slate-700'}`}>{friendly.label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
          <Clock size={10} aria-hidden="true" /> {timeStr}
          {log.source !== 'PICKNDROP' && log.source !== 'SYSTEM' && (
            <span className="text-[10px] text-slate-300 uppercase tracking-wider">· {log.source.toLowerCase()}</span>
          )}
        </p>
        {log.comment && (
          <p className="mt-1.5 text-[12px] text-slate-600 italic leading-relaxed border-l-2 border-slate-200 pl-3">
            &ldquo;{log.comment}&rdquo;
          </p>
        )}
        {log.epodUrl && (
          <div className="mt-2 relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200">
            <Image src={log.epodUrl} alt="Proof of delivery" fill className="object-cover" sizes="128px" unoptimized />
          </div>
        )}
        {isFirst && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <CheckCircle2 size={10} aria-hidden="true" /> Latest
          </p>
        )}
      </div>
    </li>
  )
}

// ── Utilities ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const now  = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins} min${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)   return `${days} day${days !== 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-NP', { dateStyle: 'medium' })
}

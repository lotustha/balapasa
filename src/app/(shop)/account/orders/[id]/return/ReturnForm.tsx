'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, ArrowLeft, AlertCircle, CheckCircle, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderItem { id: string; name: string; quantity: number; price: number; image: string | null }

interface ExistingReturn {
  id:           string
  status:       string
  reason:       string
  customerNote: string | null
  adminNote:    string | null
  refundAmount: number
  createdAt:    string
  items:        Array<{ orderItemId: string; quantity: number }>
}

const REASONS = [
  { value: 'DAMAGED',          label: 'Damaged or defective' },
  { value: 'WRONG_ITEM',       label: 'Received the wrong item' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CHANGED_MIND',     label: 'Changed my mind' },
  { value: 'OTHER',            label: 'Other' },
] as const

const STATUS_PILL: Record<string, string> = {
  REQUESTED:             'bg-blue-100 text-blue-700',
  APPROVED:              'bg-green-100 text-green-700',
  REJECTED:              'bg-red-100 text-red-700',
  RECEIVED:              'bg-purple-100 text-purple-700',
  REFUNDED:              'bg-emerald-100 text-emerald-700',
  CANCELLED_BY_CUSTOMER: 'bg-slate-100 text-slate-600',
}

interface Props {
  orderId:     string
  items:       OrderItem[]
  existing:    ExistingReturn | null
  eligibility: { ok: true } | { ok: false; reason: string }
}

export default function ReturnForm({ orderId, items, existing, eligibility }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const it of items) init[it.id] = 0
    return init
  })
  const [reason,  setReason]  = useState<typeof REASONS[number]['value']>('DAMAGED')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  const totalRefund = useMemo(
    () => items.reduce((s, it) => s + it.price * (selected[it.id] ?? 0), 0),
    [items, selected],
  )
  const anySelected = Object.values(selected).some(q => q > 0)

  function setQty(itemId: string, qty: number) {
    setSelected(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(qty, items.find(i => i.id === itemId)?.quantity ?? 0)) }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!anySelected) { setError('Select at least one item to return.'); return }
    setSaving(true)
    try {
      const payload = {
        items: items.filter(i => (selected[i.id] ?? 0) > 0).map(i => ({ orderItemId: i.id, quantity: selected[i.id] })),
        reason,
        customerNote: note.trim() || undefined,
      }
      const res = await fetch(`/api/account/orders/${orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? `Failed (HTTP ${res.status})`); return }
      setDone(true)
      setTimeout(() => router.refresh(), 800)
    } catch {
      setError('Network error — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelExisting() {
    if (!existing) return
    if (!confirm('Cancel this return request?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/account/orders/${orderId}/return`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? 'Failed'); return }
      router.refresh()
    } finally {
      setCancelling(false)
    }
  }

  // ── Already-filed view ──────────────────────────────────────────────────
  if (existing) {
    const isTerminal = existing.status === 'REJECTED' || existing.status === 'REFUNDED' || existing.status === 'CANCELLED_BY_CUSTOMER'
    return (
      <div className="space-y-5">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_PILL[existing.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {existing.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-700">
            Refund value: <strong>{formatPrice(existing.refundAmount)}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-1">Reason: {existing.reason.replace(/_/g, ' ').toLowerCase()}</p>
          {existing.customerNote && (
            <p className="text-xs text-slate-500 mt-2"><strong>Your note:</strong> {existing.customerNote}</p>
          )}
          {existing.adminNote && (
            <p className="text-xs text-slate-700 mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <strong>From us:</strong> {existing.adminNote}
            </p>
          )}
        </div>

        {existing.status === 'REQUESTED' && (
          <button type="button" onClick={cancelExisting} disabled={cancelling}
            className="w-full py-3 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 cursor-pointer disabled:opacity-50">
            {cancelling ? 'Cancelling…' : 'Cancel this return request'}
          </button>
        )}

        {isTerminal && (
          <p className="text-center text-xs text-slate-500">
            This return is closed. If you need to start a new one, contact support.
          </p>
        )}

        <Link href="/account/orders"
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>
    )
  }

  // ── Window expired ──────────────────────────────────────────────────────
  if (!eligibility.ok) {
    return (
      <div className="space-y-5">
        <div className="glass-card p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-900">{eligibility.reason}</p>
            <p className="text-xs text-slate-500 mt-1">
              If this is a defective item or you got the wrong product, reply to your order confirmation email and we&apos;ll look at it case-by-case.
            </p>
          </div>
        </div>
        <Link href="/account/orders"
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>
    )
  }

  // ── Happy path: file a new return ───────────────────────────────────────
  if (done) {
    return (
      <div className="glass-card p-6 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-900">Return request received.</p>
          <p className="text-xs text-slate-500">We&apos;ve sent you a confirmation. Admin will review within a business day.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="glass-card p-4 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Items</p>
        <div className="space-y-3">
          {items.map(it => {
            const qty = selected[it.id] ?? 0
            return (
              <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-white/80">
                  {it.image
                    ? <Image src={it.image} alt="" fill className="object-cover" sizes="56px" />
                    : <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag size={18} className="text-slate-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                  <p className="text-[11px] text-slate-400">Ordered ×{it.quantity} · {formatPrice(it.price)} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setQty(it.id, qty - 1)} disabled={qty <= 0}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-30">−</button>
                  <span className="w-6 text-center font-bold text-sm">{qty}</span>
                  <button type="button" onClick={() => setQty(it.id, qty + 1)} disabled={qty >= it.quantity}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-30">+</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value as typeof reason)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer">
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Notes <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span></label>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 1000))} rows={3}
            placeholder="Anything we should know? (e.g. which side was damaged)"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none" />
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Estimated refund</p>
          <p className="text-2xl font-extrabold text-primary mt-1">{formatPrice(totalRefund)}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/account/orders"
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          type="submit"
          disabled={saving || !anySelected}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-primary/20 cursor-pointer"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Filing…</> : 'File return'}
        </button>
      </div>
    </form>
  )
}

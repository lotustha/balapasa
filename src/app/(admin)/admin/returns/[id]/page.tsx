'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, PackageCheck, Banknote, AlertCircle, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderItem { id: string; name: string; image: string | null; quantity: number; price: number }
interface OrderLite {
  id:            string
  orderCode:     string | null
  name:          string
  phone?:        string | null
  email?:        string | null
  address?:      string | null
  city?:         string | null
  paymentMethod: string
  paymentStatus: string
  total:         number
  subtotal:      number
  createdAt:     string
  items:         OrderItem[]
}
interface ReturnItem { id: string; orderItemId: string; quantity: number; lineRefundAmount: number }
interface ReturnDetail {
  id:            string
  orderId:       string
  status:        string
  reason:        string
  customerNote:  string | null
  adminNote:     string | null
  refundAmount:  number
  createdAt:     string
  approvedAt:    string | null
  receivedAt:    string | null
  rejectedAt:    string | null
  refundedAt:    string | null
  items:         ReturnItem[]
  order:         OrderLite | null
}

const STATUS_CLS: Record<string, string> = {
  REQUESTED:             'bg-amber-100 text-amber-700',
  APPROVED:              'bg-blue-100 text-blue-700',
  RECEIVED:              'bg-indigo-100 text-indigo-700',
  REFUNDED:              'bg-green-100 text-green-700',
  REJECTED:              'bg-red-100 text-red-700',
  CANCELLED_BY_CUSTOMER: 'bg-slate-100 text-slate-600',
}

// Mirror the FSM in the PATCH handler so we never show a button that the
// server would reject.
const NEXT_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED:  ['RECEIVED'],
  RECEIVED:  ['REFUNDED'],
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminReturnDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const [data, setData]         = useState<ReturnDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [pending, setPending]   = useState<string | null>(null)
  const [adminNote, setNote]    = useState('')
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/returns/${id}`, { cache: 'no-store' })
      if (!res.ok) { setError('Not found'); return }
      const d = await res.json() as ReturnDetail
      setData(d)
      setNote(d.adminNote ?? '')
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function transition(target: string) {
    if (!data) return
    if (target === 'REJECTED' && !adminNote.trim()) {
      alert('Please add a note explaining why you are rejecting this return — the customer sees it in their email.')
      return
    }
    if (target === 'REFUNDED' && !confirm(`Mark this return as REFUNDED? This sets paymentStatus on the order to REFUNDED and notifies the customer.`)) return

    setPending(target)
    setError(null)
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: target, adminNote: adminNote.trim() || undefined }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Transition failed')
      } else {
        await load()
      }
    } catch {
      setError('Transition failed')
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <Link href="/admin/returns" className="text-sm text-primary font-bold flex items-center gap-1.5 mb-4 hover:underline"><ArrowLeft size={14}/> Back to returns</Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{error ?? 'Return not found'}</div>
      </div>
    )
  }

  const order      = data.order
  const orderCode  = order?.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const totalQty   = data.items.reduce((s, i) => s + i.quantity, 0)
  // Map orderItem ids to the actual order line for image / name display.
  const orderItemById = new Map(order?.items.map(i => [i.id, i]) ?? [])
  const nextSteps   = NEXT_TRANSITIONS[data.status] ?? []

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-5">
      <Link href="/admin/returns" className="text-sm text-primary font-bold flex items-center gap-1.5 hover:underline w-fit"><ArrowLeft size={14}/> Back to returns</Link>

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-primary text-base">#{orderCode}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${STATUS_CLS[data.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {data.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="font-heading text-xl font-extrabold text-slate-900 mt-1">{order?.name ?? 'Customer'}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {totalQty} item{totalQty !== 1 ? 's' : ''} · filed {fmtDate(data.createdAt)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Refund</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatPrice(data.refundAmount)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Order total {formatPrice(order?.total ?? 0)}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14}/> {error}
        </div>
      )}

      {/* Customer + reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Customer</p>
          <p className="text-sm font-bold text-slate-900">{order?.name ?? '—'}</p>
          {order?.email && <p className="text-xs text-slate-500">{order.email}</p>}
          {order?.phone && <p className="text-xs text-slate-500">{order.phone}</p>}
          {order?.paymentMethod && (
            <p className="text-[11px] text-slate-400 mt-1">
              Paid by <span className="font-semibold text-slate-600">{order.paymentMethod}</span>
              {' · '}
              <span className="font-semibold text-slate-600">{order.paymentStatus}</span>
            </p>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Reason</p>
          <p className="text-sm font-bold text-slate-900 capitalize">{data.reason.replace(/_/g, ' ').toLowerCase()}</p>
          {data.customerNote && <p className="text-xs italic text-slate-600 leading-relaxed">&ldquo;{data.customerNote}&rdquo;</p>}
        </div>
      </div>

      {/* Returned items */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Items being returned</p>
        <div className="space-y-2.5">
          {data.items.map(ri => {
            const oi = orderItemById.get(ri.orderItemId)
            return (
              <div key={ri.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  {oi?.image && (
                    <Image src={oi.image} alt={oi.name} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{oi?.name ?? 'Item'}</p>
                  <p className="text-xs text-slate-500">
                    Qty {ri.quantity} {oi ? `of ${oi.quantity} ordered` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900 shrink-0">{formatPrice(ri.lineRefundAmount)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Timeline</p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2"><Clock size={12} className="text-slate-400" /> Filed <span className="ml-auto text-slate-500">{fmtDate(data.createdAt)}</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className={data.approvedAt ? 'text-blue-500' : 'text-slate-300'}/> Approved <span className="ml-auto text-slate-500">{fmtDate(data.approvedAt)}</span></div>
          <div className="flex items-center gap-2"><PackageCheck size={12} className={data.receivedAt ? 'text-indigo-500' : 'text-slate-300'}/> Received <span className="ml-auto text-slate-500">{fmtDate(data.receivedAt)}</span></div>
          <div className="flex items-center gap-2"><Banknote size={12} className={data.refundedAt ? 'text-green-500' : 'text-slate-300'}/> Refunded <span className="ml-auto text-slate-500">{fmtDate(data.refundedAt)}</span></div>
          {data.rejectedAt && <div className="flex items-center gap-2"><XCircle size={12} className="text-red-500" /> Rejected <span className="ml-auto text-slate-500">{fmtDate(data.rejectedAt)}</span></div>}
        </div>
      </div>

      {/* Admin actions */}
      {nextSteps.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Admin note</label>
            <textarea value={adminNote} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Optional — context for the customer (visible in their email) or for the team."
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextSteps.map(target => {
              const isReject  = target === 'REJECTED'
              const isApprove = target === 'APPROVED'
              const isReceive = target === 'RECEIVED'
              const isRefund  = target === 'REFUNDED'
              const cls = isReject
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : isRefund
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              const Icon = isApprove ? CheckCircle2 : isReject ? XCircle : isReceive ? PackageCheck : Banknote
              const label = isApprove ? 'Approve' : isReject ? 'Reject' : isReceive ? 'Mark received' : 'Mark refunded'
              return (
                <button key={target} onClick={() => transition(target)} disabled={pending !== null}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-60 ${cls}`}>
                  {pending === target ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                  {label}
                </button>
              )
            })}
          </div>
          {data.status === 'APPROVED' && (
            <p className="text-[11px] text-slate-500">
              Mark received once the parcel physically arrives at the store. We&rsquo;ll restore stock for the returned line items automatically.
            </p>
          )}
          {data.status === 'RECEIVED' && (
            <p className="text-[11px] text-slate-500">
              Process the refund out-of-band (eSewa, Khalti, bank, cash) then mark refunded. The order&rsquo;s payment status flips to REFUNDED and the customer gets a confirmation email.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">
          <p className="font-bold">No further action available.</p>
          <p className="text-xs text-slate-500 mt-0.5">This return is in a terminal state.</p>
          {data.adminNote && <p className="text-xs italic text-slate-600 mt-2">Note: &ldquo;{data.adminNote}&rdquo;</p>}
        </div>
      )}
    </div>
  )
}

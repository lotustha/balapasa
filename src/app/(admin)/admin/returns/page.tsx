'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, PackageX, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ReturnRow {
  id:           string
  orderId:      string
  status:       string
  reason:       string
  refundAmount: number
  createdAt:    string
  items:        Array<{ id: string; quantity: number; lineRefundAmount: number }>
  order:        null | {
    id:            string
    orderCode:     string | null
    name:          string
    total:         number
    paymentMethod: string
    paymentStatus: string
    createdAt:     string
  }
}

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'ALL',                   label: 'All' },
  { key: 'REQUESTED',             label: 'Requested' },
  { key: 'APPROVED',              label: 'Approved' },
  { key: 'RECEIVED',              label: 'Received' },
  { key: 'REFUNDED',              label: 'Refunded' },
  { key: 'REJECTED',              label: 'Rejected' },
  { key: 'CANCELLED_BY_CUSTOMER', label: 'Cancelled' },
]

const STATUS_CLS: Record<string, string> = {
  REQUESTED:             'bg-amber-100 text-amber-700',
  APPROVED:              'bg-blue-100 text-blue-700',
  RECEIVED:              'bg-indigo-100 text-indigo-700',
  REFUNDED:              'bg-green-100 text-green-700',
  REJECTED:              'bg-red-100 text-red-700',
  CANCELLED_BY_CUSTOMER: 'bg-slate-100 text-slate-600',
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60)   return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function AdminReturnsPage() {
  const [filter, setFilter]       = useState('REQUESTED')
  const [items, setItems]         = useState<ReturnRow[]>([])
  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefresh]  = useState(false)

  const load = useCallback(async () => {
    setRefresh(true)
    try {
      const q = filter === 'ALL' ? '' : `?status=${filter}`
      const res = await fetch(`/api/admin/returns${q}`, { cache: 'no-store' })
      const d   = await res.json()
      setItems(d.items ?? [])
      setCounts(d.countByStatus ?? {})
    } catch (e) {
      console.warn('[returns] load failed:', e)
    } finally {
      setLoading(false)
      setRefresh(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const totalRefund = useMemo(
    () => items.reduce((s, r) => s + (r.refundAmount || 0), 0),
    [items],
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">Returns</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer return requests and refunds.</p>
        </div>
        <button onClick={load} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-primary/40 hover:bg-primary/5 text-sm font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-60">
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map(f => {
          const count  = f.key === 'ALL'
            ? Object.values(counts).reduce((s, n) => s + n, 0)
            : (counts[f.key] ?? 0)
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-primary/40 hover:bg-primary/5'
              }`}>
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Showing</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{items.length}</p>
          <p className="text-xs text-slate-500">{filter === 'ALL' ? 'All time' : STATUS_FILTERS.find(f => f.key === filter)?.label}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Refund total</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatPrice(totalRefund)}</p>
          <p className="text-xs text-slate-500">Across visible rows</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Awaiting action</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{counts['REQUESTED'] ?? 0}</p>
          <p className="text-xs text-slate-500">Customer is waiting</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <PackageX size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-700">No returns here</p>
          <p className="text-xs text-slate-400 mt-0.5">Customers haven&rsquo;t filed any returns matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(r => {
            const totalQty = r.items.reduce((s, i) => s + i.quantity, 0)
            const orderCode = r.order?.orderCode ?? r.orderId.slice(0, 8).toUpperCase()
            return (
              <Link key={r.id} href={`/admin/returns/${r.id}`}
                className="block bg-white border border-slate-200 hover:border-primary/40 hover:bg-primary/[0.02] rounded-2xl p-4 transition-colors cursor-pointer">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary text-sm">#{orderCode}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${STATUS_CLS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{r.order?.name ?? 'Customer'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {totalQty} item{totalQty !== 1 ? 's' : ''} · {r.reason.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Refund</p>
                    <p className="text-base font-extrabold text-slate-900">{formatPrice(r.refundAmount)}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 self-center" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

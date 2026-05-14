'use client'

import { useEffect, useState } from 'react'
import { Repeat, Loader2, AlertCircle, Pause, Play, X as XIcon, Filter } from 'lucide-react'

type SubStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED' | 'TRIALING'
type PlanInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

interface SubRow {
  id:                 string
  userId:             string
  status:             SubStatus
  startedAt:          string
  trialEndsAt:        string | null
  currentPeriodStart: string
  currentPeriodEnd:   string
  cancelAtPeriodEnd:  boolean
  cancelledAt:        string | null
  notes:              string | null
  plan: { id: string; name: string; amount: number; interval: PlanInterval; intervalCount: number }
  user: { id: string; name: string | null; email: string } | null
  _count: { invoices: number }
}

const STATUS_FILTERS: (SubStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED', 'CANCELLED']

const STATUS_STYLE: Record<SubStatus, string> = {
  ACTIVE:    'bg-green-50 text-green-700',
  TRIALING:  'bg-sky-50 text-sky-700',
  PAST_DUE:  'bg-amber-50 text-amber-700',
  PAUSED:    'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-50 text-red-600',
}

function formatNpr(n: number) { return 'Rs. ' + Math.round(n).toLocaleString('en-IN') }
function formatDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

export default function AdminSubscriptionsPage() {
  const [subs,    setSubs]    = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [filter,  setFilter]  = useState<SubStatus | 'ALL'>('ALL')

  async function load(f: SubStatus | 'ALL' = filter) {
    setLoading(true); setError(null)
    try {
      const url = f === 'ALL' ? '/api/admin/subscriptions' : `/api/admin/subscriptions?status=${f}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setSubs(data.subscriptions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }
  useEffect(() => { load(filter) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter])

  async function action(s: SubRow, act: 'cancel' | 'pause' | 'resume') {
    if (act === 'cancel' && !confirm(`Cancel subscription for ${s.user?.email ?? s.userId}?`)) return
    const res = await fetch(`/api/admin/subscriptions/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed'); return }
    load(filter)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Repeat size={16} className="text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Billing</p>
            </div>
            <h1 className="font-heading font-extrabold text-3xl text-slate-900">Subscriptions</h1>
            <p className="text-sm text-slate-500 mt-1">Active customer subscriptions and their billing state.</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter size={13} className="text-slate-400" />
          {STATUS_FILTERS.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${filter === f ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading subscriptions…
            </div>
          ) : error ? (
            <div className="p-6 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /> {error}
            </div>
          ) : subs.length === 0 ? (
            <div className="p-12 text-center">
              <Repeat size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-heading font-bold text-slate-500 mb-1">No subscriptions{filter !== 'ALL' ? ` (${filter})` : ''}</p>
              <p className="text-xs text-slate-400">Subscriptions appear here once customers sign up to a plan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Customer</th>
                    <th className="text-left px-5 py-3">Plan</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Period</th>
                    <th className="text-left px-5 py-3">Invoices</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="border-t border-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{s.user?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">{s.user?.email ?? s.userId}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{s.plan.name}</p>
                        <p className="text-[10px] text-slate-400">{formatNpr(s.plan.amount)} / {s.plan.interval.toLowerCase()}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[s.status]}`}>
                          {s.status.replace('_', ' ')}
                        </span>
                        {s.cancelAtPeriodEnd && (
                          <p className="text-[10px] text-amber-600 mt-1">cancels at period end</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        <p>{formatDate(s.currentPeriodStart)}</p>
                        <p className="text-[10px] text-slate-400">to {formatDate(s.currentPeriodEnd)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{s._count.invoices}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {s.status === 'PAUSED' ? (
                            <button type="button" onClick={() => action(s, 'resume')}
                              title="Resume" className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer">
                              <Play size={13} />
                            </button>
                          ) : s.status !== 'CANCELLED' && (
                            <button type="button" onClick={() => action(s, 'pause')}
                              title="Pause" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                              <Pause size={13} />
                            </button>
                          )}
                          {s.status !== 'CANCELLED' && (
                            <button type="button" onClick={() => action(s, 'cancel')}
                              title="Cancel" className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                              <XIcon size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

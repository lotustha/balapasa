'use client'

import { useEffect, useState } from 'react'
import {
  Repeat, Plus, Loader2, AlertCircle, Power, Trash2, X as XIcon, Users,
} from 'lucide-react'

type PlanInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

interface PlanRow {
  id:            string
  name:          string
  description:   string | null
  amount:        number
  interval:      PlanInterval
  intervalCount: number
  trialDays:     number
  isActive:      boolean
  createdAt:     string
  _count:        { subscriptions: number }
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function formatNpr(n: number) { return 'Rs. ' + Math.round(n).toLocaleString('en-IN') }

function intervalLabel(i: PlanInterval, count: number) {
  const unit = i === 'WEEKLY' ? 'week' : i === 'MONTHLY' ? 'month' : 'year'
  return count === 1 ? `every ${unit}` : `every ${count} ${unit}s`
}

export default function AdminPlansPage() {
  const [plans,    setPlans]    = useState<PlanRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', amount: '',
    interval: 'MONTHLY' as PlanInterval, intervalCount: '1', trialDays: '0',
  })

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/plans')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setPlans(data.plans ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError(null)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          description:   form.description || undefined,
          amount:        Number(form.amount),
          interval:      form.interval,
          intervalCount: Number(form.intervalCount) || 1,
          trialDays:     Number(form.trialDays) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Failed to create'); return }
      setPlans(prev => [{ ...data.plan, _count: { subscriptions: 0 } }, ...prev])
      setForm({ name: '', description: '', amount: '', interval: 'MONTHLY', intervalCount: '1', trialDays: '0' })
      setShowForm(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Network error')
    } finally { setCreating(false) }
  }

  async function toggleActive(p: PlanRow) {
    const res = await fetch(`/api/admin/plans/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed'); return }
    setPlans(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !p.isActive } : x))
  }

  async function del(p: PlanRow) {
    if (p._count.subscriptions > 0) {
      alert('Cannot delete a plan with subscriptions. Deactivate it instead.')
      return
    }
    if (!confirm(`Delete plan "${p.name}"?`)) return
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed'); return }
    setPlans(prev => prev.filter(x => x.id !== p.id))
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Repeat size={16} className="text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Billing</p>
            </div>
            <h1 className="font-heading font-extrabold text-3xl text-slate-900">Plans</h1>
            <p className="text-sm text-slate-500 mt-1">Recurring subscription plans for digital + service products.</p>
          </div>
          <button type="button" onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer">
            {showForm ? <><XIcon size={14} /> Cancel</> : <><Plus size={14} /> New plan</>}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={create} className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
              <div className="w-0.5 h-4 rounded-full bg-primary" /> Create plan
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name <span className="text-red-400">*</span></label>
                <input required value={form.name}
                  onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Pro Membership" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input value={form.description}
                  onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                  placeholder="What customers get" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (NPR) <span className="text-red-400">*</span></label>
                <input type="number" required min="1" step="1" value={form.amount}
                  onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}
                  placeholder="500" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Interval</label>
                <select value={form.interval}
                  onChange={e => setForm(s => ({ ...s, interval: e.target.value as PlanInterval }))}
                  className={inputCls}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Every N (interval count)</label>
                <input type="number" min="1" value={form.intervalCount}
                  onChange={e => setForm(s => ({ ...s, intervalCount: e.target.value }))}
                  className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">e.g. interval=Monthly + every 3 = quarterly</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trial days</label>
                <input type="number" min="0" value={form.trialDays}
                  onChange={e => setForm(s => ({ ...s, trialDays: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>

            {createError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
                <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{createError}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={creating || !form.name || !form.amount}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer">
                {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create plan</>}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading plans…
            </div>
          ) : error ? (
            <div className="p-6 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /> {error}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center">
              <Repeat size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-heading font-bold text-slate-500 mb-1">No plans yet</p>
              <p className="text-xs text-slate-400">Create your first subscription plan to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Price</th>
                    <th className="text-left px-5 py-3">Cycle</th>
                    <th className="text-left px-5 py-3">Trial</th>
                    <th className="text-left px-5 py-3">Subscribers</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id} className="border-t border-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{p.name}</p>
                        {p.description && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{formatNpr(p.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{intervalLabel(p.interval, p.intervalCount)}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{p.trialDays > 0 ? `${p.trialDays}d` : '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        <span className="inline-flex items-center gap-1"><Users size={11} className="text-slate-400" />{p._count.subscriptions}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.isActive
                          ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700">Active</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Inactive</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => toggleActive(p)}
                            title={p.isActive ? 'Deactivate' : 'Reactivate'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                            <Power size={13} />
                          </button>
                          <button type="button" onClick={() => del(p)}
                            disabled={p._count.subscriptions > 0}
                            title={p._count.subscriptions > 0 ? 'Has subscribers — deactivate instead' : 'Delete'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
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

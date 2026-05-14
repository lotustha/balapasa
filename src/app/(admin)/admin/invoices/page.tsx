'use client'

import { useEffect, useState } from 'react'
import {
  FileText, Plus, Loader2, AlertCircle, X as XIcon, CheckCircle2, Ban, Filter,
} from 'lucide-react'

type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'VOID'

interface InvoiceRow {
  id:             string
  number:         string
  userId:         string
  amount:         number
  status:         InvoiceStatus
  dueDate:        string
  paidAt:         string | null
  paymentMethod:  string | null
  transactionId:  string | null
  notes:          string | null
  createdAt:      string
  subscription:   { id: string; plan: { name: string } } | null
  user:           { id: string; name: string | null; email: string } | null
}

const STATUS_FILTERS: (InvoiceStatus | 'ALL')[] = ['ALL', 'OPEN', 'PAID', 'OVERDUE', 'VOID']

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  OPEN:    'bg-sky-50 text-sky-700',
  PAID:    'bg-green-50 text-green-700',
  OVERDUE: 'bg-amber-50 text-amber-700',
  VOID:    'bg-slate-100 text-slate-500',
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function formatNpr(n: number) { return 'Rs. ' + Math.round(n).toLocaleString('en-IN') }
function formatDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [filter,   setFilter]   = useState<InvoiceStatus | 'ALL'>('ALL')

  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ userId: '', amount: '', dueDate: '', notes: '' })

  // mark-paid modal
  const [paying, setPaying] = useState<InvoiceRow | null>(null)
  const [payForm, setPayForm] = useState({ paymentMethod: 'COD', transactionId: '' })

  async function load(f: InvoiceStatus | 'ALL' = filter) {
    setLoading(true); setError(null)
    try {
      const url = f === 'ALL' ? '/api/admin/invoices' : `/api/admin/invoices?status=${f}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setInvoices(data.invoices ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }
  useEffect(() => { load(filter) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:  form.userId.trim(),
          amount:  Number(form.amount),
          dueDate: form.dueDate || undefined,
          notes:   form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Failed to create'); return }
      setForm({ userId: '', amount: '', dueDate: '', notes: '' })
      setShowForm(false)
      load(filter)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Network error')
    } finally { setCreating(false) }
  }

  async function markPaid(e: React.FormEvent) {
    e.preventDefault()
    if (!paying) return
    const res = await fetch(`/api/admin/invoices/${paying.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_paid',
        paymentMethod: payForm.paymentMethod,
        transactionId: payForm.transactionId || undefined,
      }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed'); return }
    setPaying(null); setPayForm({ paymentMethod: 'COD', transactionId: '' })
    load(filter)
  }

  async function voidInv(inv: InvoiceRow) {
    if (!confirm(`Void invoice ${inv.number}?`)) return
    const res = await fetch(`/api/admin/invoices/${inv.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'void' }),
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
              <FileText size={16} className="text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Billing</p>
            </div>
            <h1 className="font-heading font-extrabold text-3xl text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-500 mt-1">Subscription cycles + manual one-off invoices.</p>
          </div>
          <button type="button" onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer">
            {showForm ? <><XIcon size={14} /> Cancel</> : <><Plus size={14} /> One-off invoice</>}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={create} className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
              <div className="w-0.5 h-4 rounded-full bg-primary" /> One-off invoice
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer ID <span className="text-red-400">*</span></label>
                <input required value={form.userId}
                  onChange={e => setForm(s => ({ ...s, userId: e.target.value }))}
                  placeholder="profile id (uuid)" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (NPR) <span className="text-red-400">*</span></label>
                <input type="number" required min="1" step="1" value={form.amount}
                  onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}
                  placeholder="500" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due date</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(s => ({ ...s, dueDate: e.target.value }))}
                  className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Defaults to 7 days from now</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <input value={form.notes}
                  onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
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
              <button type="submit" disabled={creating || !form.userId || !form.amount}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer">
                {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create invoice</>}
              </button>
            </div>
          </form>
        )}

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter size={13} className="text-slate-400" />
          {STATUS_FILTERS.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${filter === f ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading invoices…
            </div>
          ) : error ? (
            <div className="p-6 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /> {error}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-heading font-bold text-slate-500 mb-1">No invoices{filter !== 'ALL' ? ` (${filter})` : ''}</p>
              <p className="text-xs text-slate-400">Generate a one-off invoice or wait for a subscription cycle.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Invoice</th>
                    <th className="text-left px-5 py-3">Customer</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Due</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-t border-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-mono font-bold text-slate-800 text-xs">{inv.number}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {inv.subscription ? `${inv.subscription.plan.name} (sub)` : 'one-off'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{inv.user?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">{inv.user?.email ?? inv.userId}</p>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{formatNpr(inv.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[inv.status]}`}>
                          {inv.status}
                        </span>
                        {inv.paidAt && <p className="text-[10px] text-slate-400 mt-1">paid {formatDate(inv.paidAt)}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {inv.status === 'OPEN' || inv.status === 'OVERDUE' ? (
                            <>
                              <button type="button" onClick={() => setPaying(inv)}
                                title="Mark paid"
                                className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer">
                                <CheckCircle2 size={13} />
                              </button>
                              <button type="button" onClick={() => voidInv(inv)}
                                title="Void"
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                                <Ban size={13} />
                              </button>
                            </>
                          ) : null}
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

      {/* Mark-paid modal */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-heading font-bold text-slate-900">Mark {paying.number} paid</h2>
              <button onClick={() => setPaying(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={markPaid} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment method</label>
                <select value={payForm.paymentMethod}
                  onChange={e => setPayForm(s => ({ ...s, paymentMethod: e.target.value }))}
                  className={inputCls}>
                  <option value="COD">Cash on delivery</option>
                  <option value="ESEWA">eSewa</option>
                  <option value="KHALTI">Khalti</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Transaction ID</label>
                <input value={payForm.transactionId}
                  onChange={e => setPayForm(s => ({ ...s, transactionId: e.target.value }))}
                  placeholder="optional reference" className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaying(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors">
                  <CheckCircle2 size={14} /> Mark paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

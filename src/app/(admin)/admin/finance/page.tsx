'use client'

import { useEffect, useState, useRef } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Receipt,
  Plus, Trash2, X, Loader2, CheckCircle2, Save, Download,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Monthly { month: string; label: string; revenue: number; expenses: number; profit: number }
interface CatRow  { category: string; amount: number }
interface Expense { id: string; amount: number; category: string; description: string | null; paidTo: string | null; date: string }

const EXP_CATEGORIES = ['RENT', 'SALARY', 'SUPPLIER', 'UTILITIES', 'MARKETING', 'TRANSPORT', 'OTHER']
const CAT_COLORS: Record<string, string> = {
  RENT:'bg-red-400', SALARY:'bg-purple-400', SUPPLIER:'bg-amber-400',
  UTILITIES:'bg-blue-400', MARKETING:'bg-pink-400', TRANSPORT:'bg-cyan-400', OTHER:'bg-slate-400',
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

export default function FinancePage() {
  const [summary,   setSummary]   = useState<{ monthly: Monthly[]; totalRevenue: number; totalExpenses: number; totalProfit: number; byCategory: CatRow[] } | null>(null)
  const [expenses,  setExpenses]  = useState<Expense[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'dashboard' | 'expenses' | 'pl'>('dashboard')
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [months,    setMonths]    = useState(6)
  const [form, setForm] = useState({ amount: '', category: 'SUPPLIER', description: '', paidTo: '', date: new Date().toISOString().slice(0, 10) })
  const fileRef = useRef<HTMLAnchorElement>(null)

  async function load() {
    setLoading(true)
    const [s, e] = await Promise.all([
      fetch(`/api/admin/finance/summary?months=${months}`).then(r => r.json()),
      fetch('/api/admin/finance/expenses?limit=200').then(r => r.json()),
    ])
    if (!s.error) setSummary(s)
    if (!e.error) setExpenses(e.expenses ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/finance/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); setForm({ amount: '', category: 'SUPPLIER', description: '', paidTo: '', date: new Date().toISOString().slice(0, 10) }); load() }
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/admin/finance/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function exportCSV() {
    if (!summary) return
    const rows = [
      ['Month', 'Revenue (NPR)', 'Expenses (NPR)', 'Profit (NPR)'],
      ...summary.monthly.map(m => [m.label, m.revenue, m.expenses, m.profit]),
      [],
      ['TOTAL', summary.totalRevenue, summary.totalExpenses, summary.totalProfit],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    if (fileRef.current) { fileRef.current.href = url; fileRef.current.download = 'profit-loss.csv'; fileRef.current.click() }
    URL.revokeObjectURL(url)
  }

  const maxBar = summary ? Math.max(...summary.monthly.map(m => Math.max(m.revenue, m.expenses)), 1) : 1

  return (
    <div className="p-8">
      <a ref={fileRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-green-100 flex items-center justify-center">
              <DollarSign size={18} className="text-green-600" />
            </div>
            Finance
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-11">Revenue, expenses & profitability</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={months} onChange={e => setMonths(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer text-slate-700">
            {[3,6,12].map(m => <option key={m} value={m}>Last {m} months</option>)}
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <Download size={14} /> Export P&L
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark cursor-pointer transition-colors shadow-md shadow-primary/15">
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit mb-6">
        {[['dashboard', 'Overview'], ['expenses', 'Expenses'], ['pl', 'P&L Report']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as 'dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === v ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : !summary ? (
        <div className="text-center py-16 text-slate-400">Failed to load finance data</div>
      ) : (
        <>
          {/* ── Overview tab ─────────────────────────────────────── */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Revenue',  value: summary.totalRevenue,  icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50'  },
                  { label: 'Total Expenses', value: summary.totalExpenses, icon: TrendingDown,  color: 'text-red-600',    bg: 'bg-red-50'    },
                  { label: 'Net Profit',     value: summary.totalProfit,   icon: DollarSign,   color: summary.totalProfit >= 0 ? 'text-primary' : 'text-red-600', bg: summary.totalProfit >= 0 ? 'bg-primary-bg' : 'bg-red-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                      <Icon size={18} className={color} />
                    </div>
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`font-heading font-extrabold text-2xl mt-1 ${color}`}>{formatPrice(value)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Last {months} months</p>
                  </div>
                ))}
              </div>

              {/* Revenue vs Expenses bar chart */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-heading font-bold text-slate-800 mb-5">Revenue vs Expenses</h2>
                {summary.monthly.length === 0 ? (
                  <p className="text-slate-300 text-sm text-center py-10">No data for this period</p>
                ) : (
                  <div className="flex items-end gap-3 h-48">
                    {summary.monthly.map(m => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end gap-1 justify-center" style={{ height: '160px' }}>
                          <div className="w-[45%] rounded-t-md bg-green-400 transition-all" title={`Revenue: ${formatPrice(m.revenue)}`}
                            style={{ height: `${Math.max((m.revenue / maxBar) * 160, 4)}px` }} />
                          <div className="w-[45%] rounded-t-md bg-red-400 transition-all" title={`Expenses: ${formatPrice(m.expenses)}`}
                            style={{ height: `${Math.max((m.expenses / maxBar) * 160, 4)}px` }} />
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold">{m.label.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400" /> Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" /> Expenses</span>
                </div>
              </div>

              {/* Expenses by category */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-heading font-bold text-slate-800 mb-4">Expenses by Category</h2>
                {summary.byCategory.length === 0 ? (
                  <p className="text-slate-300 text-sm text-center py-8">No expenses recorded</p>
                ) : (
                  <div className="space-y-3">
                    {summary.byCategory.map(c => {
                      const max = summary.byCategory[0]?.amount ?? 1
                      return (
                        <div key={c.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2 font-semibold text-slate-700">
                              <span className={`w-2 h-2 rounded-full ${CAT_COLORS[c.category] ?? 'bg-slate-400'}`} />
                              {c.category}
                            </span>
                            <span className="font-bold text-slate-900">{formatPrice(c.amount)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${CAT_COLORS[c.category] ?? 'bg-slate-400'}`}
                              style={{ width: `${(c.amount / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Expenses tab ─────────────────────────────────────── */}
          {tab === 'expenses' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    {['Date', 'Category', 'Description', 'Paid To', 'Amount', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No expenses yet</td></tr>
                  ) : expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(e.date).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg text-white ${CAT_COLORS[e.category] ?? 'bg-slate-400'}`}>{e.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{e.description ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{e.paidTo ?? '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{formatPrice(e.amount)}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => deleteExpense(e.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── P&L tab ───────────────────────────────────────────── */}
          {tab === 'pl' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                <h2 className="font-heading font-bold text-slate-800">Profit & Loss Statement</h2>
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary bg-primary-bg hover:bg-primary/15 rounded-xl cursor-pointer transition-colors">
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    {['Period', 'Revenue', 'Expenses', 'Net Profit', 'Margin'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summary.monthly.map(m => {
                    const margin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0
                    return (
                      <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{m.label}</td>
                        <td className="px-5 py-4 text-green-600 font-bold text-sm">{formatPrice(m.revenue)}</td>
                        <td className="px-5 py-4 text-red-500 font-bold text-sm">{formatPrice(m.expenses)}</td>
                        <td className={`px-5 py-4 font-extrabold text-sm ${m.profit >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatPrice(m.profit)}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${margin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="bg-slate-50 font-extrabold">
                    <td className="px-5 py-4 text-slate-900 text-sm">Total ({months}m)</td>
                    <td className="px-5 py-4 text-green-700 text-sm">{formatPrice(summary.totalRevenue)}</td>
                    <td className="px-5 py-4 text-red-700 text-sm">{formatPrice(summary.totalExpenses)}</td>
                    <td className={`px-5 py-4 text-sm ${summary.totalProfit >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatPrice(summary.totalProfit)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${summary.totalProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {summary.totalRevenue > 0 ? Math.round((summary.totalProfit / summary.totalRevenue) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2"><Receipt size={16} className="text-primary" /> Add Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"><X size={16} /></button>
            </div>
            <form onSubmit={addExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (NPR)</label>
                  <input type="number" min="0" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly office rent" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Paid To</label>
                  <input value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} placeholder="Vendor / person" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/15">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Expense</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

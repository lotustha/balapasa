'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Wallet, Loader2, Search, Plus, Minus, CheckCircle2, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Customer { id: string; name: string | null; email: string | null; orderCount: number }
interface WalletRow { userId: string; balance: number; updatedAt: string; user: { id: string; name: string | null; email: string | null } | null }

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

export default function StoreCreditAdminPage() {
  const [wallets, setWallets]     = useState<WalletRow[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)

  const [showForm, setShowForm]   = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [direction, setDirection] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount]       = useState('')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [wRes, cRes] = await Promise.all([
      fetch('/api/admin/store-credit', { cache: 'no-store' }),
      fetch('/api/admin/customers', { cache: 'no-store' }),
    ])
    if (wRes.ok) setWallets((await wRes.json()).wallets ?? [])
    if (cRes.ok) setCustomers((await cRes.json()).customers ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  const balanceByUser = useMemo(() => new Map(wallets.map(w => [w.userId, w.balance])), [wallets])

  const custResults = useMemo(() => {
    const q = custSearch.trim().toLowerCase()
    if (!q) return []
    return customers.filter(c =>
      (c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q),
    ).slice(0, 8)
  }, [custSearch, customers])

  const totalIssued = useMemo(() => wallets.reduce((s, w) => s + w.balance, 0), [wallets])

  function resetForm() {
    setSelected(null); setCustSearch(''); setAmount(''); setReason(''); setDirection('add')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) { setToast('Enter an amount greater than 0'); return }
    setSaving(true)
    const signed = direction === 'add' ? amt : -amt
    const res = await fetch('/api/admin/store-credit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selected.id, amount: signed, reason, type: direction === 'add' ? 'GRANT' : 'ADJUSTMENT' }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setToast(`${direction === 'add' ? 'Added' : 'Deducted'} ${formatPrice(Math.abs(data.applied ?? signed))} — new balance ${formatPrice(data.balance ?? 0)}`)
      setShowForm(false); resetForm(); load()
    } else { setToast(data.error ?? 'Failed to update credit') }
    setSaving(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Wallet size={20} className="text-primary" /> Store Credit
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} · {formatPrice(totalIssued)} outstanding
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
          <Plus size={15} /> Grant / Adjust
        </button>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
          <CheckCircle2 size={15} /> {toast}
        </div>
      )}

      {/* Wallets table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : wallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Wallet size={36} className="mb-3" />
            <p className="text-sm font-medium text-slate-400">No store credit issued yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {wallets.map(w => (
                  <tr key={w.userId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{w.user?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{w.user?.email ?? w.userId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-bold text-sm ${w.balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{formatPrice(w.balance)}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(w.updatedAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant / Adjust modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-heading font-bold text-slate-900">Grant / Adjust Credit</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              {/* Customer picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer</label>
                {selected ? (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary-bg border border-primary/20">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{selected.name ?? 'Unnamed'}</p>
                      <p className="text-xs text-slate-500 truncate">{selected.email}</p>
                      <p className="text-[11px] text-primary font-bold mt-0.5">Current balance: {formatPrice(balanceByUser.get(selected.id) ?? 0)}</p>
                    </div>
                    <button type="button" onClick={() => setSelected(null)} className="text-primary/60 hover:text-primary cursor-pointer shrink-0"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Search by name or email…" className={`${inputCls} pl-9`} />
                    </div>
                    {custResults.length > 0 && (
                      <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                        {custResults.map(c => (
                          <button key={c.id} type="button" onClick={() => { setSelected(c); setCustSearch('') }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0">
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-800 truncate">{c.name ?? 'Unnamed'}</span>
                              <span className="block text-xs text-slate-400 truncate">{c.email}</span>
                            </span>
                            <span className="text-xs font-bold text-emerald-600 shrink-0">{formatPrice(balanceByUser.get(c.id) ?? 0)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Direction */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action</label>
                <div className="flex gap-2">
                  {([['add', 'Add credit', Plus], ['deduct', 'Deduct', Minus]] as const).map(([key, label, Icon]) => (
                    <button key={key} type="button" onClick={() => setDirection(key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${direction === key ? (key === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-rose-400 bg-rose-50 text-rose-500') : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (NPR)</label>
                <input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" required className={inputCls} />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Goodwill / compensation" required className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving || !selected}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Wallet size={14} /> Apply</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, X, CheckCircle2, Copy, Percent, Banknote,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Coupon {
  id: string; code: string; type: 'PERCENT' | 'FIXED'; value: number
  minOrder: number | null; maxUses: number | null; usedCount: number
  expiresAt: string | null; isActive: boolean; createdAt: string
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT'
  categoryIds: string[]; productIds: string[]
}
interface Cat { id: string; name: string; slug: string }
interface Prod { id: string; name: string; slug: string; images: string[] }

function statusCls(c: Coupon) {
  if (!c.isActive) return 'bg-slate-100 text-slate-500'
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'bg-red-100 text-red-600'
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}
function statusLabel(c: Coupon) {
  if (!c.isActive) return 'Inactive'
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'Expired'
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return 'Exhausted'
  return 'Active'
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

const SCOPE_LABELS = { ALL: 'All products', CATEGORY: 'Specific categories', PRODUCT: 'Specific products' }

export default function CouponsPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [cats,     setCats]     = useState<Cat[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [copied,   setCopied]   = useState<string | null>(null)
  const [prodSearch, setProdSearch] = useState('')
  const [prodResults, setProdResults] = useState<Prod[]>([])
  const [form, setForm] = useState({
    code: '', type: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '', minOrder: '', maxUses: '', expiresAt: '',
    scope: 'ALL' as 'ALL' | 'CATEGORY' | 'PRODUCT',
    categoryIds: [] as string[], productIds: [] as string[],
    selectedProducts: [] as Prod[],
  })

  async function load() {
    setLoading(true)
    const [cr, catsRes] = await Promise.all([
      fetch('/api/admin/coupons'),
      fetch('/api/admin/categories'),
    ])
    if (cr.ok) setCoupons((await cr.json()).coupons ?? [])
    if (catsRes.ok) setCats((await catsRes.json()).categories ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(prodSearch)}&limit=8`)
      if (res.ok) setProdResults((await res.json()).products ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [prodSearch])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/coupons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setShowForm(false)
      setForm({ code: '', type: 'PERCENT', value: '', minOrder: '', maxUses: '', expiresAt: '', scope: 'ALL', categoryIds: [], productIds: [], selectedProducts: [] })
      load()
    } else { alert(data.error ?? 'Failed to create') }
    setSaving(false)
  }

  async function toggle(c: Coupon) {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    })
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x))
  }

  async function del(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return
    await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' })
    setCoupons(prev => prev.filter(x => x.id !== c.id))
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Tag size={20} className="text-primary" /> Coupons
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
          <Plus size={15} /> New Coupon
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Tag size={36} className="mb-3" />
            <p className="text-sm font-medium text-slate-400">No coupons yet. Create your first discount code.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Discount</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Min Order</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Uses</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Expires</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-slate-300 hover:text-primary transition-colors cursor-pointer">
                        {copied === c.code ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {c.type === 'PERCENT'
                        ? <><Percent size={13} className="text-primary" /><span className="font-bold text-primary">{c.value}% off</span></>
                        : <><Banknote size={13} className="text-primary" /><span className="font-bold text-primary">{formatPrice(c.value)} off</span></>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{c.minOrder ? formatPrice(c.minOrder) : '—'}</td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-700">{c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ''}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold w-fit ${statusCls(c)}`}>{statusLabel(c)}</span>
                      {c.scope !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 w-fit">{SCOPE_LABELS[c.scope]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggle(c)} title={c.isActive ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-primary hover:bg-primary-bg">
                        {c.isActive ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => del(c)} title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-heading font-bold text-slate-900">New Coupon</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Coupon Code</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE10" required className={inputCls} />
                  <button type="button" onClick={generateCode}
                    className="px-3 py-2.5 text-xs font-bold text-primary bg-primary-bg hover:bg-primary/20 rounded-xl transition-colors cursor-pointer shrink-0">
                    Generate
                  </button>
                </div>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'PERCENT' | 'FIXED' }))}
                    className={inputCls}>
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (NPR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {form.type === 'PERCENT' ? 'Discount (%)' : 'Amount (NPR)'}
                  </label>
                  <input type="number" min="1" max={form.type === 'PERCENT' ? '100' : undefined}
                    value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder={form.type === 'PERCENT' ? '10' : '100'} required className={inputCls} />
                </div>
              </div>

              {/* Min Order + Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Min Order (NPR)</label>
                  <input type="number" min="0" value={form.minOrder}
                    onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                    placeholder="500 (optional)" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Uses</label>
                  <input type="number" min="1" value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="∞ unlimited" className={inputCls} />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expires At (optional)</label>
                <input type="datetime-local" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className={inputCls} />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Applies To</label>
                <div className="flex gap-2 flex-wrap">
                  {(['ALL', 'CATEGORY', 'PRODUCT'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(f => ({ ...f, scope: s, categoryIds: [], productIds: [], selectedProducts: [] }))}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${form.scope === s ? 'border-primary bg-primary-bg text-primary' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                      {s === 'ALL' ? 'All Products' : s === 'CATEGORY' ? 'Categories' : 'Specific Products'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category picker */}
              {form.scope === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Categories</label>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {cats.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          categoryIds: f.categoryIds.includes(c.id)
                            ? f.categoryIds.filter(x => x !== c.id)
                            : [...f.categoryIds, c.id],
                        }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${form.categoryIds.includes(c.id) ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 text-slate-600 hover:border-primary/40'}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product picker */}
              {form.scope === 'PRODUCT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search & Select Products</label>
                  <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                    placeholder="Type to search products…" className={inputCls} />
                  {prodResults.length > 0 && (
                    <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {prodResults.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => {
                            if (!form.productIds.includes(p.id)) {
                              setForm(f => ({ ...f, productIds: [...f.productIds, p.id], selectedProducts: [...f.selectedProducts, p] }))
                            }
                            setProdSearch(''); setProdResults([])
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer text-sm border-b border-slate-50 last:border-0">
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {form.selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.selectedProducts.map(p => (
                        <span key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-bg text-primary text-xs font-semibold rounded-xl">
                          {p.name}
                          <button type="button" onClick={() => setForm(f => ({ ...f, productIds: f.productIds.filter(x => x !== p.id), selectedProducts: f.selectedProducts.filter(x => x.id !== p.id) }))}
                            className="text-primary/60 hover:text-primary cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/20">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Tag size={14} /> Create Coupon</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  Loader2, Plus, Minus, RotateCcw, RefreshCw, X, Warehouse,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string; name: string; sku: string | null; images: string[]
  price: number; stock: number; lowStockThreshold: number; trackInventory: boolean
  category: { name: string }
  supplier: { name: string } | null
}

interface Log {
  id: string; type: string; quantity: number; stockAfter: number
  note: string | null; referenceId: string | null; createdAt: string
  product: { name: string }
}

const TYPE_META: Record<string, { label: string; cls: string; icon: typeof TrendingUp }> = {
  PURCHASE:   { label: 'Purchase',   cls: 'bg-green-100 text-green-700',  icon: TrendingUp   },
  SALE:       { label: 'Sale',       cls: 'bg-blue-100 text-blue-700',    icon: TrendingDown },
  ADJUSTMENT: { label: 'Adjustment', cls: 'bg-amber-100 text-amber-700',  icon: RefreshCw    },
  RETURN:     { label: 'Return',     cls: 'bg-purple-100 text-purple-700', icon: RotateCcw   },
  DAMAGE:     { label: 'Damage',     cls: 'bg-red-100 text-red-700',      icon: TrendingDown },
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [logs,     setLogs]     = useState<Log[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'overview' | 'history'>('overview')

  // Adjustment modal state
  const [modal,    setModal]    = useState<Product | null>(null)
  const [adjType,  setAdjType]  = useState<'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'>('PURCHASE')
  const [adjQty,   setAdjQty]   = useState('')
  const [adjNote,  setAdjNote]  = useState('')
  const [saving,   setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [pRes, lRes] = await Promise.all([
        fetch('/api/products?limit=500'),
        fetch('/api/admin/inventory/logs'),
      ])
      const pData = await pRes.json()
      setProducts(pData.products ?? pData ?? [])
      if (lRes.ok) setLogs((await lRes.json()).logs ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submitAdjustment() {
    if (!modal || !adjQty) return
    setSaving(true)
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: modal.id, type: adjType, quantity: Number(adjQty), note: adjNote }),
    })
    if (res.ok) {
      setModal(null); setAdjQty(''); setAdjNote('')
      load()
    }
    setSaving(false)
  }

  const tracked  = products.filter(p => p.trackInventory)
  const untracked = products.filter(p => !p.trackInventory)
  const outOfStock = tracked.filter(p => p.stock === 0)
  const lowStock   = tracked.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold)
  const healthy    = tracked.filter(p => p.stock > p.lowStockThreshold)

  const filtered = tab === 'overview' ? tracked : []

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Warehouse size={22} className="text-primary" /> Inventory
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{tracked.length} tracked · {untracked.length} untracked</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Healthy',       value: healthy.length,    icon: TrendingUp,   color: 'bg-green-50 text-green-600',  border: 'border-green-100' },
          { label: 'Low Stock',     value: lowStock.length,   icon: AlertTriangle, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
          { label: 'Out of Stock',  value: outOfStock.length, icon: TrendingDown, color: 'bg-red-50 text-red-600',      border: 'border-red-100'   },
          { label: 'Not Tracked',   value: untracked.length,  icon: Package,      color: 'bg-slate-50 text-slate-500',  border: 'border-slate-100' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-5`}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="font-extrabold text-2xl text-slate-900">{value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-100 rounded-xl p-1 w-fit">
        {(['overview', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : tab === 'overview' ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tracked.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No inventory-tracked products</td></tr>
              ) : (
                [...outOfStock, ...lowStock, ...healthy].map(p => {
                  const isOut = p.stock === 0
                  const isLow = !isOut && p.stock <= p.lowStockThreshold
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isOut ? 'bg-red-50/30' : isLow ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {p.images[0]
                              ? <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                              : <Package size={14} className="absolute inset-0 m-auto text-slate-300" />
                            }
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.sku ?? p.category.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">{p.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400'}`}
                              style={{ width: `${Math.min((p.stock / Math.max(p.lowStockThreshold * 3, 1)) * 100, 100)}%` }} />
                          </div>
                          <span className="font-bold text-sm text-slate-900">{p.stock}</span>
                          <span className="text-[10px] text-slate-400">/ alert at {p.lowStockThreshold}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => { setModal(p); setAdjType('PURCHASE') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-bg text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus size={12} /> Adjust
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Qty</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Stock After</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Note</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No inventory movements yet</td></tr>
              ) : (
                logs.map(log => {
                  const meta = TYPE_META[log.type] ?? { label: log.type, cls: 'bg-slate-100 text-slate-600', icon: RefreshCw }
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{log.product.name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-bold text-sm ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantity > 0 ? '+' : ''}{log.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">{log.stockAfter}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{log.note ?? (log.referenceId ? `Ref: ${log.referenceId.slice(0, 8)}` : '—')}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Adjustment modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-slate-900">Adjust Inventory</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-1">{modal.name}</p>
            <p className="text-xs text-slate-400 mb-5">Current stock: <strong className="text-slate-700">{modal.stock}</strong></p>

            {/* Type selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {(['PURCHASE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'] as const).map(t => (
                <button key={t} onClick={() => setAdjType(t)}
                  className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer capitalize ${adjType === t ? 'border-primary bg-primary-bg text-primary' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                  {t === 'PURCHASE' ? '+ Purchase / Restock'
                    : t === 'RETURN' ? '+ Customer Return'
                    : t === 'DAMAGE' ? '- Damage / Loss'
                    : '± Manual Adjust'}
                </button>
              ))}
            </div>

            {/* Quantity */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantity</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setAdjQty(q => String(Math.max(0, Number(q) - 1)))}
                  className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer">
                  <Minus size={14} />
                </button>
                <input type="number" min="0" value={adjQty} onChange={e => setAdjQty(e.target.value)}
                  className="flex-1 text-center py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-primary" />
                <button onClick={() => setAdjQty(q => String(Number(q) + 1))}
                  className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
              <input value={adjNote} onChange={e => setAdjNote(e.target.value)}
                placeholder="e.g. Received from supplier, PO #123"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary" />
            </div>

            <button onClick={submitAdjustment} disabled={!adjQty || saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

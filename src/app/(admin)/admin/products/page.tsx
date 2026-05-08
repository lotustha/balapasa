'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, Plus, Search, Filter, Edit2, Trash2, Eye,
  Download, Upload, Loader2, CheckCircle2, AlertTriangle, X,
  Building2, TrendingUp, TrendingDown, RefreshCw, RotateCcw,
  Minus, History, Warehouse,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string; name: string; slug: string; sku: string | null; brand: string | null
  price: number; salePrice: number | null; costPrice: number | null
  stock: number; lowStockThreshold: number; trackInventory: boolean
  isActive: boolean; isFeatured: boolean
  images: string[]; createdAt: string
  category: { name: string }
  supplier: { name: string; email: string | null } | null
}

interface Log {
  id: string; type: string; quantity: number; stockAfter: number
  note: string | null; referenceId: string | null; createdAt: string
  product: { name: string }
}

// ── Inline editable number cell ───────────────────────────────────────────
function InlineNumber({
  value, onSave, format, min = 0, className = '',
}: {
  value: number | null; onSave: (v: number) => Promise<void>
  format?: (v: number) => string; min?: number; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value != null ? String(value) : '')
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 0)
  }

  async function commit() {
    const num = Number(draft)
    if (!isNaN(num) && num !== value) {
      setSaving(true)
      await onSave(Math.max(min, num))
      setSaving(false)
    }
    setEditing(false)
  }

  function cancel() { setEditing(false) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number" min={min} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') cancel() }}
        className="w-20 px-1.5 py-0.5 text-sm font-bold border-2 border-primary rounded-lg outline-none text-slate-900 bg-primary-bg"
        autoFocus
      />
    )
  }

  return (
    <span
      onDoubleClick={startEdit}
      title="Double-click to edit"
      className={`cursor-text select-none inline-flex items-center gap-1 group rounded px-0.5 hover:bg-primary-bg transition-colors ${className}`}
    >
      {saving
        ? <Loader2 size={12} className="animate-spin text-primary" />
        : value != null ? (format ? format(value) : String(value)) : '—'
      }
      {!saving && <span className="opacity-0 group-hover:opacity-40 text-primary text-[9px] font-bold">✎</span>}
    </span>
  )
}

const STOCK_STATUS = (p: Product) => {
  if (!p.trackInventory)              return { label: 'Untracked',       cls: 'bg-slate-100 text-slate-500'  }
  if (p.stock === 0)                  return { label: 'Out of stock',    cls: 'bg-red-100 text-red-700'      }
  if (p.stock <= p.lowStockThreshold) return { label: `Low (${p.stock})`, cls: 'bg-amber-100 text-amber-700' }
  return                                     { label: `${p.stock} units`, cls: 'bg-green-100 text-green-700'  }
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  PURCHASE:   { label: 'Purchase',   cls: 'bg-green-100 text-green-700'  },
  SALE:       { label: 'Sale',       cls: 'bg-blue-100 text-blue-700'    },
  ADJUSTMENT: { label: 'Adjustment', cls: 'bg-amber-100 text-amber-700'  },
  RETURN:     { label: 'Return',     cls: 'bg-purple-100 text-purple-700' },
  DAMAGE:     { label: 'Damage',     cls: 'bg-red-100 text-red-700'      },
}

const PAGE_SIZE = 50

export default function ProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([])
  const [total,       setTotal]       = useState(0)
  const [logs,        setLogs]        = useState<Log[]>([])
  const [loading,     setLoading]     = useState(true)
  const [logsLoaded,  setLogsLoaded]  = useState(false)
  const [tab,         setTab]         = useState<'products' | 'history'>('products')

  // Filter / sort / pagination
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [sort,         setSort]         = useState('newest')
  const [statusFilter, setStatusFilter] = useState('')   // '' | 'active' | 'draft'
  const [stockFilter,  setStockFilter]  = useState('')   // '' | 'low' | 'out'
  const [catFilter,    setCatFilter]    = useState('')   // category slug
  const [categories,   setCategories]  = useState<{id:string;name:string;slug:string}[]>([])
  const [showFilters,  setShowFilters]  = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delete
  const [deleteTarget,  setDeleteTarget]  = useState<Product | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll,   setDeletingAll]   = useState(false)

  // Import / Export
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Inventory adjustment
  const [modal,   setModal]   = useState<Product | null>(null)
  const [adjType, setAdjType] = useState<'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'>('PURCHASE')
  const [adjQty,  setAdjQty]  = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [saving,  setSaving]  = useState(false)

  function buildUrl(overrides: Record<string, string | number> = {}) {
    const p = new URLSearchParams({
      admin: 'true', limit: String(PAGE_SIZE), page: String(page), sort,
      ...(search       ? { search }           : {}),
      ...(catFilter    ? { category: catFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(stockFilter  ? { stock: stockFilter }  : {}),
    })
    Object.entries(overrides).forEach(([k, v]) => p.set(k, String(v)))
    return `/api/products?${p}`
  }

  async function load(url?: string) {
    setLoading(true)
    try {
      const res  = await fetch(url ?? buildUrl())
      const data = await res.json()
      setProducts(data.products ?? [])
      setTotal(data.total ?? 0)
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }

  async function loadLogs() {
    if (logsLoaded) return
    try {
      const res = await fetch('/api/admin/inventory/logs')
      if (res.ok) setLogs((await res.json()).logs ?? [])
      setLogsLoaded(true)
    } catch {}
  }

  // Fetch categories for filter dropdown
  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))
  }, [])

  // Reload when filters change (debounce search)
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => { load() }, search ? 300 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, sort, catFilter, statusFilter, stockFilter])

  function applyFilter(key: string, val: string) {
    setPage(1)
    if (key === 'status') setStatusFilter(val)
    if (key === 'stock')  setStockFilter(val)
    if (key === 'cat')    setCatFilter(val)
    if (key === 'sort')   setSort(val)
  }

  function openHistory() { setTab('history'); loadLogs() }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = [catFilter, statusFilter, stockFilter].filter(Boolean).length

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
      setLogsLoaded(false)
      load()
    }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null); setDeleting(false)
    void load()
  }

  async function confirmDeleteAll() {
    setDeletingAll(true)
    const res = await fetch('/api/admin/products/all', { method: 'DELETE' })
    if (res.ok) { setProducts([]); setDeleteAllOpen(false) }
    setDeletingAll(false)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportResult(null)
    const form = new FormData(); form.append('file', file)
    try {
      const res  = await fetch('/api/admin/products/import', { method: 'POST', body: form })
      const data = await res.json()
      setImportResult(data)
      if (data.success) load()
    } catch { setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['Network error'] }) }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function handleExport() {
    const a = document.createElement('a'); a.href = '/api/admin/products/export'; a.download = ''; a.click()
  }

  function margin(p: Product) {
    if (!p.costPrice || !p.price) return null
    const sell = p.salePrice ?? p.price
    return Math.round(((sell - p.costPrice) / sell) * 100)
  }

  async function patchProduct(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    }
  }

  // Server-side filtering — no client-side filter needed
  const tracked    = products.filter(p => p.trackInventory)
  const outOfStock = tracked.filter(p => p.stock === 0)
  const lowStock   = tracked.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold)
  const healthy    = tracked.filter(p => p.stock > p.lowStockThreshold)
  const untracked  = products.filter(p => !p.trackInventory)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Warehouse size={20} className="text-primary" /> Products &amp; Inventory
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? '…' : `${products.length} products`}
            {outOfStock.length > 0 && <span className="ml-2 text-red-600 font-bold">· {outOfStock.length} out of stock</span>}
            {lowStock.length  > 0 && <span className="ml-2 text-amber-600 font-bold">· {lowStock.length} low stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={14} /> Export
          </button>
          {products.length > 0 && (
            <button onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
              <Trash2 size={14} /> Delete All
            </button>
          )}
          <Link href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {/* Inventory stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Healthy',      value: healthy.length,    icon: TrendingUp,    color: 'bg-green-50 text-green-600',  border: 'border-green-100' },
            { label: 'Low Stock',    value: lowStock.length,   icon: AlertTriangle, color: 'bg-amber-50 text-amber-600',  border: 'border-amber-100' },
            { label: 'Out of Stock', value: outOfStock.length, icon: TrendingDown,  color: 'bg-red-50 text-red-600',      border: 'border-red-100'   },
            { label: 'Not Tracked',  value: untracked.length,  icon: Package,       color: 'bg-slate-50 text-slate-500',  border: 'border-slate-100' },
          ].map(({ label, value, icon: Icon, color, border }) => (
            <div key={label} className={`bg-white rounded-2xl border ${border} p-4 flex items-center gap-4`}>
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="font-extrabold text-2xl text-slate-900 leading-none">{value}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 flex items-start gap-3 px-5 py-4 rounded-2xl border ${importResult.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          {importResult.errors.length
            ? <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            : <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-800">
              Import complete — {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>· {e}</li>)}
                {importResult.errors.length > 5 && <li>· …and {importResult.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
          <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit mb-4">
        <button onClick={() => setTab('products')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === 'products' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          Products {total > 0 && <span className="ml-1 opacity-70">({total})</span>}
        </button>
        <button onClick={openHistory}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          <History size={12} /> Stock History
        </button>
      </div>

      {/* Search + Sort + Filter toolbar */}
      {tab === 'products' && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search name, SKU, brand…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>

            {/* Sort */}
            <select value={sort} onChange={e => applyFilter('sort', e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer text-slate-700">
              <option value="newest">Newest first</option>
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="stock-asc">Stock ↑</option>
              <option value="stock-desc">Stock ↓</option>
            </select>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors cursor-pointer ${showFilters || activeFilters > 0 ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={14} />
              Filters {activeFilters > 0 && <span className="bg-primary text-white text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
            </button>

            <Link href="/admin/suppliers"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              <Building2 size={14} /> Suppliers
            </Link>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap p-4 bg-slate-50 rounded-2xl border border-slate-100">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select value={catFilter} onChange={e => applyFilter('cat', e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer min-w-[140px]">
                  <option value="">All categories</option>
                  {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <div className="flex gap-1">
                  {[['', 'All'], ['active', 'Active'], ['draft', 'Draft']].map(([v, l]) => (
                    <button key={v} onClick={() => applyFilter('status', v)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${statusFilter === v ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Stock</label>
                <div className="flex gap-1">
                  {[['', 'All'], ['low', 'Low'], ['out', 'Out of stock']].map(([v, l]) => (
                    <button key={v} onClick={() => applyFilter('stock', v)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${stockFilter === v ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFilters > 0 && (
                <button onClick={() => { setCatFilter(''); setStatusFilter(''); setStockFilter(''); setPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer mt-auto">
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Products table */}
      {tab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Price / Cost</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Package size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-medium">{search ? 'No products match your search' : 'No products yet'}</p>
                    </td>
                  </tr>
                ) : (
                  products.map(p => {
                    const stock = STOCK_STATUS(p)
                    const mgn   = margin(p)
                    const isOut = p.stock === 0
                    const isLow = !isOut && p.trackInventory && p.stock <= p.lowStockThreshold
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isOut ? 'bg-red-50/20' : isLow ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                              {p.images[0]
                                ? <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                                : <Package size={16} className="absolute inset-0 m-auto text-slate-300" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{p.sku ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg">{p.category.name}</span>
                        </td>
                        <td className="px-4 py-4">
                          {p.supplier ? (
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{p.supplier.name}</p>
                              {p.supplier.email && <p className="text-[10px] text-slate-400">{p.supplier.email}</p>}
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          <InlineNumber
                            value={p.salePrice ?? p.price}
                            format={formatPrice}
                            onSave={v => patchProduct(p.id, { salePrice: v })}
                            className="font-bold text-slate-900 text-sm"
                          />
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">CP:</span>
                            <InlineNumber
                              value={p.costPrice}
                              format={formatPrice}
                              onSave={v => patchProduct(p.id, { costPrice: v })}
                              className="text-[10px] text-slate-400"
                            />
                            {mgn !== null && (
                              <span className={`text-[10px] font-bold px-1 rounded ${mgn >= 20 ? 'text-green-600' : mgn >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                {mgn}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {p.trackInventory ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400'}`}
                                  style={{ width: `${Math.min((p.stock / Math.max(p.lowStockThreshold * 3, 1)) * 100, 100)}%` }} />
                              </div>
                              <span
                                onDoubleClick={() => { setModal(p); setAdjType('PURCHASE'); setAdjQty(''); setAdjNote('') }}
                                title="Double-click to adjust stock"
                                className="font-bold text-sm text-slate-900 cursor-pointer group/stock flex items-center gap-1 select-none"
                              >
                                {p.stock}
                                <span className="opacity-0 group-hover/stock:opacity-40 text-primary text-[9px] font-bold">✎</span>
                              </span>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${stock.cls}`}>{stock.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => patchProduct(p.id, { isActive: !p.isActive })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Toggle active">
                              {p.isActive ? 'Active' : 'Draft'}
                            </button>
                            {p.isFeatured && (
                              <button onClick={() => patchProduct(p.id, { isFeatured: false })}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors" title="Remove featured">
                                ★ Featured
                              </button>
                            )}
                            {!p.isFeatured && (
                              <button onClick={() => patchProduct(p.id, { isFeatured: true })}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 cursor-pointer transition-colors" title="Mark featured">
                                ☆
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 justify-end">
                            {p.trackInventory && (
                              <button onClick={() => { setModal(p); setAdjType('PURCHASE'); setAdjQty(''); setAdjNote('') }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-bg text-primary hover:bg-primary hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer">
                                <Plus size={11} /> Stock
                              </button>
                            )}
                            <Link href={`/products/${p.slug}`}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-bg rounded-lg transition-colors cursor-pointer">
                              <Eye size={14} />
                            </Link>
                            <Link href={`/admin/products/${p.id}/edit`}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex">
                              <Edit2 size={14} />
                            </Link>
                            <button onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {tab === 'products' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-bold rounded-xl transition-colors cursor-pointer ${p === page ? 'bg-primary text-white shadow-sm shadow-primary/25' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Stock history table */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
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
                  const meta = TYPE_META[log.type] ?? { label: log.type, cls: 'bg-slate-100 text-slate-600' }
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
      )}

      {/* Adjustment modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-slate-900">Adjust Stock</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{modal.name}</p>
            <p className="text-xs text-slate-400 mb-5">Current stock: <strong className="text-slate-700">{modal.stock}</strong></p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['PURCHASE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'] as const).map(t => (
                <button key={t} onClick={() => setAdjType(t)}
                  className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${adjType === t ? 'border-primary bg-primary-bg text-primary' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                  {t === 'PURCHASE' ? '+ Restock' : t === 'RETURN' ? '+ Return' : t === 'DAMAGE' ? '- Damage' : '± Adjust'}
                </button>
              ))}
            </div>
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

      {/* Delete ALL modal */}
      {deleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="font-heading font-bold text-slate-900 text-lg text-center mb-1">Delete ALL Products?</h3>
            <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
              This will permanently delete all <strong className="text-slate-800">{products.length} products</strong>, variants, options, and inventory logs. Orders are preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmDeleteAll} disabled={deletingAll}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl cursor-pointer">
                {deletingAll ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={14} /> Delete All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete single modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="font-heading font-bold text-slate-900 text-lg text-center mb-1">Delete Product?</h3>
            <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
              <strong className="text-slate-800">&ldquo;{deleteTarget.name}&rdquo;</strong> will be removed. Order history is preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl cursor-pointer">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, Plus, Search, Filter, Edit2, Trash2, Eye,
  Download, Upload, Loader2, CheckCircle2, AlertTriangle, X,
  Building2, TrendingUp, TrendingDown,
  Minus, History, Warehouse, CheckSquare, Square, Zap,
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

// ── Inline editable number cell (desktop only — double-click) ──────────────
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
        className="w-20 px-1.5 py-0.5 text-[13px] font-bold border-2 border-primary rounded-lg outline-none text-slate-900 bg-primary-bg"
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
  const [supFilter,    setSupFilter]    = useState('')   // supplier id
  const [categories,   setCategories]  = useState<{id:string;name:string;slug:string}[]>([])
  const [suppliers,    setSuppliers]   = useState<{id:string;name:string}[]>([])
  const [showFilters,  setShowFilters]  = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delete (single)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // Bulk select
  const [selected,          setSelected]          = useState<Set<string>>(new Set())
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false)
  const [bulkDeleting,      setBulkDeleting]      = useState(false)

  const allOnPageSelected = products.length > 0 && products.every(p => selected.has(p.id))
  const someOnPageSelected = !allOnPageSelected && products.some(p => selected.has(p.id))

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleSelectAllOnPage() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allOnPageSelected) { products.forEach(p => next.delete(p.id)) }
      else                   { products.forEach(p => next.add(p.id)) }
      return next
    })
  }
  function clearSelection() { setSelected(new Set()) }

  async function confirmBulkDelete() {
    setBulkDeleting(true)
    const ids = Array.from(selected)
    const res = await fetch('/api/admin/products/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) { clearSelection(); setBulkDeleteOpen(false); void load() }
    setBulkDeleting(false)
  }

  // Import / Export
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Inventory adjustment
  const [modal,    setModal]    = useState<Product | null>(null)
  const [adjType,  setAdjType]  = useState<'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'>('PURCHASE')
  const [adjQty,   setAdjQty]   = useState('')
  const [adjNote,  setAdjNote]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [adjError, setAdjError] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  function buildUrl(overrides: Record<string, string | number> = {}) {
    const p = new URLSearchParams({
      admin: 'true', limit: String(PAGE_SIZE), page: String(page), sort,
      ...(search       ? { search }              : {}),
      ...(catFilter    ? { category: catFilter } : {}),
      ...(supFilter    ? { supplier: supFilter } : {}),
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

  // Fetch categories + suppliers for the filter dropdowns
  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(d => setCategories(d.categories ?? [])).catch(() => {})
    fetch('/api/admin/suppliers').then(r => r.json()).then(d => setSuppliers(d.suppliers ?? [])).catch(() => {})
  }, [])

  // Reload when filters change (debounce search)
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => { load() }, search ? 300 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, sort, catFilter, supFilter, statusFilter, stockFilter])

  function applyFilter(key: string, val: string) {
    setPage(1)
    if (key === 'status') setStatusFilter(val)
    if (key === 'stock')  setStockFilter(val)
    if (key === 'cat')    setCatFilter(val)
    if (key === 'sup')    setSupFilter(val)
    if (key === 'sort')   setSort(val)
  }

  function openHistory() { setTab('history'); loadLogs() }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = [catFilter, supFilter, statusFilter, stockFilter].filter(Boolean).length

  async function submitAdjustment() {
    if (!modal || !adjQty) return
    setSaving(true)
    setAdjError(null)
    try {
      const res  = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: modal.id, type: adjType, quantity: Number(adjQty), note: adjNote }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAdjError(data.error || `Failed (HTTP ${res.status})`)
      } else {
        setModal(null); setAdjQty(''); setAdjNote('')
        setLogsLoaded(false)
        load()
      }
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null); setDeleting(false)
    void load()
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
    setInlineError(null)
    try {
      const res     = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInlineError(updated.error || `Failed to save (HTTP ${res.status})`)
        setTimeout(() => setInlineError(null), 4500)
        return
      }
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    } catch (e) {
      setInlineError(e instanceof Error ? e.message : String(e))
      setTimeout(() => setInlineError(null), 4500)
    }
  }

  async function makeDealOfTheDay(p: Product) {
    if (!confirm(`Make "${p.name}" the Deal of the Day for 24h with 20% off?`)) return
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salePrice:           Math.round(p.price * 0.8 * 100) / 100,
        salePriceStartsAt:   new Date().toISOString(),
        salePriceExpiresAt:  expires,
        isDealOfTheDay:      true,
      }),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? 'Failed to set as DOTD'); return }
    window.location.href = `/admin/products/${p.id}/edit`
  }

  function openStock(p: Product) { setModal(p); setAdjType('PURCHASE'); setAdjQty(''); setAdjNote('') }

  // Server-side filtering — these counts reflect the current page only
  const tracked    = products.filter(p => p.trackInventory)
  const outOfStock = tracked.filter(p => p.stock === 0)
  const lowStock   = tracked.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold)
  const healthy    = tracked.filter(p => p.stock > p.lowStockThreshold)
  const untracked  = products.filter(p => !p.trackInventory)

  // ── Shared per-product bits ───────────────────────────────────────────────
  function StatusToggles({ p, compact = false }: { p: Product; compact?: boolean }) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => patchProduct(p.id, { isActive: !p.isActive })}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          title="Toggle active / draft">
          {p.isActive ? 'Active' : 'Draft'}
        </button>
        <button onClick={() => patchProduct(p.id, { isFeatured: !p.isFeatured })}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${p.isFeatured ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
          title={p.isFeatured ? 'Remove featured' : 'Mark featured'}>
          {p.isFeatured ? '★ Featured' : (compact ? '☆ Feature' : '☆')}
        </button>
      </div>
    )
  }

  function RowActions({ p }: { p: Product }) {
    return (
      <div className="flex items-center gap-0.5 justify-end">
        {p.trackInventory && (
          <button onClick={() => openStock(p)} title="Adjust stock"
            className="flex items-center gap-1 px-2 py-1 bg-primary-bg text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer">
            <Plus size={10} /> Stock
          </button>
        )}
        <Link href={`/products/${p.slug}`} title="View on storefront"
          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-bg rounded-lg transition-colors cursor-pointer">
          <Eye size={13} />
        </Link>
        <button type="button" title="Make 24h Deal of the Day (20% off)" onClick={() => makeDealOfTheDay(p)}
          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer">
          <Zap size={13} />
        </button>
        <Link href={`/admin/products/${p.id}/edit`} title="Edit"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex">
          <Edit2 size={13} />
        </Link>
        <button onClick={() => setDeleteTarget(p)} title="Delete"
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  function StockCell({ p }: { p: Product }) {
    const stock = STOCK_STATUS(p)
    const isOut = p.stock === 0
    const isLow = !isOut && p.trackInventory && p.stock <= p.lowStockThreshold
    if (!p.trackInventory) return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${stock.cls}`}>{stock.label}</span>
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
          <div className={`h-full rounded-full ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400'}`}
            style={{ width: `${Math.min((p.stock / Math.max(p.lowStockThreshold * 3, 1)) * 100, 100)}%` }} />
        </div>
        <span onDoubleClick={() => openStock(p)} title="Double-click to adjust stock"
          className={`font-bold text-[13px] cursor-pointer group/stock inline-flex items-center gap-1 select-none ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
          {p.stock}
          <span className="opacity-0 group-hover/stock:opacity-40 text-primary text-[9px] font-bold">✎</span>
        </span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-heading font-extrabold text-xl md:text-2xl text-slate-900 flex items-center gap-2">
            <Warehouse size={20} className="text-primary" /> Products &amp; Inventory
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            {loading ? '…' : `${total} products`}
            {outOfStock.length > 0 && <span className="ml-2 text-red-600 font-bold">· {outOfStock.length} out</span>}
            {lowStock.length  > 0 && <span className="ml-2 text-amber-600 font-bold">· {lowStock.length} low</span>}
          </p>
        </div>
        {/* Actions — wrap on small screens; Add Product is primary */}
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} <span className="hidden sm:inline">Import</span>
          </button>
          <Link href="/admin/import" title="Daraz Excel Import"
            className="flex items-center gap-1.5 px-3 py-2 border border-violet-200 bg-violet-50 rounded-xl text-[13px] font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer">
            <Upload size={14} /> <span className="hidden sm:inline">Daraz</span>
          </Link>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
          <Link href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold text-[13px] rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {/* Inventory stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4 mb-5">
          {[
            { label: 'Healthy',      value: healthy.length,    icon: TrendingUp,    color: 'bg-green-50 text-green-600',  border: 'border-green-100' },
            { label: 'Low Stock',    value: lowStock.length,   icon: AlertTriangle, color: 'bg-amber-50 text-amber-600',  border: 'border-amber-100' },
            { label: 'Out of Stock', value: outOfStock.length, icon: TrendingDown,  color: 'bg-red-50 text-red-600',      border: 'border-red-100'   },
            { label: 'Not Tracked',  value: untracked.length,  icon: Package,       color: 'bg-slate-50 text-slate-500',  border: 'border-slate-100' },
          ].map(({ label, value, icon: Icon, color, border }) => (
            <div key={label} className={`bg-white rounded-2xl border ${border} p-3 md:p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-xl text-slate-900 leading-none">{value}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-2xl border ${importResult.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          {importResult.errors.length
            ? <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            : <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-bold text-[13px] text-slate-800">
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] sm:max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search name, SKU, brand…"
                className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>

            {/* Sort */}
            <select value={sort} onChange={e => applyFilter('sort', e.target.value)}
              className="px-3 py-2.5 text-[13px] border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer text-slate-700">
              <option value="newest">Newest first</option>
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="stock-asc">Stock ↑</option>
              <option value="stock-desc">Stock ↓</option>
              <option value="rating">Top rated</option>
            </select>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${showFilters || activeFilters > 0 ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={14} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && <span className="bg-primary text-white text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
            </button>

            <Link href="/admin/suppliers"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-[13px] text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              <Building2 size={14} /> Suppliers
            </Link>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:flex md:items-end gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select value={catFilter} onChange={e => applyFilter('cat', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer md:min-w-[140px]">
                  <option value="">All categories</option>
                  {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </div>

              {/* Supplier (new) */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Supplier</label>
                <select value={supFilter} onChange={e => applyFilter('sup', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer md:min-w-[140px]">
                  <option value="">All suppliers</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <div className="flex gap-1">
                  {[['', 'All'], ['active', 'Active'], ['draft', 'Draft']].map(([v, l]) => (
                    <button key={v} onClick={() => applyFilter('status', v)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${statusFilter === v ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Stock</label>
                <div className="flex gap-1">
                  {[['', 'All'], ['low', 'Low'], ['out', 'Out']].map(([v, l]) => (
                    <button key={v} onClick={() => applyFilter('stock', v)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${stockFilter === v ? 'border-primary bg-primary-bg text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFilters > 0 && (
                <button onClick={() => { setCatFilter(''); setSupFilter(''); setStatusFilter(''); setStockFilter(''); setPage(1) }}
                  className="col-span-2 md:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer md:mt-auto">
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Products (desktop table) ── */}
      {tab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">{search || activeFilters > 0 ? 'No products match your filters' : 'No products yet'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table — fits one screen, no horizontal scroll */}
              <table className="hidden md:table w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
                    <th className="w-9 pl-4 py-2.5">
                      <button onClick={toggleSelectAllOnPage} title={allOnPageSelected ? 'Clear selection' : 'Select all on page'}
                        className="text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center">
                        {allOnPageSelected
                          ? <CheckSquare size={15} className="text-primary" />
                          : someOnPageSelected ? <CheckSquare size={15} className="text-primary opacity-60" /> : <Square size={15} />}
                      </button>
                    </th>
                    <th className="text-left px-2 py-2.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="text-left px-2 py-2.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider w-[124px]">Price / Cost</th>
                    <th className="text-left px-2 py-2.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider w-[120px]">Stock</th>
                    <th className="text-left px-2 py-2.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider w-[130px]">Status</th>
                    <th className="px-2 py-2.5 w-[176px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map(p => {
                    const mgn   = margin(p)
                    const isOut = p.stock === 0
                    const isLow = !isOut && p.trackInventory && p.stock <= p.lowStockThreshold
                    const isSel = selected.has(p.id)
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isSel ? 'bg-primary-bg/40' : isOut ? 'bg-red-50/20' : isLow ? 'bg-amber-50/20' : ''}`}>
                        <td className="w-9 pl-4 py-2.5 align-top">
                          <button onClick={() => toggleSelected(p.id)}
                            className="text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center mt-1">
                            {isSel ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                          </button>
                        </td>
                        {/* Product — folds in category + supplier to save columns */}
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                              {p.images[0]
                                ? <Image src={p.images[0]} alt={p.name} fill sizes="36px" className="object-cover" />
                                : <Package size={14} className="absolute inset-0 m-auto text-slate-300" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-[13px] leading-tight truncate">{p.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded truncate max-w-[120px]">{p.category.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">{p.sku ?? '—'}</span>
                              </div>
                              {p.supplier && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                                  <Building2 size={9} /> {p.supplier.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Price / Cost */}
                        <td className="px-2 py-2.5 align-top">
                          <InlineNumber value={p.salePrice ?? p.price} format={formatPrice}
                            onSave={v => patchProduct(p.id, { salePrice: v })} className="font-bold text-slate-900 text-[13px]" />
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">CP:</span>
                            <InlineNumber value={p.costPrice} format={formatPrice}
                              onSave={v => patchProduct(p.id, { costPrice: v })} className="text-[10px] text-slate-400" />
                            {mgn !== null && (
                              <span className={`text-[10px] font-bold px-1 rounded ${mgn >= 20 ? 'text-green-600' : mgn >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{mgn}%</span>
                            )}
                          </div>
                        </td>
                        {/* Stock */}
                        <td className="px-2 py-2.5 align-top"><StockCell p={p} /></td>
                        {/* Status */}
                        <td className="px-2 py-2.5 align-top"><StatusToggles p={p} /></td>
                        {/* Actions */}
                        <td className="px-2 py-2.5 align-top"><RowActions p={p} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {products.map(p => {
                  const mgn   = margin(p)
                  const isSel = selected.has(p.id)
                  return (
                    <div key={p.id} className={`p-3 ${isSel ? 'bg-primary-bg/40' : ''}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleSelected(p.id)} className="mt-1 text-slate-400 hover:text-primary cursor-pointer shrink-0">
                          {isSel ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                        </button>
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          {p.images[0]
                            ? <Image src={p.images[0]} alt={p.name} fill sizes="48px" className="object-cover" />
                            : <Package size={16} className="absolute inset-0 m-auto text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[13px] leading-tight">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{p.category.name}</span>
                            {p.sku && <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>}
                          </div>
                          {p.supplier && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Building2 size={9} /> {p.supplier.name}</p>}
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{formatPrice(p.salePrice ?? p.price)}</span>
                              {p.costPrice && (
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                  CP {formatPrice(p.costPrice)}{mgn !== null && <span className={`ml-1 font-bold ${mgn >= 20 ? 'text-green-600' : mgn >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{mgn}%</span>}
                                </span>
                              )}
                            </div>
                            <StockCell p={p} />
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-2.5">
                            <StatusToggles p={p} compact />
                            <RowActions p={p} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating bulk-action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up px-4">
          <div className="flex items-center gap-3 bg-slate-900 text-white pl-5 pr-2 py-2 rounded-2xl shadow-2xl shadow-slate-900/30 border border-slate-800">
            <span className="text-sm font-bold">{selected.size} selected</span>
            <span className="w-px h-5 bg-slate-700" />
            <button onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
              Clear
            </button>
            <button onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 transition-colors cursor-pointer">
              <Trash2 size={13} /> Delete {selected.size}
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {tab === 'products' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1 gap-2 flex-wrap">
          <p className="text-xs text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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

      {/* Stock history */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                <th className="text-left px-4 md:px-6 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Product</th>
                <th className="text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Qty</th>
                <th className="text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">After</th>
                <th className="text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Note</th>
                <th className="text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date</th>
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
                      <td className="px-4 md:px-6 py-3 text-[13px] font-medium text-slate-800">{log.product.name}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.cls}`}>{meta.label}</span></td>
                      <td className="px-3 py-3"><span className={`font-bold text-[13px] ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{log.quantity > 0 ? '+' : ''}{log.quantity}</span></td>
                      <td className="px-3 py-3 font-bold text-slate-900 text-[13px]">{log.stockAfter}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{log.note ?? (log.referenceId ? `Ref: ${log.referenceId.slice(0, 8)}` : '—')}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
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
            {adjError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">{adjError}</div>
            )}
            <button onClick={submitAdjustment} disabled={!adjQty || saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      )}

      {/* Inline-edit error toast */}
      {inlineError && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-start gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-2xl shadow-lg max-w-sm">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-snug flex-1">{inlineError}</p>
          <button onClick={() => setInlineError(null)} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Bulk delete modal */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="font-heading font-bold text-slate-900 text-lg text-center mb-1">Delete {selected.size} product{selected.size !== 1 ? 's' : ''}?</h3>
            <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
              Permanently remove <strong className="text-slate-800">{selected.size}</strong> product{selected.size !== 1 ? 's' : ''}, their variants, options, inventory logs, reviews, and wishlist entries. Order history is preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmBulkDelete} disabled={bulkDeleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl cursor-pointer">
                {bulkDeleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={14} /> Delete {selected.size}</>}
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

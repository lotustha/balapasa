'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, Plus, Search, Filter, Edit2, Trash2, Eye,
  Download, Upload, Loader2, CheckCircle2, AlertTriangle, X,
  Building2, Sparkles,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string; name: string; slug: string; sku: string | null; brand: string | null
  price: number; salePrice: number | null; costPrice: number | null
  stock: number; lowStockThreshold: number; isActive: boolean; isFeatured: boolean
  images: string[]; createdAt: string
  category: { name: string }
  supplier: { name: string; email: string | null } | null
}

const STOCK_STATUS = (p: Product) => {
  if (p.stock === 0)                      return { label: 'Out of stock',    cls: 'bg-red-100 text-red-700'    }
  if (p.stock <= p.lowStockThreshold)     return { label: `Low (${p.stock})`, cls: 'bg-amber-100 text-amber-700' }
  return                                         { label: `${p.stock} units`, cls: 'bg-green-100 text-green-700'  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [deleteTarget,  setDeleteTarget]  = useState<Product | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll,   setDeletingAll]   = useState(false)

  async function confirmDeleteAll() {
    setDeletingAll(true)
    const res = await fetch('/api/admin/products/all', { method: 'DELETE' })
    if (res.ok) { setProducts([]); setDeleteAllOpen(false) }
    setDeletingAll(false)
  }
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/products?limit=200')
      const data = await res.json()
      setProducts(data.products ?? data ?? [])
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null); setDeleting(false)
    load()
  }

  async function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/admin/products/export'
    a.download = ''
    a.click()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch('/api/admin/products/import', { method: 'POST', body: form })
      const data = await res.json()
      setImportResult(data)
      if (data.success) load()
    } catch { setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['Network error'] }) }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function margin(p: Product) {
    if (!p.costPrice || !p.price) return null
    const sell = p.salePrice ?? p.price
    return Math.round(((sell - p.costPrice) / sell) * 100)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? '…' : `${products.length} products`}
            {products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length > 0 && (
              <span className="ml-2 text-amber-600 font-bold">
                · {products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length} low stock
              </span>
            )}
            {products.filter(p => p.stock === 0).length > 0 && (
              <span className="ml-2 text-red-600 font-bold">
                · {products.filter(p => p.stock === 0).length} out of stock
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import Excel
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={14} /> Export Excel
          </button>
          {/* Delete all */}
          {products.length > 0 && (
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete All
            </button>
          )}
          {/* Add */}
          <Link href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 flex items-start gap-3 px-5 py-4 rounded-2xl border ${importResult.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          {importResult.errors.length
            ? <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            : <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
          }
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

      {/* Excel template hint */}
      <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <Upload size={12} className="shrink-0" />
        <span>Import Excel columns: <strong>SKU, Name, Description, Category, Brand, Supplier, Supplier Email, Supplier Phone, Price, Sale Price, Cost Price, Stock, Low Stock Alert, Barcode, Weight (kg), Tags, Is Active, Is Featured, Is New, Is Taxable</strong></span>
        <button onClick={handleExport} className="ml-auto shrink-0 underline cursor-pointer hover:text-blue-900">Download template</button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU or supplier…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
          <Filter size={14} /> Filter
        </button>
        <Link href="/admin/suppliers"
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
          <Building2 size={14} /> Suppliers
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Package size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">{search ? 'No products match your search' : 'No products yet'}</p>
                    {!search && <p className="text-slate-300 text-xs mt-1">Use &quot;Add Product&quot; or import an Excel file</p>}
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const stock  = STOCK_STATUS(p)
                  const mgn    = margin(p)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {p.images[0]
                              ? <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                              : <Package size={16} className="absolute inset-0 m-auto text-slate-300" />
                            }
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
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900 text-sm">{formatPrice(p.salePrice ?? p.price)}</p>
                        {p.costPrice && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[10px] text-slate-400">Cost {formatPrice(p.costPrice)}</p>
                            {mgn !== null && (
                              <span className={`text-[10px] font-bold px-1 rounded ${mgn >= 20 ? 'text-green-600' : mgn >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                {mgn}% margin
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${stock.cls}`}>{stock.label}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.isActive ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
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

      {/* ── Delete ALL confirmation modal ──────────────────────── */}
      {deleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg text-center mb-1">Delete ALL Products?</h3>
            <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
              This will permanently delete all <strong className="text-slate-800">{products.length} products</strong>, their variants, options, and inventory logs. Orders are preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDeleteAll} disabled={deletingAll}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
                {deletingAll ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={14} /> Delete All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg text-center mb-1">Delete Product?</h3>
            <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
              <strong className="text-slate-800">&ldquo;{deleteTarget.name}&rdquo;</strong> will be deactivated and hidden from the store. Order history is preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
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

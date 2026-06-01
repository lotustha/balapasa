'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Mail, Phone, MapPin, Package, Search, AlertTriangle,
  Send, ChevronDown, StickyNote, Loader2, CheckCircle, X, ShieldAlert,
} from 'lucide-react'
import SupplierCreateButton from './SupplierCreateButton'
import SupplierEditButton from './SupplierEditButton'
import { useConfirm } from '@/components/ui/useConfirm'

export interface LowStockItem {
  id: string; name: string; sku: string | null; stock: number; lowStockThreshold: number
}
export interface SupplierCardData {
  id: string; name: string; contactName: string | null; email: string | null
  phone: string | null; address: string | null; notes: string | null
  isActive: boolean; productCount: number; lowStock: LowStockItem[]
}

// Suggested reorder qty: top the product back up to roughly 2× its threshold,
// never below the threshold itself. Just a starting number — admin can edit.
const suggestQty = (i: LowStockItem) => Math.max(i.lowStockThreshold, i.lowStockThreshold * 2 - i.stock)

type StatusFilter = 'all' | 'active' | 'inactive'

export default function SuppliersBoard({ suppliers }: { suppliers: SupplierCardData[] }) {
  const { confirm, dialog } = useConfirm()
  const [role, setRole]       = useState<string | null>(null)
  const [q, setQ]             = useState('')
  const [status, setStatus]   = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [qtys, setQtys]       = useState<Record<string, number>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [toast, setToast]     = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.role ?? null)).catch(() => {})
  }, [])
  const isAdmin = role === 'ADMIN'

  function flash(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(t => (t?.msg === msg ? null : t)), 3500)
  }

  const totalProducts = useMemo(() => suppliers.reduce((s, x) => s + x.productCount, 0), [suppliers])
  const activeCount   = useMemo(() => suppliers.filter(s => s.isActive).length, [suppliers])
  const totalLow      = useMemo(() => suppliers.reduce((s, x) => s + x.lowStock.length, 0), [suppliers])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return suppliers.filter(s => {
      if (status === 'active'   && !s.isActive) return false
      if (status === 'inactive' &&  s.isActive) return false
      if (!needle) return true
      return [s.name, s.contactName, s.email, s.phone, s.address]
        .some(v => v?.toLowerCase().includes(needle))
    })
  }, [suppliers, q, status])

  async function sendPO(supplier: SupplierCardData, item: LowStockItem) {
    if (!isAdmin) { flash('err', 'Only admins can send purchase orders.'); return }
    if (!supplier.email) { flash('err', `Add an email to ${supplier.name} first.`); return }
    const qty = qtys[item.id] ?? suggestQty(item)
    if (!(qty > 0)) { flash('err', 'Enter a quantity above 0.'); return }
    const ok = await confirm({
      title: 'Send purchase order?',
      message: <>Email <b>{supplier.name}</b> ({supplier.email}) a PO for <b>{qty}</b> × <b>{item.name}</b>?</>,
      confirmLabel: 'Send PO', tone: 'primary',
    })
    if (!ok) return
    setSending(item.id)
    try {
      const res  = await fetch(`/api/admin/products/${item.id}/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { flash('err', data.error ?? 'Could not send the PO.'); return }
      flash('ok', `PO sent to ${data.sentTo ?? supplier.email}.`)
    } catch {
      flash('err', 'Could not send. Please try again.')
    } finally {
      setSending(null)
    }
  }

  const stats = [
    { label: 'Suppliers',        value: suppliers.length, icon: Building2, color: 'text-primary',    bg: 'bg-primary-bg' },
    { label: 'Active',           value: activeCount,      icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Products sourced', value: totalProducts,    icon: Package,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Low-stock items',  value: totalLow,         icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="p-4 md:p-8">
      {dialog}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div>
          <a href="/admin/products" className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 mb-1 cursor-pointer">← Products</a>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sourcing, contacts &amp; low-stock reorders</p>
        </div>
        <SupplierCreateButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xl text-slate-900 leading-none">{value}</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name, contact, email, phone, address…"
            aria-label="Search suppliers"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${status === s ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No suppliers yet</p>
          <p className="text-slate-300 text-xs mt-1">Add suppliers to track product sourcing</p>
          <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
            Tip: Suppliers are also auto-created when you import products via Excel with a Supplier column.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
          <Search size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No suppliers match your search</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const isOpen = expanded === s.id
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{s.name}</p>
                      {s.contactName && <p className="text-xs text-slate-400 truncate">{s.contactName}</p>}
                    </div>
                  </div>
                  <SupplierEditButton supplier={{
                    id: s.id, name: s.name, contactName: s.contactName, email: s.email,
                    phone: s.phone, address: s.address, notes: s.notes, isActive: s.isActive,
                    productCount: s.productCount,
                  }} />
                </div>

                <div className="space-y-1.5">
                  {s.email && <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0"><Mail size={11} className="text-slate-400 shrink-0" /> <span className="truncate">{s.email}</span></div>}
                  {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={11} className="text-slate-400 shrink-0" /> {s.phone}</div>}
                  {s.address && <div className="flex items-start gap-2 text-xs text-slate-500"><MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{s.address}</span></div>}
                  {s.notes && <div className="flex items-start gap-2 text-xs text-slate-400 italic"><StickyNote size={11} className="text-slate-300 shrink-0 mt-0.5" /> <span className="line-clamp-2">{s.notes}</span></div>}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Package size={11} /> {s.productCount} product{s.productCount !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.lowStock.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={10} /> {s.lowStock.length} low
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Low-stock reorder panel */}
                {s.lowStock.length > 0 && (
                  <div className="mt-3">
                    <button type="button" onClick={() => setExpanded(isOpen ? null : s.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/70 transition-colors cursor-pointer text-amber-800">
                      <span className="text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} /> Reorder {s.lowStock.length} low-stock item{s.lowStock.length !== 1 ? 's' : ''}</span>
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="mt-2 space-y-2">
                        {!isAdmin && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 px-1"><ShieldAlert size={11} /> Purchase orders can only be sent by an admin.</p>
                        )}
                        {isAdmin && !s.email && (
                          <p className="text-[10px] text-amber-600 flex items-center gap-1 px-1"><ShieldAlert size={11} /> Add an email to this supplier to send POs.</p>
                        )}
                        {s.lowStock.map(item => {
                          const qty = qtys[item.id] ?? suggestQty(item)
                          const canSend = isAdmin && !!s.email
                          return (
                            <div key={item.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-100">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400">{item.stock} in stock · threshold {item.lowStockThreshold}</p>
                              </div>
                              <input
                                type="number" min={1} value={qty}
                                onChange={e => setQtys(m => ({ ...m, [item.id]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
                                aria-label={`Reorder quantity for ${item.name}`}
                                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:border-primary"
                              />
                              <button type="button" onClick={() => sendPO(s, item)} disabled={!canSend || sending === item.id}
                                title={canSend ? 'Email a purchase order' : 'Admin + supplier email required'}
                                className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0">
                                {sending === item.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} PO
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-fade-in ${toast.kind === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.kind === 'ok' ? <CheckCircle size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

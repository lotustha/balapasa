'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Building2, AlertCircle, Trash2, Save } from 'lucide-react'

interface FormState {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  notes: string
  isActive: boolean
}

const EMPTY: FormState = {
  name: '', contactName: '', email: '', phone: '', address: '', notes: '', isActive: true,
}

export interface SupplierForDialog {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  productCount: number
}

interface Props {
  open:      boolean
  onClose:   () => void
  supplier?: SupplierForDialog | null   // present → edit mode; absent → create mode
}

export default function SupplierFormDialog({ open, onClose, supplier }: Props) {
  const router = useRouter()
  const isEdit = !!supplier
  const [form, setForm]     = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Confirm delete state
  const [confirmDel, setConfirmDel] = useState<null | { productCount: number }>(null)

  // Hydrate form when opening / when supplier changes
  useEffect(() => {
    if (!open) return
    if (supplier) {
      setForm({
        name:        supplier.name,
        contactName: supplier.contactName ?? '',
        email:       supplier.email       ?? '',
        phone:       supplier.phone       ?? '',
        address:     supplier.address     ?? '',
        notes:       supplier.notes       ?? '',
        isActive:    supplier.isActive,
      })
    } else {
      setForm(EMPTY)
    }
    setError(null)
    setConfirmDel(null)
  }, [open, supplier])

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function close() {
    if (saving) return
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Supplier name is required'); return }
    setSaving(true); setError(null)
    try {
      const url = isEdit ? `/api/admin/suppliers/${supplier!.id}` : '/api/admin/suppliers'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete(force: boolean) {
    if (!supplier) return
    setSaving(true); setError(null)
    try {
      const qs  = force ? '?force=1' : ''
      const res = await fetch(`/api/admin/suppliers/${supplier.id}${qs}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.code === 'HAS_PRODUCTS') {
        setConfirmDel({ productCount: data.productCount })
        return
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  async function softDelete() {
    if (!supplier) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Soft-delete failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in"
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 id="supplier-modal-title" className="font-heading font-extrabold text-slate-900 text-lg leading-tight">
                {isEdit ? 'Edit supplier' : 'Add supplier'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {isEdit && supplier ? `${supplier.productCount} linked product${supplier.productCount === 1 ? '' : 's'}` : 'Track sourcing and contact details'}
              </p>
            </div>
          </div>
          <button onClick={close} aria-label="Close"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0">
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Body */}
        {confirmDel ? (
          // ── Delete-confirmation step ───────────────────────────────────────
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Supplier has {confirmDel.productCount} linked product{confirmDel.productCount === 1 ? '' : 's'}</p>
                <p className="text-xs mt-1 text-amber-700">
                  Choose how to handle them. Products themselves are kept either way.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button" onClick={softDelete} disabled={saving}
                className="w-full flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:border-primary hover:bg-primary-bg/30 transition-colors cursor-pointer disabled:opacity-50 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-amber-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Mark inactive (recommended)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Hide from active list. Products stay linked. Reversible.</p>
                </div>
              </button>

              <button
                type="button" onClick={() => doDelete(true)} disabled={saving}
                className="w-full flex items-start gap-3 p-4 rounded-2xl border border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 size={15} className="text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-red-700 text-sm">Delete + unlink {confirmDel.productCount} product{confirmDel.productCount === 1 ? '' : 's'}</p>
                  <p className="text-xs text-red-500 mt-0.5">Permanently removes the supplier. Products lose their supplier reference (set to none).</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setConfirmDel(null)} disabled={saving}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // ── Form step ──────────────────────────────────────────────────────
          <form onSubmit={submit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus type="text" value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. Acme Wholesale"
                className={inputCls} required maxLength={120}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person</label>
              <input
                type="text" value={form.contactName}
                onChange={e => update('contactName', e.target.value)}
                placeholder="Full name"
                className={inputCls} maxLength={120}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="hello@supplier.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" inputMode="numeric" value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="98XXXXXXXX"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
              <input type="text" value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Street, city"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea value={form.notes}
                onChange={e => update('notes', e.target.value)}
                rows={3}
                placeholder="Payment terms, lead time, etc."
                className={inputCls + ' resize-y'}
              />
            </div>

            {/* Active toggle (edit mode only) */}
            {isEdit && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">Active</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">When off, supplier is hidden from product picker.</p>
                </div>
                <button type="button"
                  onClick={() => update('isActive', !form.isActive)}
                  aria-label="Toggle active"
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer relative ${form.isActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {/* Left: delete (edit mode only) */}
              <div>
                {isEdit && (
                  <button type="button" onClick={() => doDelete(false)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
              {/* Right: cancel + save */}
              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={saving}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : isEdit
                    ? <><Save size={14} /> Save changes</>
                    : <><Plus size={14} /> Create supplier</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

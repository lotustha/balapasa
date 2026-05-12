'use client'

import { useState, useEffect } from 'react'
import {
  X, Loader2, AlertCircle, Save, Plus, Home, Briefcase, MapPin, Trash2,
} from 'lucide-react'

export interface Address {
  id: string
  label: string
  name: string
  phone: string
  address: string
  house: string | null
  road: string | null
  city: string
  isDefault: boolean
}

interface FormState {
  label:   'Home' | 'Office' | 'Other'
  name:    string
  phone:   string
  address: string
  house:   string
  road:    string
  city:    string
  isDefault: boolean
}

const EMPTY: FormState = {
  label: 'Home', name: '', phone: '', address: '',
  house: '', road: '', city: 'Kathmandu', isDefault: false,
}

interface Props {
  open:      boolean
  onClose:   () => void
  onSaved:   () => void
  address?:  Address | null
  isFirst?:  boolean   // when true, force default + show note
}

const LABEL_CHOICES: Array<{ value: 'Home' | 'Office' | 'Other'; icon: typeof Home }> = [
  { value: 'Home',   icon: Home      },
  { value: 'Office', icon: Briefcase },
  { value: 'Other',  icon: MapPin    },
]

export default function AddressDialog({ open, onClose, onSaved, address, isFirst }: Props) {
  const isEdit = !!address
  const [form, setForm]     = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    if (address) {
      const lbl = (['Home', 'Office', 'Other'] as const).includes(address.label as 'Home') ? address.label as 'Home' : 'Other'
      setForm({
        label:     lbl,
        name:      address.name,
        phone:     address.phone,
        address:   address.address,
        house:     address.house ?? '',
        road:      address.road ?? '',
        city:      address.city,
        isDefault: address.isDefault,
      })
    } else {
      setForm({ ...EMPTY, isDefault: !!isFirst })
    }
    setError(null)
  }, [open, address, isFirst])
  /* eslint-enable react-hooks/set-state-in-effect */

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function close() {
    if (saving) return
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Name, phone, and address are required')
      return
    }
    setSaving(true); setError(null)
    try {
      const url = isEdit ? `/api/account/addresses/${address!.id}` : '/api/account/addresses'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    if (!address) return
    if (!confirm(`Delete address "${address.label}"?`)) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/account/addresses/${address.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in"
      onClick={close}>
      <div onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-extrabold text-slate-900 text-lg leading-tight">
                {isEdit ? 'Edit address' : 'Add address'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {isEdit ? `Update saved delivery details` : 'Save for faster checkout'}
              </p>
            </div>
          </div>
          <button onClick={close} aria-label="Close"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0">
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Label picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address Type</label>
            <div className="grid grid-cols-3 gap-2">
              {LABEL_CHOICES.map(({ value, icon: Icon }) => {
                const active = form.label === value
                return (
                  <button key={value} type="button"
                    onClick={() => update('label', value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                      active ? 'border-primary bg-primary-bg/40' : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                    <Icon size={16} className={active ? 'text-primary' : 'text-slate-500'} />
                    <span className={`text-[11px] font-bold ${active ? 'text-primary' : 'text-slate-700'}`}>{value}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name + phone */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Recipient <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Full name" className={inputCls} required maxLength={120} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Phone <span className="text-red-500">*</span>
              </label>
              <input type="tel" inputMode="numeric" value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="98XXXXXXXX" className={inputCls} required />
            </div>
          </div>

          {/* Address line */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Area / Locality <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="e.g. Naxal, Baluwatar"
              className={inputCls} required />
          </div>

          {/* House + road */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">House / Building</label>
              <input type="text" value={form.house}
                onChange={e => update('house', e.target.value)}
                placeholder="House #12" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Road / Street</label>
              <input type="text" value={form.road}
                onChange={e => update('road', e.target.value)}
                placeholder="Road #5" className={inputCls} />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
            <input type="text" value={form.city}
              onChange={e => update('city', e.target.value)}
              placeholder="Kathmandu" className={inputCls} />
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">Set as default</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isFirst ? 'First address is automatically the default.' : 'Used at checkout unless you pick another.'}
              </p>
            </div>
            <button type="button"
              onClick={() => update('isDefault', !form.isDefault)}
              disabled={isFirst || (isEdit && address?.isDefault)}
              aria-label="Toggle default"
              className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer relative disabled:opacity-60 ${form.isDefault ? 'bg-green-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isDefault ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div>
              {isEdit && (
                <button type="button" onClick={doDelete} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={close} disabled={saving}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.name.trim() || !form.phone.trim() || !form.address.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : isEdit
                  ? <><Save size={14} /> Save changes</>
                  : <><Plus size={14} /> Add address</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

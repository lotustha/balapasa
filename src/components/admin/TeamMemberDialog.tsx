'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertCircle, Save, Plus, ShieldCheck, Trash2, Key } from 'lucide-react'

export interface TeamMember {
  id:        string
  name:      string | null
  email:     string
  phone:     string | null
  role:      'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
  createdAt: string
}

const STAFF_ROLES: Array<'STAFF' | 'MANAGER' | 'ADMIN'> = ['STAFF', 'MANAGER', 'ADMIN']

const ROLE_DESC: Record<string, string> = {
  STAFF:    'View/update orders, customer support only',
  MANAGER:  'Products, orders, customers, analytics',
  ADMIN:    'Full access including settings & logistics',
}

interface Props {
  open:    boolean
  onClose: () => void
  member?: TeamMember | null   // present → edit mode
  /** When inviting from /admin/customers (promote a customer), pass the customer's id */
  promoteFromId?: string
  promoteEmail?:  string
  promoteName?:   string
}

export default function TeamMemberDialog({ open, onClose, member, promoteFromId, promoteEmail, promoteName }: Props) {
  const router  = useRouter()
  const isEdit  = !!member
  const isPromote = !!promoteFromId

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [role,     setRole]     = useState<'STAFF' | 'MANAGER' | 'ADMIN'>('STAFF')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    if (member) {
      setName(member.name ?? '')
      setEmail(member.email)
      setPhone(member.phone ?? '')
      setRole(member.role === 'CUSTOMER' ? 'STAFF' : member.role)
      setPassword('')
    } else {
      setName(promoteName ?? '')
      setEmail(promoteEmail ?? '')
      setPhone('')
      setRole('STAFF')
      setPassword('')
    }
    setError(null)
  }, [open, member, promoteEmail, promoteName])
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    if (saving) return
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }

    setSaving(true); setError(null)
    try {
      let res: Response
      if (isEdit) {
        const body: Record<string, unknown> = { name, phone, role }
        if (password) body.password = password
        res = await fetch(`/api/admin/customers/${member!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else if (isPromote) {
        // Promoting an existing customer — only role changes
        res = await fetch(`/api/admin/customers/${promoteFromId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
      } else {
        // Brand-new team member
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters')
          setSaving(false); return
        }
        res = await fetch('/api/admin/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, phone, role }),
        })
      }
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

  async function doDelete() {
    if (!member) return
    if (!confirm(`Delete ${member.name ?? member.email}? This cannot be undone.`)) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/customers/${member.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onClose()
      router.refresh()
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
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-extrabold text-slate-900 text-lg leading-tight">
                {isEdit ? 'Edit team member' : isPromote ? 'Promote to team' : 'Invite team member'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {isEdit ? member?.email : isPromote ? `${promoteEmail} → team role` : 'Create a staff/manager/admin user'}
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

          {/* Identity */}
          {!isPromote && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Sandesh Karki" className={inputCls} maxLength={120} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="staff@store.com" className={inputCls}
                    required disabled={isEdit /* email is the unique identifier; don't allow change here */} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" inputMode="numeric" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX" className={inputCls} />
              </div>
            </>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              {STAFF_ROLES.map(r => (
                <button key={r} type="button"
                  onClick={() => setRole(r)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer text-left ${
                    role === r ? 'border-primary bg-primary-bg/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-colors ${
                    role === r ? 'border-primary bg-primary' : 'border-slate-300'
                  }`}>
                    {role === r && <span className="block w-1.5 h-1.5 m-auto mt-[3px] rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${role === r ? 'text-primary' : 'text-slate-800'}`}>{r}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ROLE_DESC[r]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          {!isPromote && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {isEdit ? 'New password' : <>Password <span className="text-red-500">*</span></>}
              </label>
              <div className="relative">
                <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'}
                  className={inputCls + ' pl-9 pr-16 font-mono'} minLength={8}
                  required={!isEdit} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer">
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {!isEdit && (
                <p className="text-[10px] text-slate-400 mt-1.5">Share this password with the team member privately. They can change it from their profile after sign-in.</p>
              )}
            </div>
          )}

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
              <button type="submit" disabled={saving || !email.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : isEdit
                  ? <><Save size={14} /> Save changes</>
                  : isPromote
                  ? <><ShieldCheck size={14} /> Promote</>
                  : <><Plus size={14} /> Create</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

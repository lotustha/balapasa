'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Plus, Home, Briefcase, Loader2, Star, Phone, Edit2, CheckCircle2,
} from 'lucide-react'
import AddressDialog, { type Address } from '@/components/account/AddressDialog'

const LABEL_ICONS: Record<string, typeof Home> = {
  Home: Home, Office: Briefcase,
}
const LABEL_COLORS: Record<string, { bg: string; ic: string }> = {
  Home:   { bg: 'bg-violet-50',  ic: 'text-violet-500'  },
  Office: { bg: 'bg-amber-50',   ic: 'text-amber-500'   },
}
function labelMeta(label: string) {
  return { Icon: LABEL_ICONS[label] ?? MapPin, ...(LABEL_COLORS[label] ?? { bg: 'bg-cyan-50', ic: 'text-cyan-500' }) }
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading,   setLoading]   = useState(true)
  const [authed,    setAuthed]    = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Address | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/account/addresses')
      .then(async r => {
        if (r.status === 401) { setAuthed(false); return }
        const d = await r.json()
        setAuthed(true)
        setAddresses(d.addresses ?? [])
      })
      .catch(() => setError('Could not load addresses'))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function setDefault(id: string) {
    setBusyId(id); setError(null)
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-b absolute -top-24 -right-24 w-[400px] h-[400px]"
          style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div className="flex-1">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Saved Addresses</h1>
          </div>
          {authed && addresses.length > 0 && (
            <span className="text-xs font-bold text-slate-400">{addresses.length} saved</span>
          )}
        </div>

        {error && (
          <div className="glass-card p-4 mb-4 flex items-start gap-2 border border-red-100 animate-fade-in">
            <span className="text-red-500 font-bold text-sm">!</span>
            <p className="text-red-700 text-xs font-semibold">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="glass-card p-12 flex justify-center animate-fade-in">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : !authed ? (
          // Not signed in
          <div className="glass-card p-10 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto mb-4">
              <MapPin size={28} className="text-cyan-400" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Sign in to manage addresses</p>
            <p className="text-slate-400 text-xs mt-1.5">Save your delivery addresses for faster checkout.</p>
            <Link href="/login"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Sign In
            </Link>
          </div>
        ) : addresses.length === 0 ? (
          // Empty state
          <>
            <div className="glass-card p-12 text-center animate-fade-in-up mb-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-cyan-400" />
              </div>
              <p className="font-bold text-slate-700 text-sm">No saved addresses</p>
              <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                Save your delivery addresses to check out faster next time.
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary-bg font-bold text-sm transition-colors cursor-pointer animate-fade-in-up"
            >
              <Plus size={16} /> Add your first address
            </button>
          </>
        ) : (
          // Address list
          <div className="space-y-3 animate-fade-in-up">
            {addresses.map(a => {
              const { Icon, bg, ic } = labelMeta(a.label)
              return (
                <div key={a.id}
                  className={`glass-card p-4 transition-all ${a.isDefault ? 'ring-2 ring-primary/20' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon size={17} className={ic} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{a.label}</p>
                        {a.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-bg text-primary text-[10px] font-bold">
                            <Star size={9} className="fill-primary" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{a.name}</p>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {[a.house, a.road].filter(Boolean).join(', ')}
                        {(a.house || a.road) && <br />}
                        {a.address}, {a.city}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Phone size={10} /> {a.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditTarget(a)}
                      aria-label={`Edit ${a.label}`}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-bg rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>

                  {!a.isDefault && (
                    <button
                      onClick={() => setDefault(a.id)}
                      disabled={busyId === a.id}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {busyId === a.id ? (
                        <><Loader2 size={11} className="animate-spin" /> Setting…</>
                      ) : (
                        <><CheckCircle2 size={11} /> Set as default</>
                      )}
                    </button>
                  )}
                </div>
              )
            })}

            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary-bg font-bold text-sm transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add new address
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          Addresses are saved securely and only used for delivery.
        </p>
      </div>

      <AddressDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); load() }}
        isFirst={addresses.length === 0}
      />
      <AddressDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load() }}
        address={editTarget}
      />
    </div>
  )
}

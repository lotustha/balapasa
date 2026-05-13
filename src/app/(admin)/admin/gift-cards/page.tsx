'use client'

import { useEffect, useState } from 'react'
import { Gift, Plus, Copy, Check, Loader2, AlertCircle, Power, Trash2, X as XIcon } from 'lucide-react'

interface GiftCardRow {
  id:             string
  code:           string
  initialValue:   number
  balance:        number
  expiresAt:      string | null
  isActive:       boolean
  issuedToEmail:  string | null
  note:           string | null
  createdAt:      string
  _count:         { redemptions: number }
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function formatNpr(n: number) {
  return 'Rs. ' + Math.round(n).toLocaleString('en-IN')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export default function AdminGiftCardsPage() {
  const [cards,       setCards]       = useState<GiftCardRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [creating,    setCreating]    = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copied,      setCopied]      = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    initialValue:  '',
    expiresInDays: '365',
    issuedToEmail: '',
    note:          '',
    customCode:    '',
  })

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/gift-cards')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setCards(data.cards ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createCard(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError(null)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          initialValue:  Number(form.initialValue),
          expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
          issuedToEmail: form.issuedToEmail || undefined,
          note:          form.note || undefined,
          customCode:    form.customCode || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create')
        return
      }
      setCards(prev => [data.card, ...prev])
      setForm({ initialValue: '', expiresInDays: '365', issuedToEmail: '', note: '', customCode: '' })
      setShowForm(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(card: GiftCardRow) {
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !card.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to update')
        return
      }
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, isActive: !card.isActive } : c))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error')
    }
  }

  async function deleteCard(card: GiftCardRow) {
    if (card._count.redemptions > 0) {
      alert('Cannot delete a card that has been redeemed. Deactivate it instead.')
      return
    }
    if (!confirm(`Delete gift card ${card.code}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to delete')
        return
      }
      setCards(prev => prev.filter(c => c.id !== card.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error')
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  const totalIssued    = cards.reduce((s, c) => s + c.initialValue, 0)
  const totalOutstanding = cards.filter(c => c.isActive).reduce((s, c) => s + c.balance, 0)
  const totalRedeemed  = totalIssued - cards.reduce((s, c) => s + c.balance, 0)

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Marketing</p>
            </div>
            <h1 className="font-heading font-extrabold text-3xl text-slate-900">Gift Cards</h1>
            <p className="text-sm text-slate-500 mt-1">Issue, manage, and track gift card redemptions.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            {showForm ? <><XIcon size={14} /> Cancel</> : <><Plus size={14} /> Issue new</>}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total issued</p>
            <p className="font-heading font-extrabold text-2xl text-slate-900">{formatNpr(totalIssued)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{cards.length} card{cards.length === 1 ? '' : 's'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding balance</p>
            <p className="font-heading font-extrabold text-2xl text-primary">{formatNpr(totalOutstanding)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">on active cards</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total redeemed</p>
            <p className="font-heading font-extrabold text-2xl text-amber-600">{formatNpr(totalRedeemed)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">all-time</p>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={createCard} className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
              <div className="w-0.5 h-4 rounded-full bg-primary" /> Issue new gift card
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Value (NPR) <span className="text-red-400">*</span></label>
                <input type="number" min="1" step="1" required
                  value={form.initialValue}
                  onChange={e => setForm(s => ({ ...s, initialValue: e.target.value }))}
                  placeholder="1000" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expires in (days)</label>
                <input type="number" min="1"
                  value={form.expiresInDays}
                  onChange={e => setForm(s => ({ ...s, expiresInDays: e.target.value }))}
                  placeholder="365" className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank for no expiry</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issued to email</label>
                <input type="email"
                  value={form.issuedToEmail}
                  onChange={e => setForm(s => ({ ...s, issuedToEmail: e.target.value }))}
                  placeholder="recipient@example.com" className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Optional — for your records</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Custom code</label>
                <input type="text"
                  value={form.customCode}
                  onChange={e => setForm(s => ({ ...s, customCode: e.target.value.toUpperCase() }))}
                  placeholder="Leave blank to auto-generate" className={inputCls + ' font-mono'} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note</label>
                <input type="text"
                  value={form.note}
                  onChange={e => setForm(s => ({ ...s, note: e.target.value }))}
                  placeholder="Birthday gift, promo, refund, etc." className={inputCls} />
              </div>
            </div>

            {createError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
                <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{createError}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={creating || !form.initialValue}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer">
                {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create gift card</>}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              Loading gift cards…
            </div>
          ) : error ? (
            <div className="p-6 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              {error}
            </div>
          ) : cards.length === 0 ? (
            <div className="p-12 text-center">
              <Gift size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-heading font-bold text-slate-500 mb-1">No gift cards yet</p>
              <p className="text-xs text-slate-400">Issue your first gift card to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Code</th>
                    <th className="text-left px-5 py-3">Value / Remaining</th>
                    <th className="text-left px-5 py-3">Issued to</th>
                    <th className="text-left px-5 py-3">Expires</th>
                    <th className="text-left px-5 py-3">Used</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map(card => {
                    const expired = card.expiresAt && new Date(card.expiresAt) < new Date()
                    return (
                      <tr key={card.id} className="border-t border-slate-50">
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => copyCode(card.code)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 hover:text-primary transition-colors cursor-pointer"
                            title="Click to copy"
                          >
                            {card.code}
                            {copied === card.code
                              ? <Check size={12} className="text-green-500" />
                              : <Copy size={11} className="text-slate-300" />}
                          </button>
                          {card.note && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{card.note}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800">{formatNpr(card.balance)}</p>
                          <p className="text-[10px] text-slate-400">of {formatNpr(card.initialValue)}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">
                          {card.issuedToEmail ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">
                          <span className={expired ? 'text-red-500 font-semibold' : ''}>
                            {formatDate(card.expiresAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">
                          {card._count.redemptions}× redemption{card._count.redemptions === 1 ? '' : 's'}
                        </td>
                        <td className="px-5 py-3.5">
                          {!card.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Inactive</span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600">Expired</span>
                          ) : card.balance <= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Used up</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700">Active</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button type="button" onClick={() => toggleActive(card)}
                              title={card.isActive ? 'Deactivate' : 'Reactivate'}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                              <Power size={13} />
                            </button>
                            <button type="button" onClick={() => deleteCard(card)}
                              title={card._count.redemptions > 0 ? 'Cannot delete a redeemed card' : 'Delete'}
                              disabled={card._count.redemptions > 0}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

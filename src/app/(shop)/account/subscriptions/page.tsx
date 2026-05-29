'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Repeat, ArrowLeft, Loader2, CheckCircle2, Clock, AlertTriangle, X, CreditCard,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type SubStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED' | 'TRIALING'

interface Plan {
  id: string; name: string; description: string | null
  amount: number; interval: string; intervalCount: number; trialDays: number
}
interface Sub {
  id: string; status: SubStatus
  startedAt: string; trialEndsAt: string | null
  currentPeriodStart: string; currentPeriodEnd: string
  cancelAtPeriodEnd: boolean; cancelledAt: string | null
  plan: Plan
}

const STATUS_META: Record<SubStatus, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'bg-green-100 text-green-700 border-green-200'   },
  TRIALING:  { label: 'Free trial', cls: 'bg-sky-100 text-sky-700 border-sky-200'        },
  PAST_DUE:  { label: 'Past due',  cls: 'bg-amber-100 text-amber-700 border-amber-200'   },
  PAUSED:    { label: 'Paused',    cls: 'bg-slate-100 text-slate-500 border-slate-200'   },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200'         },
}

function intervalLabel(interval: string, count: number) {
  const unit = interval.toLowerCase().replace(/ly$/, match => match === 'ly' ? '' : match)
  const u = interval === 'WEEKLY' ? 'week' : interval === 'MONTHLY' ? 'month' : interval === 'YEARLY' ? 'year' : unit
  return count > 1 ? `every ${count} ${u}s` : `/ ${u}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function SubscriptionsContent() {
  const searchParams  = useSearchParams()
  const paymentResult = searchParams.get('payment')
  const method        = searchParams.get('method')

  const [subs,    setSubs]    = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [unauth,  setUnauth]  = useState(false)
  const [busyId,  setBusyId]  = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Sub | null>(null)
  const [actionError,   setActionError]   = useState<string | null>(null)
  const [payingId,  setPayingId]  = useState<string | null>(null)
  const [payBusy,   setPayBusy]   = useState(false)
  const [payError,  setPayError]  = useState<string | null>(null)

  async function payVia(sub: Sub, payMethod: 'esewa' | 'khalti') {
    setPayBusy(true); setPayError(null)
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payMethod }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPayError(data.error ?? 'Could not start payment.'); return }
      // eslint-disable-next-line react-hooks/immutability
      if (data.method === 'khalti' && data.payment_url) { window.location.href = data.payment_url; return }
      if (data.method === 'esewa' && data.action && data.fields) {
        // eSewa expects an HTML form POST — build one and submit.
        const form = document.createElement('form')
        form.method = 'POST'; form.action = data.action
        Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement('input')
          input.type = 'hidden'; input.name = k; input.value = String(v)
          form.appendChild(input)
        })
        document.body.appendChild(form); form.submit()
        return
      }
      setPayError('Unexpected payment response. Please try again.')
    } catch {
      setPayError('Could not start payment.')
    } finally {
      setPayBusy(false)
    }
  }

  useEffect(() => {
    fetch('/api/subscriptions')
      .then(r => { if (r.status === 401) { setUnauth(true); return null } return r.json() })
      .then(d => { if (d) setSubs(d.subscriptions ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function act(sub: Sub, action: 'cancel' | 'resume') {
    setBusyId(sub.id); setActionError(null)
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(json.error ?? `Something went wrong (HTTP ${res.status}).`); return }
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, ...json.subscription } : s))
      setConfirmTarget(null)
    } catch {
      setActionError('Network error — please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#8B5CF6', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">My Subscriptions</h1>
          </div>
          {!loading && subs.length > 0 && (
            <span className="ml-auto text-xs font-bold text-slate-400">{subs.length} plan{subs.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Payment success banner */}
        {paymentResult === 'success' && (
          <div className="mb-5 flex items-center gap-3 px-5 py-4 rounded-2xl border border-green-200 bg-green-50 animate-fade-in-up">
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-sm">Payment confirmed!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Your {method === 'esewa' ? 'eSewa' : method === 'khalti' ? 'Khalti' : ''} payment was confirmed. Your subscription is now active.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading your subscriptions…</p>
          </div>
        )}

        {/* Not signed in */}
        {!loading && unauth && (
          <div className="glass-card p-10 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Repeat size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Sign in to view your subscriptions</p>
            <Link href="/login"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Sign In
            </Link>
          </div>
        )}

        {/* Empty */}
        {!loading && !unauth && subs.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Repeat size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No subscriptions yet</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
              Subscription products you sign up for will appear here.
            </p>
            <Link href="/products"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Browse Products
            </Link>
          </div>
        )}

        {/* List */}
        {!loading && subs.length > 0 && (
          <div className="space-y-4">
            {subs.map((sub, i) => {
              const meta   = STATUS_META[sub.status] ?? { label: sub.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
              const active = sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAUSED'
              return (
                <div key={sub.id} className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                        <Repeat size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{sub.plan.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatPrice(sub.plan.amount)} {intervalLabel(sub.plan.interval, sub.plan.intervalCount)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-3 space-y-1.5 text-xs text-slate-500">
                    {sub.status === 'TRIALING' && sub.trialEndsAt && (
                      <p className="flex items-center gap-1.5 text-sky-700 font-semibold">
                        <Clock size={11} /> Free trial ends {formatDate(sub.trialEndsAt)}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400" />
                      Current period: {formatDate(sub.currentPeriodStart)} → {formatDate(sub.currentPeriodEnd)}
                    </p>
                    {sub.status === 'CANCELLED' && sub.cancelledAt && (
                      <p className="text-red-500 font-medium">Cancelled on {formatDate(sub.cancelledAt)}</p>
                    )}
                  </div>

                  {/* Past-due payment picker */}
                  {sub.status === 'PAST_DUE' && payingId === sub.id && (
                    <div className="px-5 py-4 border-t border-slate-50 bg-amber-50/40 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-500 text-center">
                        Pay {formatPrice(sub.plan.amount)} to activate your subscription
                      </p>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => payVia(sub, 'esewa')} disabled={payBusy}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white cursor-pointer transition-all disabled:opacity-60"
                          style={{ background: '#60BB46' }}>
                          {payBusy ? <Loader2 size={16} className="animate-spin" /> : 'Pay with eSewa'}
                        </button>
                        <button type="button" onClick={() => payVia(sub, 'khalti')} disabled={payBusy}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white cursor-pointer transition-all disabled:opacity-60"
                          style={{ background: '#5C2D91' }}>
                          {payBusy ? <Loader2 size={16} className="animate-spin" /> : 'Pay with Khalti'}
                        </button>
                      </div>
                      {payError && (
                        <p className="text-xs text-red-600 text-center">{payError}</p>
                      )}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-end gap-3 px-5 py-3 bg-slate-50/60 border-t border-slate-50">
                    {sub.status === 'PAST_DUE' && (
                      <button type="button"
                        onClick={() => { setPayError(null); setPayingId(payingId === sub.id ? null : sub.id) }}
                        disabled={payBusy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors cursor-pointer shadow-sm shadow-primary/15 disabled:opacity-50">
                        <CreditCard size={13} />
                        {payingId === sub.id ? 'Hide payment options' : 'Complete payment'}
                      </button>
                    )}
                    {active ? (
                      <button type="button" onClick={() => { setActionError(null); setConfirmTarget(sub) }}
                        disabled={busyId === sub.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer underline-offset-2 hover:underline disabled:opacity-50">
                        {busyId === sub.id ? 'Working…' : 'Cancel subscription'}
                      </button>
                    ) : sub.status === 'CANCELLED' ? (
                      <button type="button" onClick={() => act(sub, 'resume')}
                        disabled={busyId === sub.id}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50">
                        {busyId === sub.id ? 'Working…' : 'Resume'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setConfirmTarget(null) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-heading font-extrabold text-slate-900 text-base leading-tight">Cancel subscription?</p>
                  <p className="text-xs text-slate-400 mt-0.5">{confirmTarget.plan.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setConfirmTarget(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer shrink-0">
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            <div className="px-6 pb-2">
              <p className="text-sm text-slate-500 leading-relaxed">
                Your access ends immediately and you won&apos;t be billed again. You can resubscribe anytime.
              </p>
              {actionError && (
                <div className="mt-3 px-3.5 py-3 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-xs text-red-600">{actionError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-5">
              <button type="button" onClick={() => setConfirmTarget(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                Keep it
              </button>
              <button type="button" onClick={() => act(confirmTarget, 'cancel')} disabled={!!busyId}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-sm font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2">
                {busyId ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</> : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <SubscriptionsContent />
    </Suspense>
  )
}

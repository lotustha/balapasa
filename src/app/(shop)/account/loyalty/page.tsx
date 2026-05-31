'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Sparkles, LogIn, Gift, Minus, Loader2, Wallet,
  ArrowRight, Trophy, PackageCheck, ShoppingBag, Check, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type TxnType = 'EARN' | 'REDEEM' | 'ADJUST'
interface Txn { id: string; points: number; balanceAfter: number; type: TxnType; reason: string; createdAt: string }
interface Config { enabled: boolean; nprPerPoint: number; pointValue: number; minRedeem: number }
type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'
type Filter = 'all' | 'EARN' | 'REDEEM'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LoyaltyPage() {
  const [status, setStatus]   = useState<Status>('loading')
  const [balance, setBalance] = useState(0)
  const [lifetime, setLifetime] = useState(0)
  const [cfg, setCfg]         = useState<Config | null>(null)
  const [txns, setTxns]       = useState<Txn[]>([])
  const [redeemInput, setRedeemInput] = useState('')
  const [redeeming, setRedeeming]     = useState(false)
  const [filter, setFilter]   = useState<Filter>('all')
  const [toast, setToast]     = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account/loyalty', { cache: 'no-store' })
      if (res.status === 401) { setStatus('unauthenticated'); return }
      if (!res.ok) { setStatus('error'); return }
      const d = await res.json()
      setBalance(d.balance ?? 0); setLifetime(d.lifetimePoints ?? 0)
      setCfg(d.config ?? null); setTxns(Array.isArray(d.transactions) ? d.transactions : [])
      setStatus('ready')
    } catch { setStatus('error') }
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  const pointValue = cfg?.pointValue ?? 1
  const minRedeem  = cfg?.minRedeem ?? 100
  const nprPerPoint = cfg?.nprPerPoint ?? 100
  const canRedeem  = balance >= minRedeem
  const redeemable = Math.round(balance * pointValue)
  const toNext     = Math.max(0, minRedeem - balance)
  const progress   = Math.min(100, minRedeem > 0 ? Math.round((balance / minRedeem) * 100) : 100)

  // Quick-redeem presets — only those that are actually valid for this balance.
  const presets = useMemo(() => {
    const half = Math.floor(balance / 2)
    return ([
      { label: 'Min', value: minRedeem },
      { label: 'Half', value: half },
      { label: 'Max', value: balance },
    ] as const).filter(p => p.value >= minRedeem && p.value <= balance)
  }, [balance, minRedeem])

  const filtered = useMemo(
    () => txns.filter(t => filter === 'all' || t.type === filter),
    [txns, filter],
  )

  const inputPts = Math.floor(Number(redeemInput)) || 0

  async function redeem() {
    if (!Number.isFinite(inputPts) || inputPts <= 0) { setToast({ kind: 'err', text: 'Enter a number of points to redeem.' }); return }
    if (inputPts < minRedeem) { setToast({ kind: 'err', text: `Minimum redemption is ${minRedeem.toLocaleString('en-IN')} points.` }); return }
    if (inputPts > balance)   { setToast({ kind: 'err', text: 'You don’t have that many points.' }); return }
    setRedeeming(true); setToast(null)
    try {
      const res = await fetch('/api/account/loyalty/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: inputPts }),
      })
      const d = await res.json()
      if (res.ok) {
        setBalance(d.pointsBalance ?? 0)
        setRedeemInput('')
        setToast({ kind: 'ok', text: `Redeemed ${inputPts.toLocaleString('en-IN')} points → ${formatPrice(d.creditAdded ?? 0)} added to your wallet.` })
        load()
      } else { setToast({ kind: 'err', text: d.error ?? 'Could not redeem your points.' }) }
    } catch { setToast({ kind: 'err', text: 'Could not redeem your points.' }) }
    setRedeeming(false)
    setTimeout(() => setToast(null), 6000)
  }

  return (
    <div className="min-h-screen pt-6 pb-16 relative" style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]"
          style={{ background: '#8B5CF6', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account" className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Loyalty Points</h1>
          </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="rounded-3xl h-44 skeleton" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl h-20 skeleton" /><div className="rounded-2xl h-20 skeleton" />
            </div>
            <div className="rounded-2xl h-36 skeleton" />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center"><Sparkles size={30} className="text-violet-300" /></div>
            <p className="font-bold text-slate-700">Sign in to see your points</p>
            <p className="text-slate-400 text-xs mt-1.5">Earn points on every delivered order and redeem them for store credit.</p>
            <Link href="/login?redirect=/account/loyalty" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15"><LogIn size={14} /> Sign in</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card p-14 text-center animate-fade-in-up"><p className="font-bold text-slate-700">Couldn&apos;t load your points</p><p className="text-slate-400 text-xs mt-2">Please refresh and try again.</p></div>
        )}

        {status === 'ready' && !cfg?.enabled && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center"><Sparkles size={30} className="text-violet-300" /></div>
            <p className="font-bold text-slate-700">Loyalty rewards aren&apos;t active right now</p>
            <p className="text-slate-400 text-xs mt-2">Check back soon — any points you&apos;ve earned are safe.</p>
          </div>
        )}

        {status === 'ready' && cfg?.enabled && (
          <>
            {/* ── Hero balance ─────────────────────────────────────────── */}
            <div className="rounded-3xl p-6 text-white shadow-lg animate-fade-in-up relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)' }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-white/80" /><p className="text-xs font-bold uppercase tracking-widest text-white/80">Your points</p></div>
                <div className="flex items-end gap-3">
                  <p className="font-heading font-extrabold text-5xl leading-none">{balance.toLocaleString('en-IN')}</p>
                  <p className="text-white/85 text-sm font-semibold mb-1">≈ {formatPrice(redeemable)} credit</p>
                </div>

                {/* Progress toward the next redemption — real, from config.minRedeem */}
                {canRedeem ? (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-xs font-bold">
                    <Check size={13} /> Ready to redeem
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-white/80 font-semibold mb-1.5">
                      <span>{balance.toLocaleString('en-IN')} pts</span>
                      <span>{toNext.toLocaleString('en-IN')} to redeem · {minRedeem.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <Sparkles size={140} className="absolute -right-8 -bottom-8 text-white/10" />
            </div>

            {/* ── Stat chips (real: lifetime + earn rate) ──────────────── */}
            <div className="grid grid-cols-2 gap-3 mt-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0"><Trophy size={16} className="text-violet-600" /></div>
                <div className="min-w-0">
                  <p className="font-heading font-extrabold text-lg text-slate-900 leading-none">{lifetime.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Earned all-time</p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><PackageCheck size={16} className="text-emerald-600" /></div>
                <div className="min-w-0">
                  <p className="font-heading font-extrabold text-lg text-slate-900 leading-none">1 pt</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">per {formatPrice(nprPerPoint)} spent</p>
                </div>
              </div>
            </div>

            {/* ── Redeem ───────────────────────────────────────────────── */}
            <div className="glass-card p-5 mt-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={13} /> Redeem for store credit</p>
                <Link href="/account/store-credit" className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5">Wallet <ArrowRight size={11} /></Link>
              </div>

              {canRedeem ? (
                <>
                  {presets.length > 0 && (
                    <div className="flex gap-2 mb-2.5">
                      {presets.map(p => (
                        <button key={p.label} type="button" onClick={() => setRedeemInput(String(p.value))}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary-bg transition-colors cursor-pointer">
                          {p.label} · {p.value.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1">
                      <input type="number" min={minRedeem} max={balance} step={1} value={redeemInput}
                        onChange={e => setRedeemInput(e.target.value)} placeholder={`${minRedeem.toLocaleString('en-IN')}+ points`}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                    </div>
                    <button onClick={redeem} disabled={redeeming || inputPts < minRedeem || inputPts > balance}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                      {redeeming ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} Redeem
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {inputPts >= minRedeem && inputPts <= balance
                      ? <>Converts to <span className="font-bold text-primary">{formatPrice(Math.round(inputPts * pointValue))}</span> store credit.</>
                      : <>1 point = {formatPrice(pointValue)} · minimum {minRedeem.toLocaleString('en-IN')} points.</>}
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-2.5 text-sm text-slate-500">
                  <Sparkles size={15} className="text-violet-400 shrink-0 mt-0.5" />
                  <p>Earn <span className="font-bold text-slate-700">{toNext.toLocaleString('en-IN')}</span> more points to unlock redemption (minimum {minRedeem.toLocaleString('en-IN')}). Worth {formatPrice(Math.round(minRedeem * pointValue))} in credit.</p>
                </div>
              )}

              {toast && (
                <div className={`mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${toast.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {toast.kind === 'ok' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                  <span>{toast.text}{toast.kind === 'ok' && <> <Link href="/account/store-credit" className="underline">View wallet</Link>.</>}</span>
                </div>
              )}
            </div>

            {/* ── How it works (from real config) ──────────────────────── */}
            <div className="glass-card p-5 mt-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3.5">How it works</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { Icon: PackageCheck, t: 'Earn on delivery', d: `1 point for every ${formatPrice(nprPerPoint)} of a delivered order.` },
                  { Icon: Gift,         t: 'Redeem to wallet', d: `From ${minRedeem.toLocaleString('en-IN')} points — 1 point = ${formatPrice(pointValue)} store credit.` },
                  { Icon: ShoppingBag,  t: 'Spend at checkout', d: 'Use store credit on your next order.' },
                ].map(({ Icon, t, d }) => (
                  <div key={t} className="flex sm:flex-col items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center shrink-0"><Icon size={15} className="text-primary" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{t}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── History ──────────────────────────────────────────────── */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">History</p>
                {txns.length > 0 && (
                  <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {([['all', 'All'], ['EARN', 'Earned'], ['REDEEM', 'Redeemed']] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setFilter(k)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filter === k ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filtered.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <p className="text-sm font-semibold text-slate-500">{txns.length === 0 ? 'No points yet' : 'Nothing here'}</p>
                  <p className="text-slate-400 text-xs mt-1">{txns.length === 0 ? 'Earn points when your orders are delivered.' : 'No transactions match this filter.'}</p>
                </div>
              ) : (
                <div className="glass-card divide-y divide-slate-100/70">
                  {filtered.map(t => {
                    const positive = t.points >= 0
                    const Icon = t.type === 'EARN' ? Sparkles : t.type === 'REDEEM' ? Gift : Minus
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${positive ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}><Icon size={16} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{t.type === 'EARN' ? 'Earned' : t.type === 'REDEEM' ? 'Redeemed' : 'Adjustment'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{t.reason} · {fmtDate(t.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-extrabold ${positive ? 'text-violet-600' : 'text-amber-600'}`}>{positive ? '+' : ''}{t.points.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-400">{t.balanceAfter.toLocaleString('en-IN')} pts</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

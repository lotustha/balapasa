'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Sparkles, LogIn, Gift, Minus, Loader2, Wallet } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type TxnType = 'EARN' | 'REDEEM' | 'ADJUST'
interface Txn { id: string; points: number; balanceAfter: number; type: TxnType; reason: string; createdAt: string }
interface Config { enabled: boolean; nprPerPoint: number; pointValue: number; minRedeem: number }
type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'

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
  const [msg, setMsg]         = useState<string | null>(null)

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

  async function redeem() {
    const pts = Math.floor(Number(redeemInput))
    if (!Number.isFinite(pts) || pts <= 0) { setMsg('Enter a valid number of points'); return }
    setRedeeming(true); setMsg(null)
    try {
      const res = await fetch('/api/account/loyalty/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pts }),
      })
      const d = await res.json()
      if (res.ok) {
        setBalance(d.pointsBalance ?? 0)
        setRedeemInput('')
        setMsg(`Redeemed ${pts} points → ${formatPrice(d.creditAdded ?? 0)} store credit added!`)
        load()
      } else { setMsg(d.error ?? 'Could not redeem') }
    } catch { setMsg('Could not redeem') }
    setRedeeming(false)
    setTimeout(() => setMsg(null), 5000)
  }

  const pointValue = cfg?.pointValue ?? 1
  const minRedeem  = cfg?.minRedeem ?? 100
  const canRedeem  = balance >= minRedeem

  return (
    <div className="min-h-screen pt-6 pb-16 relative" style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]"
          style={{ background: '#8B5CF6', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
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
          <div className="glass-card p-8 animate-pulse"><div className="h-4 bg-slate-100 rounded w-24 mb-3" /><div className="h-9 bg-slate-100 rounded w-40" /></div>
        )}

        {status === 'unauthenticated' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center"><Sparkles size={30} className="text-violet-300" /></div>
            <p className="font-bold text-slate-700">Sign in to see your points</p>
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
            <p className="text-slate-400 text-xs mt-2">Check back soon — points you&apos;ve earned are safe.</p>
          </div>
        )}

        {status === 'ready' && cfg?.enabled && (
          <>
            {/* Balance card */}
            <div className="rounded-3xl p-6 text-white shadow-lg animate-fade-in-up relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)' }}>
              <div className="flex items-center gap-2 mb-2 relative z-10"><Sparkles size={16} className="text-white/80" /><p className="text-xs font-bold uppercase tracking-widest text-white/80">Your points</p></div>
              <p className="font-heading font-extrabold text-4xl relative z-10">{balance.toLocaleString('en-IN')}</p>
              <p className="text-white/80 text-xs mt-2 relative z-10">
                Worth {formatPrice(Math.round(balance * pointValue))} in store credit · {lifetime.toLocaleString('en-IN')} earned all-time
              </p>
              <Sparkles size={120} className="absolute -right-6 -bottom-6 text-white/10" />
            </div>

            {/* Redeem */}
            <div className="glass-card p-5 mt-4 animate-fade-in-up">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Wallet size={13} /> Redeem for store credit</p>
              <p className="text-xs text-slate-500 mb-3">
                Earn 1 point per {formatPrice(cfg.nprPerPoint)} spent. 1 point = {formatPrice(pointValue)} credit. Minimum {minRedeem.toLocaleString('en-IN')} points.
              </p>
              {canRedeem ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <input type="number" min={minRedeem} max={balance} step={1} value={redeemInput}
                      onChange={e => setRedeemInput(e.target.value)} placeholder={`${minRedeem}+ points`}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                    {Number(redeemInput) > 0 && (
                      <p className="text-[11px] text-slate-400 mt-1">= {formatPrice(Math.round(Math.floor(Number(redeemInput)) * pointValue))} store credit</p>
                    )}
                  </div>
                  <button onClick={() => setRedeemInput(String(balance))} type="button"
                    className="px-3 py-2.5 text-xs font-bold text-primary bg-primary-bg hover:bg-primary/20 rounded-xl transition-colors cursor-pointer shrink-0">Max</button>
                  <button onClick={redeem} disabled={redeeming}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20 disabled:opacity-50 shrink-0">
                    {redeeming ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} Redeem
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Earn {(minRedeem - balance).toLocaleString('en-IN')} more points to start redeeming.</p>
              )}
              {msg && <p className="text-xs font-semibold text-primary mt-2">{msg}</p>}
            </div>

            {/* History */}
            <div className="mt-5">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">History</p>
              {txns.length === 0 ? (
                <div className="glass-card p-10 text-center"><p className="text-sm font-semibold text-slate-500">No points yet</p><p className="text-slate-400 text-xs mt-1">Earn points when your orders are delivered.</p></div>
              ) : (
                <div className="glass-card divide-y divide-slate-100/70">
                  {txns.map(t => {
                    const positive = t.points >= 0
                    const Icon = positive ? Sparkles : Minus
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

'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Users, LogIn, Copy, CheckCircle2, Gift, Share2, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type RefStatus = 'PENDING' | 'REWARDED'
interface Row { id: string; status: RefStatus; createdAt: string; rewardedAt: string | null }
interface Config { enabled: boolean; referrerReward: number; refereeReward: number; minOrder: number }
type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReferralsPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [code, setCode]     = useState('')
  const [cfg, setCfg]       = useState<Config | null>(null)
  const [rows, setRows]     = useState<Row[]>([])
  const [earned, setEarned] = useState(0)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account/referrals', { cache: 'no-store' })
      if (res.status === 401) { setStatus('unauthenticated'); return }
      if (!res.ok) { setStatus('error'); return }
      const d = await res.json()
      setCode(d.code ?? ''); setCfg(d.config ?? null)
      setRows(Array.isArray(d.referrals) ? d.referrals : [])
      setEarned(d.totalEarned ?? 0)
      setShareUrl(d.shareUrl ?? '')
      setStatus('ready')
    } catch { setStatus('error') }
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  function copy() {
    navigator.clipboard?.writeText(shareUrl || code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Shop with my code', text: `Use my code ${code} for a welcome bonus!`, url: shareUrl }) } catch {}
    } else { copy() }
  }

  return (
    <div className="min-h-screen pt-6 pb-16 relative" style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]" style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account" className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Refer &amp; Earn</h1>
          </div>
        </div>

        {status === 'loading' && (<div className="glass-card p-8 animate-pulse"><div className="h-4 bg-slate-100 rounded w-24 mb-3" /><div className="h-9 bg-slate-100 rounded w-48" /></div>)}

        {status === 'unauthenticated' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center"><Users size={30} className="text-cyan-300" /></div>
            <p className="font-bold text-slate-700">Sign in to get your referral code</p>
            <Link href="/login?redirect=/account/referrals" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15"><LogIn size={14} /> Sign in</Link>
          </div>
        )}

        {status === 'error' && (<div className="glass-card p-14 text-center animate-fade-in-up"><p className="font-bold text-slate-700">Couldn&apos;t load your referrals</p><p className="text-slate-400 text-xs mt-2">Please refresh and try again.</p></div>)}

        {status === 'ready' && !cfg?.enabled && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center"><Users size={30} className="text-cyan-300" /></div>
            <p className="font-bold text-slate-700">Referrals aren&apos;t active right now</p>
            <p className="text-slate-400 text-xs mt-2">Check back soon.</p>
          </div>
        )}

        {status === 'ready' && cfg?.enabled && (
          <>
            {/* Share card */}
            <div className="rounded-3xl p-6 text-white shadow-lg animate-fade-in-up relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#06B6D4,#3B82F6)' }}>
              <div className="flex items-center gap-2 mb-2 relative z-10"><Gift size={16} className="text-white/80" /><p className="text-xs font-bold uppercase tracking-widest text-white/80">Give {formatPrice(cfg.refereeReward)}, get {formatPrice(cfg.referrerReward)}</p></div>
              <p className="text-sm text-white/90 mb-4 relative z-10 leading-relaxed">
                Your friend gets {formatPrice(cfg.refereeReward)} store credit on signup. You get {formatPrice(cfg.referrerReward)} when their first order is delivered.
              </p>
              <div className="flex items-center gap-2 relative z-10">
                <div className="flex-1 bg-white/15 rounded-xl px-4 py-3 font-mono font-extrabold text-lg tracking-widest backdrop-blur">{code}</div>
                <button onClick={copy} className="w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer backdrop-blur" aria-label="Copy">
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
                <button onClick={share} className="w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer backdrop-blur" aria-label="Share"><Share2 size={18} /></button>
              </div>
              {shareUrl && <p className="text-[11px] text-white/70 mt-2 truncate relative z-10">{shareUrl}</p>}
              <Users size={120} className="absolute -right-6 -bottom-8 text-white/10" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-extrabold text-slate-900">{rows.length}</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Friends referred</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-extrabold text-emerald-600">{formatPrice(earned)}</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Credit earned</p>
              </div>
            </div>

            {/* List */}
            <div className="mt-5">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Your referrals</p>
              {rows.length === 0 ? (
                <div className="glass-card p-10 text-center"><p className="text-sm font-semibold text-slate-500">No referrals yet</p><p className="text-slate-400 text-xs mt-1">Share your code to start earning.</p></div>
              ) : (
                <div className="glass-card divide-y divide-slate-100/70">
                  {rows.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.status === 'REWARDED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {r.status === 'REWARDED' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{r.status === 'REWARDED' ? 'Reward earned' : 'Joined — pending first order'}</p>
                        <p className="text-[11px] text-slate-400">Signed up {fmtDate(r.createdAt)}{r.rewardedAt ? ` · rewarded ${fmtDate(r.rewardedAt)}` : ''}</p>
                      </div>
                      {r.status === 'REWARDED' && <p className="text-sm font-extrabold text-emerald-600 shrink-0">+{formatPrice(cfg.referrerReward)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

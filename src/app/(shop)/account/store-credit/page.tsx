'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Wallet, LogIn, Plus, Minus, RotateCcw, Gift } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type TxnType = 'GRANT' | 'REDEMPTION' | 'REFUND' | 'ADJUSTMENT'
interface Txn {
  id: string
  amount: number
  balanceAfter: number
  type: TxnType
  reason: string
  orderId: string | null
  createdAt: string
}
type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'

const TYPE_META: Record<TxnType, { label: string; icon: typeof Gift }> = {
  GRANT:      { label: 'Credit added',  icon: Gift },
  REFUND:     { label: 'Refund',        icon: RotateCcw },
  REDEMPTION: { label: 'Used at checkout', icon: Minus },
  ADJUSTMENT: { label: 'Adjustment',    icon: Plus },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StoreCreditPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [balance, setBalance] = useState(0)
  const [txns, setTxns] = useState<Txn[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/account/store-credit', { cache: 'no-store' })
        if (res.status === 401) { if (active) setStatus('unauthenticated'); return }
        if (!res.ok) { if (active) setStatus('error'); return }
        const d = await res.json()
        if (!active) return
        setBalance(d.balance ?? 0)
        setTxns(Array.isArray(d.transactions) ? d.transactions : [])
        setStatus('ready')
      } catch { if (active) setStatus('error') }
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen pt-6 pb-16 relative" style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]"
          style={{ background: '#10B981', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account" className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Store Credit</h1>
          </div>
        </div>

        {status === 'loading' && (
          <div className="glass-card p-8 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-24 mb-3" />
            <div className="h-9 bg-slate-100 rounded w-40" />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Wallet size={30} className="text-emerald-300" />
            </div>
            <p className="font-bold text-slate-700">Sign in to see your store credit</p>
            <Link href="/login?redirect=/account/store-credit"
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              <LogIn size={14} /> Sign in
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <p className="font-bold text-slate-700">Couldn&apos;t load your store credit</p>
            <p className="text-slate-400 text-xs mt-2">Please refresh and try again.</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* Balance card */}
            <div className="rounded-3xl p-6 text-white shadow-lg animate-fade-in-up relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <Wallet size={16} className="text-white/80" />
                <p className="text-xs font-bold uppercase tracking-widest text-white/80">Available balance</p>
              </div>
              <p className="font-heading font-extrabold text-4xl relative z-10">{formatPrice(balance)}</p>
              <p className="text-white/80 text-xs mt-2 relative z-10">Applied automatically at checkout when you choose to use it.</p>
              <Wallet size={120} className="absolute -right-6 -bottom-6 text-white/10" />
            </div>

            {/* History */}
            <div className="mt-5">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">History</p>
              {txns.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <p className="text-sm font-semibold text-slate-500">No transactions yet</p>
                  <p className="text-slate-400 text-xs mt-1">Store credit you earn or receive will appear here.</p>
                </div>
              ) : (
                <div className="glass-card divide-y divide-slate-100/70">
                  {txns.map(t => {
                    const meta = TYPE_META[t.type] ?? TYPE_META.ADJUSTMENT
                    const Icon = meta.icon
                    const positive = t.amount >= 0
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{t.reason} · {fmtDate(t.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-extrabold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {positive ? '+' : '−'}{formatPrice(Math.abs(t.amount))}
                          </p>
                          <p className="text-[10px] text-slate-400">Bal {formatPrice(t.balanceAfter)}</p>
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

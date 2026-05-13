'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Sparkles, Mail, Lock } from 'lucide-react'

interface Props {
  token: string
  email: string
}

export default function SetupPasswordForm({ token, email }: Props) {
  const router  = useRouter()
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [show,      setShow]      = useState(false)
  const [error,     setError]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,      setDone]      = useState<{ couponCode: string | null } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== pw2)     { setError('Passwords do not match'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not set password. Please try again.')
        setSubmitting(false)
        return
      }
      setDone({ couponCode: data.couponCode ?? null })
    } catch {
      setError('Network error. Please check your connection.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="glass-card p-7 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white shadow-lg shadow-primary/30 mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">Account ready!</h2>
        <p className="text-slate-600 text-sm mb-5">You&apos;re signed in. Enjoy faster checkout next time.</p>

        {done.couponCode && (
          <div className="p-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 mb-5">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
              <Sparkles size={11} /> Your welcome gift
            </p>
            <p className="font-mono font-extrabold text-2xl text-amber-700 tracking-wider mb-1">
              {done.couponCode}
            </p>
            <p className="text-[11px] text-amber-600">
              10% off your next order · min Rs. 1,000 · valid 30 days
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push('/account')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/20"
        >
          Go to my account
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 text-slate-500 hover:text-slate-700 text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
        >
          Keep shopping
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-7 animate-fade-in-up">
      {/* Email (read-only) */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={email}
            readOnly
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border border-white/80 text-slate-600 outline-none cursor-not-allowed opacity-80"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Create password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => { setPw(e.target.value); setError('') }}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full pl-10 pr-10 py-3.5 rounded-xl text-sm border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Confirm password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={show ? 'text' : 'password'}
            value={pw2}
            onChange={e => { setPw2(e.target.value); setError('') }}
            placeholder="Re-enter password"
            required
            autoComplete="new-password"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !pw || !pw2}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/20"
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Activating…</>
        ) : (
          <>Activate account &amp; claim 10% off</>
        )}
      </button>

      <p className="text-[11px] text-slate-400 text-center mt-3">
        By activating, you agree to our terms of service.
      </p>
    </form>
  )
}

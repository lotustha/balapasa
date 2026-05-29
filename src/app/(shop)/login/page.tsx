'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import BrandText from '@/components/ui/BrandText'
import { STORE_NAME } from '@/lib/config'

function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith('//') || /^https?:/i.test(raw)) return null
  if (!raw.startsWith('/')) return null
  return raw
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  )
}

function LoginInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const returnTo     = safeReturnTo(searchParams.get('returnTo'))
  const magic        = searchParams.get('magic')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(
    magic === 'invalid' ? 'That link has expired or already been used. Sign in with your password, or request a new link below.' :
    magic === 'missing' ? 'No login token found. Please sign in below.' : ''
  )

  // Forgot password view: 'login' | 'forgot' | 'sent'
  const [view,          setView]          = useState<'login' | 'forgot' | 'sent'>('login')
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Login failed'); setLoading(false); return }
    const isStaff = data.role === 'ADMIN' || data.role === 'MANAGER' || data.role === 'STAFF'
    router.push(isStaff ? '/admin' : (returnTo ?? '/account'))
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    // Always succeeds on the client side (API never leaks whether email exists)
    await fetch('/api/auth/magic-link/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    }).catch(() => {})
    setView('sent')
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 animate-fade-in-up">

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt={STORE_NAME} width={56} height={56} className="rounded-2xl mb-3" />
            <BrandText name={STORE_NAME} className="font-heading font-bold text-xl text-slate-800 mb-2" />
            {view === 'login' && <>
              <h1 className="font-heading font-extrabold text-2xl text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
            </>}
            {view === 'forgot' && <>
              <h1 className="font-heading font-extrabold text-2xl text-gray-900">Forgot password?</h1>
              <p className="text-gray-500 text-sm mt-1 text-center">We&apos;ll email you a one-tap sign-in link</p>
            </>}
            {view === 'sent' && <>
              <h1 className="font-heading font-extrabold text-2xl text-gray-900">Check your inbox</h1>
              <p className="text-gray-500 text-sm mt-1 text-center">If that email is registered, a sign-in link is on its way</p>
            </>}
          </div>

          {/* ── Login form ── */}
          {view === 'login' && <>
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com" required
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                  <button type="button" onClick={() => { setForgotEmail(email); setView('forgot') }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors cursor-pointer">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
                className="text-primary font-bold hover:underline cursor-pointer">
                Create one
              </Link>
            </p>
          </>}

          {/* ── Forgot password form ── */}
          {view === 'forgot' && <>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@email.com" required autoFocus
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={forgotLoading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors cursor-pointer">
                {forgotLoading ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : 'Send sign-in link'}
              </button>
            </form>
            <button onClick={() => setView('login')}
              className="mt-5 w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
              <ArrowLeft size={13} /> Back to sign in
            </button>
          </>}

          {/* ── Sent confirmation ── */}
          {view === 'sent' && <>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                We sent a sign-in link to <strong className="text-gray-800">{forgotEmail}</strong>.
                Click it to log in instantly — no password needed. The link expires in 7 days.
              </p>
              <button onClick={() => setView('login')}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer">
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </div>
          </>}

        </div>
      </div>
    </div>
  )
}

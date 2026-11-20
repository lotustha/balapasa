'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react'

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== again) { setError('The two passwords do not match'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Could not change the password. Try again.'); return }
      setDone(true)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-surface text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10'

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900">This link is incomplete</h1>
        <p className="text-sm text-slate-500 mt-2">Open the link from your email again, or ask for a new one.</p>
        <Link href="/login" className="inline-block mt-6 text-sm font-bold text-primary">Back to sign in</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center" role="status">
        <CheckCircle2 size={44} className="mx-auto text-green-500" />
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 mt-3">Password changed</h1>
        <p className="text-sm text-slate-500 mt-2">You can now sign in with your new password, on the website or in the app.</p>
        <Link href="/login" className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold">Sign in</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <KeyRound size={36} className="mx-auto text-primary" />
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 mt-3">Choose a new password</h1>
        <p className="text-sm text-slate-500 mt-1">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="new-password" className="block text-xs font-bold text-slate-600 mb-1.5">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password}
          onChange={e => setPassword(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="new-password-again" className="block text-xs font-bold text-slate-600 mb-1.5">New password again</label>
        <input id="new-password-again" type="password" autoComplete="new-password" required minLength={8} value={again}
          onChange={e => setAgain(e.target.value)} className={inputCls} />
      </div>
      {error && <p role="alert" className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</p>}
      <button type="submit" disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
        {busy && <Loader2 size={16} className="animate-spin" />} Change password
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl p-8">
        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-primary" /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}

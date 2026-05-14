'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import BrandText from '@/components/ui/BrandText'
import { STORE_NAME } from '@/lib/config'

// Only allow returnTo paths that stay on the same site — prevents open-redirect attacks.
function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null
  // Reject protocol-relative (//evil.com) and absolute URLs.
  if (raw.startsWith('//') || /^https?:/i.test(raw)) return null
  if (!raw.startsWith('/')) return null
  return raw
}

export default function LoginPage() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const returnTo      = safeReturnTo(searchParams.get('returnTo'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      setLoading(false)
      return
    }

    const isStaff = data.role === 'ADMIN' || data.role === 'MANAGER' || data.role === 'STAFF'
    // Staff always go to /admin; customers honor returnTo (e.g. back to /checkout)
    const dest = isStaff ? '/admin' : (returnTo ?? '/account')
    router.push(dest)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt={STORE_NAME} width={56} height={56} className="rounded-2xl mb-3" />
            <BrandText name={STORE_NAME} className="font-heading font-bold text-xl text-slate-800 mb-2" />
            <h1 className="font-heading font-extrabold text-2xl text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

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
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors cursor-pointer"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
              className="text-primary font-bold hover:underline cursor-pointer"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

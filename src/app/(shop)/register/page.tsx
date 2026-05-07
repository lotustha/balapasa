'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, phone: form.phone } },
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-md bg-white rounded-3xl shadow-xl p-10 animate-bounce-in">
          <CheckCircle size={48} className="text-primary mx-auto mb-4" />
          <h2 className="font-heading font-extrabold text-2xl text-gray-900 mb-2">Check your inbox!</h2>
          <p className="text-gray-500 text-sm mb-6">We&apos;ve sent a confirmation link to <strong>{form.email}</strong></p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  const FIELDS = [
    { key: 'name', label: 'Full Name', placeholder: 'Your name', type: 'text', icon: User },
    { key: 'email', label: 'Email', placeholder: 'you@email.com', type: 'email', icon: Mail },
    { key: 'phone', label: 'Phone', placeholder: '98XXXXXXXX', type: 'tel', icon: Phone },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt="Balapasa" width={56} height={56} className="rounded-2xl mb-3" />
            <h1 className="font-heading font-extrabold text-2xl text-gray-900">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Join thousands of happy shoppers</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ key, label, placeholder, type, icon: Icon }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setField(key, e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
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
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

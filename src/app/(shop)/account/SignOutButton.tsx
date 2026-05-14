'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function signOut() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 bg-white/60 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors cursor-pointer animate-fade-in-up disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ animationDelay: '0.10s' }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
      {busy ? 'Signing out…' : 'Sign Out'}
    </button>
  )
}

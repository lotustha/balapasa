'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to server logs so we can correlate via digest after the fact.
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: '#F4F6FF' }}>
      <div className="w-full max-w-md text-center">
        <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6 bg-red-50">
          <AlertCircle size={36} className="text-red-500" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-2">Something went wrong</p>
        <h1 className="font-heading font-extrabold text-3xl text-slate-900 mb-3">
          We hit a snag
        </h1>
        <p className="text-slate-500 leading-relaxed mb-2">
          An unexpected error occurred. You can try again, and if it keeps happening, please get in touch with us.
        </p>
        {error.digest && (
          <p className="text-[11px] text-slate-400 font-mono mb-6">Ref: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl shadow-md shadow-primary/20 transition-colors cursor-pointer">
            <RotateCcw size={15} /> Try again
          </button>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-2xl transition-colors">
            <Home size={15} /> Go home
          </Link>
        </div>
      </div>
    </main>
  )
}

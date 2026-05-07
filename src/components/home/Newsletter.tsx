'use client'

import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

export default function Newsletter() {
  const [email, setEmail]    = useState('')
  const [submitted, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setDone(true)
  }

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #EEF2FF, #FFF0F9, #F0FDF4)' }}
    >
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 -left-20 w-96 h-96" style={{ background: '#8B5CF6', opacity: 0.22, animationDelay: '0s' }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-10 right-0 w-80 h-80"   style={{ background: '#06B6D4', opacity: 0.18, animationDelay: '2s' }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute -bottom-20 left-1/3 w-72 h-72" style={{ background: '#EC4899', opacity: 0.18, animationDelay: '1s' }} />
        <div className="blob animate-blob-morph animate-blob-float-a absolute bottom-10 right-1/4 w-56 h-56" style={{ background: '#10B981', opacity: 0.18, animationDelay: '3s' }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 glass-md rounded-3xl mb-6 shadow-md">
          <Mail size={28} className="text-slate-700" />
        </div>

        <h2 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900">
          Stay in the{' '}
          <span className="iridescent-text">Loop</span>
        </h2>
        <p className="mt-4 text-slate-500 text-base leading-relaxed">
          Exclusive deals, new arrivals, and beauty tips — delivered to your inbox. No spam, ever.
        </p>

        {submitted ? (
          <div className="mt-10 inline-flex items-center gap-3 py-4 px-8 glass-md rounded-2xl animate-bounce-in shadow-md">
            <CheckCircle size={22} className="text-primary" />
            <span className="font-semibold text-slate-800 text-lg">You&apos;re subscribed!</span>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-5 py-4 glass-md rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:shadow-lg transition-all text-sm"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all hover:scale-105 cursor-pointer whitespace-nowrap shadow-lg shadow-primary/20"
            >
              Subscribe <ArrowRight size={16} />
            </button>
          </form>
        )}

        <p className="mt-5 text-slate-400 text-xs">
          Join 2,400+ subscribers · Unsubscribe anytime
        </p>
      </div>
    </section>
  )
}

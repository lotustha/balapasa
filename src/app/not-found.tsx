import Link from 'next/link'
import { Home, Search, Sparkles, Smartphone, ShoppingBag } from 'lucide-react'
import { STORE_NAME } from '@/lib/config'

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

const POPULAR = [
  { label: 'Electronics',   icon: Smartphone, href: '/products?category=electronics' },
  { label: 'Beauty',        icon: Sparkles,   href: '/products?category=beauty'      },
  { label: 'Shop All',      icon: ShoppingBag, href: '/products'                      },
]

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6 py-16"
      style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #F4F6FF 100%)' }}>

      {/* Soft floating shapes — claymorphism background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-50"
          style={{ background: 'radial-gradient(circle, #BBF7D0 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, #FBCFE8 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, #DBEAFE 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        {/* Illustration — empty shopping bag with floating items */}
        <div className="relative mx-auto mb-8 w-44 h-44">
          {/* Bag body — chunky clay style */}
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_18px_40px_rgba(22,163,74,0.25)]">
            <defs>
              <linearGradient id="bagGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F0FDF4" />
              </linearGradient>
              <radialGradient id="bagShine" cx="0.3" cy="0.25" r="0.6">
                <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Handles */}
            <path d="M70 60 Q70 30 100 30 Q130 30 130 60" fill="none" stroke="#16A34A" strokeWidth="9" strokeLinecap="round" />
            {/* Bag body with thick border */}
            <rect x="48" y="58" width="104" height="118" rx="22" fill="url(#bagGrad)" stroke="#16A34A" strokeWidth="6" />
            {/* Shine */}
            <rect x="54" y="64" width="92" height="80" rx="18" fill="url(#bagShine)" />
            {/* "?" inside the bag */}
            <text x="100" y="135" textAnchor="middle" fontFamily="Plus Jakarta Sans, system-ui" fontWeight="800" fontSize="64" fill="#16A34A">?</text>
          </svg>

          {/* Floating sparkles */}
          <span aria-hidden className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-300 shadow-[0_6px_14px_rgba(245,158,11,0.45)] animate-pulse" />
          <span aria-hidden className="absolute top-10 -left-4 w-3 h-3 rounded-full bg-rose-300 shadow-[0_4px_10px_rgba(244,114,182,0.4)] animate-pulse" style={{ animationDelay: '0.4s' }} />
          <span aria-hidden className="absolute -bottom-1 right-6 w-4 h-4 rounded-full bg-sky-300 shadow-[0_4px_10px_rgba(56,189,248,0.4)] animate-pulse" style={{ animationDelay: '0.8s' }} />
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-primary mb-3">
          Error 404 · Hajur, harayo!
        </p>
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900 leading-[1.05] mb-4">
          This page took the<br />
          <span className="relative inline-block">
            <span className="relative z-10">scenic route</span>
            <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 rounded-full bg-primary/25 -z-0" />
          </span>{' '}
          home.
        </h1>
        <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-9">
          We searched the whole shop and couldn&apos;t find what you&apos;re looking for.
          Maybe one of these will catch your eye?
        </p>

        {/* CTA buttons — chunky clay style */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link href="/"
            className="group inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl
                       shadow-[0_8px_0_#15803D,0_18px_30px_rgba(22,163,74,0.35)] hover:shadow-[0_4px_0_#15803D,0_12px_22px_rgba(22,163,74,0.4)]
                       hover:translate-y-1 active:translate-y-2 active:shadow-[0_2px_0_#15803D] transition-all duration-200 cursor-pointer">
            <Home size={17} aria-hidden /> Take me home
          </Link>
          <Link href="/products"
            className="group inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-slate-800 font-bold rounded-2xl border border-slate-200
                       shadow-[0_8px_0_#e2e8f0,0_18px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_4px_0_#e2e8f0,0_12px_22px_rgba(15,23,42,0.12)]
                       hover:translate-y-1 active:translate-y-2 active:shadow-[0_2px_0_#e2e8f0] transition-all duration-200 cursor-pointer">
            <Search size={17} aria-hidden /> Browse shop
          </Link>
        </div>

        {/* Popular categories */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-3">Popular at {STORE_NAME}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {POPULAR.map(c => (
              <Link key={c.label} href={c.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur border border-slate-200 text-sm font-semibold text-slate-700
                           hover:border-primary hover:text-primary hover:bg-primary-bg transition-colors cursor-pointer
                           shadow-[0_4px_0_rgba(226,232,240,0.6)]">
                <c.icon size={14} aria-hidden /> {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

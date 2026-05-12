import Link from 'next/link'
import { ShoppingBag, Home, Search } from 'lucide-react'
import { STORE_NAME } from '@/lib/config'

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: '#F4F6FF' }}>
      <div className="w-full max-w-md text-center">
        <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6 bg-primary-bg">
          <ShoppingBag size={36} className="text-primary" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-2">Error 404</p>
        <h1 className="font-heading font-extrabold text-3xl text-slate-900 mb-3">
          We couldn&apos;t find that page
        </h1>
        <p className="text-slate-500 leading-relaxed mb-8">
          The link may be broken, or the page may have been moved. Let&apos;s get you back to shopping at {STORE_NAME}.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl shadow-md shadow-primary/20 transition-colors">
            <Home size={15} /> Go home
          </Link>
          <Link href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-2xl transition-colors">
            <Search size={15} /> Browse products
          </Link>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import CartDrawer from '@/components/ui/CartDrawer'
import {
  ShoppingCart, Search, Menu, X, User, Heart,
  Truck, ArrowRight, Star, Loader2,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface SearchResult {
  id: string; name: string; slug: string; price: number;
  salePrice: number | null; images: string[]; brand?: string | null
}

// ── Inline search dropdown ───────────────────────────────────────────────────

function InlineSearch() {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const RECENT_KEY = 'bp_recent_searches'
  const [recent, setRecent] = useState<string[]>([])
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')) } catch {}
  }, [])

  function saveRecent(q: string) {
    const updated = [q, ...recent.filter(r => r !== q)].slice(0, 5)
    setRecent(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }

  // Fetch results with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`)
        const data = await res.json()
        setResults(data.products ?? [])
      } catch {}
      setLoading(false)
    }, 280)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    saveRecent(query.trim())
    router.push(`/products?search=${encodeURIComponent(query.trim())}`)
    setOpen(false)
    setQuery('')
  }

  function pick(q: string) {
    saveRecent(q)
    router.push(`/products?search=${encodeURIComponent(q)}`)
    setOpen(false); setQuery('')
  }

  const showDropdown = open && (query.length > 0 || recent.length > 0)

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4 hidden md:block">
      <form onSubmit={submit}>
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all duration-200 ${
            open
              ? 'bg-white ring-2 ring-primary/20 shadow-md'
              : 'bg-white/70 hover:bg-white/85'
          }`}
          style={{ border: '1px solid rgba(255,255,255,0.9)' }}
        >
          {loading
            ? <Loader2 size={15} className="text-slate-400 shrink-0 animate-spin" />
            : <Search size={15} className="text-slate-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search products, brands…"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="shrink-0 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
          {query && (
            <button
              type="submit"
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden animate-fade-in-up"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1rem',
            border: '1px solid rgba(99,102,241,0.12)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          }}
        >
          {/* Recent searches */}
          {!query && recent.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2 mb-2">Recent</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map(r => (
                  <button key={r} onClick={() => pick(r)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-primary-bg hover:text-primary text-slate-600 text-xs font-medium rounded-xl transition-colors cursor-pointer">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {query && results.length > 0 && (
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {results.map(p => (
                <Link key={p.id} href={`/products/${p.slug}`}
                  onClick={() => { saveRecent(query); setOpen(false); setQuery('') }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                    {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-primary">{formatPrice(p.salePrice ?? p.price)}</p>
                    {p.salePrice && <p className="text-xs text-slate-400 line-through">{formatPrice(p.price)}</p>}
                  </div>
                </Link>
              ))}
              <button onClick={() => pick(query)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary hover:bg-primary-bg transition-colors cursor-pointer">
                View all results for &ldquo;{query}&rdquo; <ArrowRight size={14} />
              </button>
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { count, openCart } = useCart()
  const router = useRouter()
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [mobileQ,     setMobileQ]     = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function submitMobileSearch(e: React.FormEvent) {
    e.preventDefault()
    if (mobileQ.trim()) {
      router.push(`/products?search=${encodeURIComponent(mobileQ.trim())}`)
      setMobileSearch(false); setMobileQ(''); setMobileOpen(false)
    }
  }

  return (
    <>
      <header className="fixed top-3 inset-x-4 sm:inset-x-6 lg:inset-x-8 z-50 max-w-7xl mx-auto">
        <div
          className="rounded-2xl transition-all duration-500"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.93)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.90)',
            boxShadow: scrolled
              ? '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)'
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center px-4 sm:px-5 h-14 gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
              <Image src="/logo.png" alt="Balapasa" width={34} height={34} className="rounded-xl" />
              <span className="font-heading font-bold text-lg text-slate-800 hidden sm:block">
                Bala<span className="iridescent-text">pasa</span>
              </span>
            </Link>

            {/* Inline search (desktop) */}
            <InlineSearch />

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Mobile: search icon */}
              <button
                onClick={() => setMobileSearch(s => !s)}
                aria-label="Search"
                className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all cursor-pointer"
              >
                <Search size={18} />
              </button>

              {/* Track Order */}
              <Link
                href="/track-order"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-primary hover:bg-white/70 transition-all cursor-pointer"
              >
                <Truck size={15} className="text-primary" />
                <span className="hidden lg:block">Track Order</span>
              </Link>

              <Link href="/account/wishlist" aria-label="Wishlist"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all hidden sm:flex cursor-pointer">
                <Heart size={18} />
              </Link>
              <Link href="/account" aria-label="Account"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all hidden sm:flex cursor-pointer">
                <User size={18} />
              </Link>

              {/* Cart */}
              <button onClick={openCart} aria-label="Cart"
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all cursor-pointer">
                <ShoppingCart size={18} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-gradient-to-br from-violet-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce-in">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileOpen(o => !o)} aria-label="Menu"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all sm:hidden cursor-pointer">
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile search bar (expands inline) */}
          {mobileSearch && (
            <div className="md:hidden border-t border-slate-100/80 px-4 py-3 animate-fade-in">
              <form onSubmit={submitMobileSearch} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text" value={mobileQ} onChange={e => setMobileQ(e.target.value)}
                    placeholder="Search products, brands…" autoFocus
                    className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                  />
                </div>
                <button type="submit"
                  className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Mobile menu */}
          {mobileOpen && !mobileSearch && (
            <div className="sm:hidden border-t border-slate-100/80 px-4 py-3 space-y-1 animate-fade-in">
              <Link href="/track-order" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary-bg transition-colors cursor-pointer">
                <Truck size={15} /> Track My Order
              </Link>
              <Link href="/products" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                All Products
              </Link>
              <div className="flex gap-2 pt-2 border-t border-slate-100/80">
                <Link href="/account" onClick={() => setMobileOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <User size={14} /> Account
                </Link>
                <Link href="/account/wishlist" onClick={() => setMobileOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Heart size={14} /> Wishlist
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <CartDrawer />
    </>
  )
}

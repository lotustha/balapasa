'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Heart, ShoppingBag, ArrowRight, ShoppingCart, X, Star, Zap, LogIn } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice, discountPercent } from '@/lib/utils'

interface WishlistProduct {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  images: string[]
  rating: number
  reviewCount: number
  stock: number
  brand?: string | null
  category?: { name: string; slug: string } | null
}

type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'

export default function WishlistPage() {
  const { addItem } = useCart()
  const [status, setStatus]   = useState<Status>('loading')
  const [items, setItems]     = useState<WishlistProduct[]>([])
  const [added, setAdded]     = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/wishlist', { cache: 'no-store' })
        if (res.status === 401) { if (active) setStatus('unauthenticated'); return }
        if (!res.ok) { if (active) setStatus('error'); return }
        const data = await res.json()
        if (!active) return
        setItems(Array.isArray(data.wishlist) ? data.wishlist : [])
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    })()
    return () => { active = false }
  }, [])

  const remove = useCallback(async (productId: string) => {
    setRemoving(productId)
    // Optimistic removal — restore on failure.
    const prev = items
    setItems(list => list.filter(p => p.id !== productId))
    try {
      const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
    } catch {
      setItems(prev)
    } finally {
      setRemoving(null)
    }
  }, [items])

  function handleAdd(p: WishlistProduct) {
    addItem({ id: p.id, name: p.name, price: p.price, salePrice: p.salePrice, image: p.images[0] ?? '/placeholder.jpg', slug: p.slug })
    setAdded(p.id)
    setTimeout(() => setAdded(a => (a === p.id ? null : a)), 1500)
  }

  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]"
          style={{ background: '#EC4899', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div className="flex-1">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Wishlist</h1>
          </div>
          {status === 'ready' && items.length > 0 && (
            <span className="text-xs font-bold text-slate-500 bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {status === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white/60 border border-white/80 shadow-sm animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not signed in */}
        {status === 'unauthenticated' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center">
              <Heart size={30} className="text-pink-300" />
            </div>
            <p className="font-bold text-slate-700">Sign in to see your wishlist</p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
              Your saved items are tied to your account so you can find them on any device.
            </p>
            <Link
              href="/login?redirect=/account/wishlist"
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15"
            >
              <LogIn size={14} /> Sign in
            </Link>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="glass-card p-14 text-center animate-fade-in-up">
            <p className="font-bold text-slate-700">Couldn&apos;t load your wishlist</p>
            <p className="text-slate-400 text-xs mt-2">Please refresh the page and try again.</p>
          </div>
        )}

        {/* Empty */}
        {status === 'ready' && items.length === 0 && (
          <>
            <div className="glass-card p-14 text-center animate-fade-in-up">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center">
                <Heart size={30} className="text-pink-300" />
              </div>
              <p className="font-bold text-slate-700">Your wishlist is empty</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
                Tap the heart icon on any product to save it here for later.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15"
              >
                <ShoppingBag size={14} /> Discover Products <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}

        {/* Grid */}
        {status === 'ready' && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p, i) => {
              const effectivePrice = p.salePrice ?? p.price
              const discount = p.salePrice ? discountPercent(p.price, p.salePrice) : 0
              const soldOut = p.stock === 0
              return (
                <div
                  key={p.id}
                  className="relative h-full flex flex-col rounded-3xl overflow-hidden card-hover animate-fade-in-up"
                  style={{
                    background: 'rgba(255,255,255,0.78)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.90)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    animationDelay: `${Math.min(i * 0.04, 0.4)}s`,
                  }}
                >
                  <Link href={`/products/${p.slug}`} className="block group">
                    <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)' }}>
                      <Image
                        src={p.images[0] ?? '/placeholder.jpg'}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-108"
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {discount > 0 && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-sm">
                            -{discount}%
                          </span>
                        )}
                        {soldOut && (
                          <span className="px-2 py-0.5 glass-md text-slate-600 text-[10px] font-bold rounded-lg">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Remove from wishlist — always visible (mobile-friendly) */}
                  <button
                    onClick={() => remove(p.id)}
                    disabled={removing === p.id}
                    aria-label="Remove from wishlist"
                    className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer shadow-md disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}
                  >
                    <X size={14} className="text-slate-500" />
                  </button>

                  <div className="p-4 border-t flex-1 flex flex-col min-w-0" style={{ borderColor: 'rgba(255,255,255,0.45)' }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 min-h-[12px]">
                      {p.brand ?? ' '}
                    </p>
                    <Link href={`/products/${p.slug}`}>
                      <h3 className="font-heading font-semibold text-slate-800 text-sm leading-snug line-clamp-2 break-words min-h-[2.5em] hover:text-primary transition-colors duration-200">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1 mt-1.5 min-h-[14px]">
                      {p.reviewCount > 0 ? (
                        <>
                          <Star size={11} className="fill-gold-bright text-gold-bright" />
                          <span className="text-[11px] font-semibold text-slate-600">{p.rating.toFixed(1)}</span>
                          <span className="text-[11px] text-slate-400">({p.reviewCount})</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-300">No reviews yet</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-2.5">
                      <span className="font-heading font-bold text-slate-900 text-base">{formatPrice(effectivePrice)}</span>
                      {p.salePrice && (
                        <span className="text-xs text-slate-400 line-through">{formatPrice(p.price)}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAdd(p)}
                      disabled={soldOut}
                      className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
                        added === p.id
                          ? 'bg-primary text-white'
                          : soldOut
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/15'
                      }`}
                    >
                      {added === p.id
                        ? <><Zap size={13} /> Added!</>
                        : soldOut
                        ? 'Out of stock'
                        : <><ShoppingCart size={13} /> Add to Cart</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

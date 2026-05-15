'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice, discountPercent } from '@/lib/utils'

export interface Product {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  images: string[]
  rating: number
  reviewCount: number
  isNew?: boolean
  isFeatured?: boolean
  brand?: string | null
  stock: number
  category?: { name: string }
}

export default function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart()
  const [wished, setWished] = useState(false)
  const [added, setAdded]   = useState(false)

  const effectivePrice = p.salePrice ?? p.price
  const discount       = p.salePrice ? discountPercent(p.price, p.salePrice) : 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    addItem({ id: p.id, name: p.name, price: p.price, salePrice: p.salePrice, image: p.images[0] ?? '/placeholder.jpg', slug: p.slug })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Link href={`/products/${p.slug}`} className="group block cursor-pointer">
      <div className="relative rounded-3xl overflow-hidden card-hover"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.90)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)' }}>
          <Image
            src={p.images[0] ?? '/placeholder.jpg'}
            alt={p.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-108"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-sm">
                -{discount}%
              </span>
            )}
            {p.isNew && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-primary text-white text-[10px] font-bold rounded-lg shadow-sm">
                New
              </span>
            )}
            {p.stock === 0 && (
              <span className="px-2 py-0.5 glass-md text-slate-600 text-[10px] font-bold rounded-lg">
                Sold Out
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={e => { e.preventDefault(); setWished(w => !w) }}
            aria-label="Wishlist"
            className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer shadow-md"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}
          >
            <Heart size={14} className={wished ? 'fill-pink-500 text-pink-500' : 'text-slate-500'} />
          </button>

          {/* Quick add */}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAdd}
              disabled={p.stock === 0}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg ${
                added
                  ? 'bg-primary text-white'
                  : p.stock === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'text-slate-800 hover:bg-primary hover:text-white'
              }`}
              style={!added && p.stock > 0 ? { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' } : {}}
            >
              {added ? <><Zap size={13} /> Added!</> : <><ShoppingCart size={13} /> Add to Cart</>}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.45)' }}>
          {p.brand && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{p.brand}</p>
          )}
          <h3 className="font-heading font-semibold text-slate-800 text-sm leading-snug line-clamp-2 break-words group-hover:text-primary transition-colors duration-200">
            {p.name}
          </h3>

          {p.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star size={11} className="fill-gold-bright text-gold-bright" />
              <span className="text-[11px] font-semibold text-slate-600">{p.rating.toFixed(1)}</span>
              <span className="text-[11px] text-slate-400">({p.reviewCount})</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <span className="font-heading font-bold text-slate-900 text-base">{formatPrice(effectivePrice)}</span>
            {p.salePrice && (
              <span className="text-xs text-slate-400 line-through">{formatPrice(p.price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

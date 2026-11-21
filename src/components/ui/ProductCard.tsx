'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice, discountPercent } from '@/lib/utils'
import { isSoldOut } from '@/lib/stock'
import { useTheme } from '@/components/theme/ThemeProvider'

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

export default function ProductCard({ product: p, priority = false }: { product: Product; priority?: boolean }) {
  const router = useRouter()
  const href = `/products/${p.slug}`
  // A grid of cards would otherwise fetch every product page in the background.
  const warm = () => router.prefetch(href)
  const soldOut = isSoldOut(p as { stock: number; trackInventory?: boolean })
  const { addItem } = useCart()
  const [wished, setWished] = useState(false)
  const [added, setAdded]   = useState(false)
  // Card look comes from the theme: soft glass, compact marketplace, borderless editorial, or bold outline.
  const variant = useTheme().layout.card

  const effectivePrice = p.salePrice ?? p.price
  const discount       = p.salePrice ? discountPercent(p.price, p.salePrice) : 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    addItem({ id: p.id, name: p.name, price: p.price, salePrice: p.salePrice, image: p.images[0] ?? '/placeholder.jpg', slug: p.slug })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const compact = variant === 'compact'
  const minimal = variant === 'minimal'
  const bold    = variant === 'bold'

  const shell = minimal ? 'relative h-full flex flex-col'
    : bold    ? 'relative h-full flex flex-col rounded-2xl overflow-hidden bg-surface transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5'
    : compact ? 'relative h-full flex flex-col rounded-xl overflow-hidden bg-surface transition-shadow duration-200 hover:shadow-lg'
    : 'relative h-full flex flex-col rounded-3xl overflow-hidden card-hover'
  const shellStyle: React.CSSProperties = minimal ? {}
    : bold    ? { border:'2px solid var(--th-ink)', boxShadow: '4px 4px 0 var(--th-ink)' }
    : compact ? { border:'1px solid rgba(var(--th-ink-rgb),0.08)' }
    : {
        background:'rgba(var(--th-surface-rgb),0.78)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border:'1px solid var(--th-hairline)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }
  const badgeShape = bold || minimal ? 'rounded-none' : 'rounded-lg'

  const addButton = (
    <button
      onClick={handleAdd}
      disabled={soldOut}
      className={`w-full flex items-center justify-center gap-1.5 font-semibold text-xs transition-all duration-200 cursor-pointer ${
        bold ? 'py-2.5 border-t-2 uppercase tracking-wide' : 'py-2.5 rounded-xl shadow-lg'
      } ${
        added
          ? 'bg-primary text-white'
          : soldOut
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : bold ? 'bg-primary text-white hover:bg-primary-dark' : 'text-slate-800 hover:bg-primary hover:text-white'
      }`}
      style={bold
        ? { borderColor:'var(--th-ink)' }
        : !added && !soldOut ? { background:'rgba(var(--th-surface-rgb),0.92)', backdropFilter: 'blur(8px)' } : {}}
    >
      {added ? <><Zap size={13} /> Added!</> : soldOut ? 'Sold out' : <><ShoppingCart size={13} /> Add to Cart</>}
    </button>
  )

  return (
    <Link href={href} prefetch={false} onMouseEnter={warm} onTouchStart={warm} onFocus={warm}
      className="group block cursor-pointer h-full" data-product-card={variant}>
      <div className={shell} style={shellStyle}>
        {/* Image */}
        <div className={`relative overflow-hidden ${minimal ? 'aspect-[4/5] rounded-2xl' : 'aspect-square'}`}
          style={{ background: minimal ? 'var(--color-slate-100)' : 'rgba(var(--th-surface-rgb),0.35)' }}>
          <Image
            src={p.images[0] ?? '/placeholder.jpg'}
            alt={p.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-108"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            priority={priority}
          />

          {/* Badges */}
          <div className={`absolute flex flex-col gap-1.5 ${compact ? 'top-2 left-2' : 'top-3 left-3'}`}>
            {discount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-bold shadow-sm ${badgeShape} ${
                variant === 'glass' ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white' : 'bg-primary text-white'
              }`}>
                -{discount}%
              </span>
            )}
            {p.isNew && (
              <span className={`px-2 py-0.5 text-[10px] font-bold shadow-sm ${badgeShape} ${
                variant === 'glass' ? 'bg-gradient-to-r from-cyan-500 to-primary text-white' : 'bg-slate-900 text-slate-50'
              }`}>
                New
              </span>
            )}
            {soldOut && (
              <span className={`px-2 py-0.5 glass-md text-slate-600 text-[10px] font-bold ${badgeShape}`}>
                Sold Out
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={e => { e.preventDefault(); setWished(w => !w) }}
            aria-label="Wishlist"
            className={`absolute w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer shadow-md ${compact ? 'top-2 right-2' : 'top-3 right-3'}`}
            style={{ background:'rgba(var(--th-surface-rgb),0.88)', backdropFilter: 'blur(8px)' }}
          >
            <Heart size={14} className={wished ? 'fill-pink-500 text-pink-500' : 'text-slate-500'} />
          </button>

          {/* Quick add: slides up over the picture, except on the bold card where it is always visible below */}
          {!bold && (
            <div className={`absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${compact ? 'p-2' : 'p-3'}`}>
              {addButton}
            </div>
          )}
        </div>

        {/* Info — flex-col with mt-auto on the price row pins all card prices
            to the bottom regardless of whether brand / rating render. */}
        <div className={`flex-1 flex flex-col min-w-0 ${minimal ? 'pt-3' : compact ? 'p-2.5' : 'p-4 border-t'}`}
          style={minimal || compact ? undefined : { borderColor: bold ? 'var(--th-ink)' : 'rgba(var(--th-surface-rgb),0.45)', borderTopWidth: bold ? 2 : 1 }}>
          {/* Brand row — always reserves a slot so cards align even if the
              brand is missing on some products. The compact card drops it to fit more per screen. */}
          {!compact && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 min-h-[12px]">
              {p.brand ?? ' '}
            </p>
          )}
          {/* Name — always 2-line tall via min-height so single-line and
              two-line names don't push the price block to different heights. */}
          <h3 className={`text-slate-800 leading-snug line-clamp-2 break-words min-h-[2.5em] group-hover:text-primary transition-colors duration-200 ${
            compact ? 'text-xs font-medium' : minimal ? 'font-heading font-medium text-[15px]' : 'font-heading font-semibold text-sm'
          }`}>
            {p.name}
          </h3>

          {/* Rating slot — placeholder when no reviews keeps height stable. */}
          <div className={`flex items-center gap-1 min-h-[14px] ${compact ? 'mt-1' : 'mt-1.5'}`}>
            {p.reviewCount > 0 ? (
              <>
                <Star size={11} className="fill-gold-bright text-gold-bright" />
                <span className="text-[11px] font-semibold text-slate-600">{p.rating.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400">({p.reviewCount})</span>
              </>
            ) : (
              !compact && !minimal && <span className="text-[11px] text-slate-300">No reviews yet</span>
            )}
          </div>

          <div className={`flex items-center flex-wrap gap-x-2 mt-auto ${compact ? 'pt-1.5' : 'pt-2.5'}`}>
            <span className={`font-heading font-bold ${compact ? 'text-sm text-primary' : 'text-base text-slate-900'}`}>{formatPrice(effectivePrice)}</span>
            {p.salePrice && (
              <span className="text-xs text-slate-400 line-through">{formatPrice(p.price)}</span>
            )}
          </div>
        </div>
        {bold && addButton}
      </div>
    </Link>
  )
}

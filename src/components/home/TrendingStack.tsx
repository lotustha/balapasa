'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShoppingCart, TrendingUp } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice, discountPercent } from '@/lib/utils'

interface TrendingProduct {
  id: string; name: string; slug: string
  price: number; salePrice?: number | null
  images: string[]; rating: number; reviewCount: number
  brand?: string | null; isNew?: boolean
}

const INTERVAL_MS  = 4200   // auto-advance every 4.2 s
const EXIT_MS      = 320    // card exit animation duration

// Stack offsets: index 0 = front, index 4 = back
const STACK = [
  { x:  0, y:   0, scale: 1.00, opacity: 1.00, rotate:  0 },
  { x: 12, y: -14, scale: 0.95, opacity: 0.85, rotate:  1.5 },
  { x: 24, y: -28, scale: 0.90, opacity: 0.70, rotate:  3.0 },
  { x: 36, y: -42, scale: 0.85, opacity: 0.55, rotate:  4.5 },
  { x: 48, y: -56, scale: 0.80, opacity: 0.40, rotate:  6.0 },
]

export default function TrendingStack() {
  const { addItem } = useCart()
  const [products, setProducts]  = useState<TrendingProduct[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [exiting,  setExiting]   = useState(false)
  const [paused,   setPaused]    = useState(false)
  const [added,    setAdded]     = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch trending products
  useEffect(() => {
    fetch('/api/products/trending')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
  }, [])

  // Advance to next product (with exit animation)
  const advance = useCallback((dir: 1 | -1 = 1) => {
    if (exiting || products.length < 2) return
    setExiting(true)
    setTimeout(() => {
      setActiveIdx(i => {
        const next = (i + dir + products.length) % products.length
        return next
      })
      setExiting(false)
    }, EXIT_MS)
  }, [exiting, products.length])

  // Auto-rotation
  useEffect(() => {
    if (paused || products.length < 2) return
    timerRef.current = setInterval(() => advance(1), INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, products.length, advance])

  function handleAdd(e: React.MouseEvent, p: TrendingProduct) {
    e.preventDefault()
    addItem({ id: p.id, name: p.name, price: p.price, salePrice: p.salePrice, image: p.images[0], slug: p.slug })
    setAdded(p.id)
    setTimeout(() => setAdded(null), 1500)
  }

  if (products.length === 0) {
    return (
      <div className="hidden lg:flex items-center justify-center h-[420px]">
        <div className="w-64 h-80 glass-card rounded-3xl animate-pulse-glow" />
      </div>
    )
  }

  // Build display order: active first, then remaining in order
  const display = Array.from({ length: Math.min(5, products.length) }, (_, i) =>
    products[(activeIdx + i) % products.length]
  )

  return (
    <div
      className="hidden lg:flex flex-col items-center gap-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stack */}
      <div
        className="relative"
        style={{ width: 240 + 48, height: 340 + 56 }}   // extra space for stack offset
      >
        {display.map((product, stackPos) => {
          const isFront = stackPos === 0
          const style   = STACK[stackPos] ?? STACK[4]
          const discount = product.salePrice ? discountPercent(product.price, product.salePrice) : 0

          return (
            <div
              key={product.id}
              className="absolute bottom-0 left-0"
              style={{
                transform: isFront && exiting
                  // Exit animation: slide left + rotate + shrink
                  ? `translateX(-110%) translateY(10px) rotate(-8deg) scale(0.85)`
                  : `translateX(${style.x}px) translateY(${style.y}px) scale(${style.scale}) rotate(${style.rotate}deg)`,
                opacity:    isFront && exiting ? 0 : style.opacity,
                zIndex:     STACK.length - stackPos,
                transition: `transform ${exiting && isFront ? EXIT_MS : 480}ms cubic-bezier(0.16,1,0.3,1), opacity ${exiting && isFront ? EXIT_MS : 480}ms ease`,
                willChange: 'transform, opacity',
              }}
            >
              <Link
                href={`/products/${product.slug}`}
                className="block cursor-pointer"
                tabIndex={isFront ? 0 : -1}
              >
                <div
                  className="overflow-hidden bg-white"
                  style={{
                    width: 240, borderRadius: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                  }}
                >
                  {/* Product image */}
                  <div className="relative" style={{ height: 220 }}>
                    <Image
                      src={product.images[0] ?? '/placeholder.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="240px"
                      priority={isFront}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.15), transparent)' }} />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {discount > 0 && (
                        <span className="px-2 py-0.5 text-white text-[10px] font-extrabold rounded-lg"
                          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                          -{discount}%
                        </span>
                      )}
                      {product.isNew && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-primary text-white text-[10px] font-extrabold rounded-lg">
                          New
                        </span>
                      )}
                    </div>

                    {/* Rank badge */}
                    {isFront && (
                      <div className="absolute top-3 right-3 w-8 h-8 glass-md rounded-xl flex items-center justify-center shadow-sm">
                        <TrendingUp size={14} className="text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Info (only fully rendered for front card) */}
                  <div className="p-4">
                    {product.brand && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{product.brand}</p>
                    )}
                    <h3 className="font-heading font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} className="fill-gold-bright text-gold-bright" />
                      <span className="text-xs font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">({product.reviewCount})</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="font-heading font-extrabold text-slate-900 text-base">
                          {formatPrice(product.salePrice ?? product.price)}
                        </span>
                        {product.salePrice && (
                          <span className="ml-1.5 text-xs text-slate-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                      {isFront && (
                        <button
                          onClick={e => handleAdd(e, product)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            added === product.id
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-primary hover:text-white'
                          }`}
                          aria-label="Add to cart"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

    </div>
  )
}

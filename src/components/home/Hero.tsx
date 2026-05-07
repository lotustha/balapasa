'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Truck, Star, Zap, Cpu, Sparkles, Package, Clock } from 'lucide-react'

const FALLBACK_STATS = [
  { val: '—',  label: 'Products',  color: '#6366F1' },
  { val: '—',  label: 'Customers', color: '#EC4899' },
  { val: '4.9', label: 'Rating',   color: '#F59E0B' },
]

interface TrendingProduct {
  id: string; name: string; slug: string
  price: number; salePrice?: number | null
  images: string[]; rating: number; reviewCount: number
  brand?: string | null
}

const FALLBACK_PRODUCTS: TrendingProduct[] = [
  { id: '2', name: 'Smart Watch Series X',    slug: 'smart-watch-x',   price: 12000, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=280&fit=crop'], rating: 4.7, reviewCount: 189, brand: 'WearTech' },
  { id: '3', name: 'CeraVe Foaming Cleanser', slug: 'cerave-cleanser', price: 1200, salePrice: 980, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=280&fit=crop'], rating: 4.9, reviewCount: 512, brand: 'CeraVe' },
  { id: '1', name: 'AirPods Pro Max Clone',   slug: 'airpods-pro-max', price: 8500, salePrice: 6800, images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=280&fit=crop'], rating: 4.5, reviewCount: 234, brand: 'SoundX' },
  { id: '6', name: 'Vitamin C Serum 30ml',    slug: 'vitamin-c-serum', price: 1800, images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=280&fit=crop'], rating: 4.8, reviewCount: 445, brand: 'GlowLab' },
  { id: '5', name: 'RGB Mechanical Keyboard', slug: 'rgb-keyboard',    price: 4500, salePrice: 3800, images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=280&fit=crop'], rating: 4.4, reviewCount: 91,  brand: 'KeyMaster' },
]

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  // Trending product auto-rotate
  const [trending, setTrending]     = useState<TrendingProduct[]>(FALLBACK_PRODUCTS)
  const [activeIdx, setActiveIdx]   = useState(0)
  const [visible,  setVisible]      = useState(true)

  // Real stats + categories from DB
  const [stats,      setStats]      = useState(FALLBACK_STATS)
  const [categories, setCategories] = useState<{ slug: string; name: string; color: string; count: number }[]>([])

  useEffect(() => {
    // Trending products
    fetch('/api/products/trending')
      .then(r => r.json())
      .then(d => { if (d.products?.length) setTrending(d.products) })
      .catch(() => {})

    // Top 3 categories by sales this week
    fetch('/api/categories?sort=sales&limit=3')
      .then(r => r.json())
      .then(d => {
        const cats = (d.categories ?? []) as { slug: string; name: string; color: string; sales?: number }[]
        if (cats.length) {
          setCategories(cats.map(c => ({
            slug:  c.slug,
            name:  c.name,
            color: c.color || '#6366F1',
            count: c.sales ?? 0,
          })))

          // Real product count stat
          const totalProducts = cats.reduce((s, c) => s + (c._count?.products ?? 0), 0)
          setStats([
            { val: totalProducts > 0 ? `${totalProducts}+` : '—', label: 'Products',  color: '#6366F1' },
            { val: '—',                                             label: 'Customers', color: '#EC4899' },
            { val: '4.9',                                           label: 'Rating',    color: '#F59E0B' },
          ])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (trending.length < 2) return
    const id = setInterval(() => {
      // Fade out → swap → fade in
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % trending.length)
        setVisible(true)
      }, 300)
    }, 4000)
    return () => clearInterval(id)
  }, [trending.length])

  const current = trending[activeIdx] ?? FALLBACK_PRODUCTS[0]
  const effectivePrice = current.salePrice ?? current.price

  function handleMouseMove(e: React.MouseEvent) {
    if (!heroRef.current) return
    const r = heroRef.current.getBoundingClientRect()
    setMouse({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 14,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -9,
    })
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center overflow-hidden -mt-20"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 35%, #FFF0F9 65%, #F0FDF4 100%)' }}
    >
      {/* ── Colorful aurora blobs ─────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]" style={{ background: '#8B5CF6', animationDelay: '0s' }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-0 right-0 w-[380px] h-[380px]"   style={{ background: '#06B6D4', opacity: 0.28, animationDelay: '2s' }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-0 left-1/3 w-[420px] h-[420px]" style={{ background: '#EC4899', opacity: 0.26, animationDelay: '1s' }} />
        <div className="blob animate-blob-morph animate-blob-float-a absolute top-1/2 right-1/4 w-[300px] h-[300px]" style={{ background: '#10B981', opacity: 0.28, animationDelay: '3s' }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute bottom-16 -left-10 w-[260px] h-[260px]" style={{ background: '#F59E0B', opacity: 0.24, animationDelay: '4s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* ── Left: Text ─────────────────────────────────────────── */}
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full mb-8 cursor-default">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDuration: '2s' }} />
            <span className="text-xs font-semibold text-slate-700 tracking-wide">New arrivals every week</span>
          </div>

          <h1 className="font-heading font-extrabold leading-[1.07] text-slate-900">
            <span className="block text-5xl sm:text-6xl lg:text-[4.25rem]">Where Tech</span>
            <span className="block text-5xl sm:text-6xl lg:text-[4.25rem]">
              Meets <span className="gradient-text-warm">Beauty</span>
            </span>
            <span className="block text-3xl sm:text-4xl lg:text-[2.6rem] mt-2 text-slate-400 font-medium">
              All in one place.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-500 max-w-md leading-relaxed">
            Premium electronics, cutting-edge gadgets, and luxe beauty — curated for you,
            delivered fast across Nepal.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/products"
              className="group inline-flex items-center gap-2 px-7 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 cursor-pointer">
              Shop Now
              <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link href="/products?featured=true"
              className="inline-flex items-center gap-2 px-7 py-4 glass-card text-slate-700 font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:bg-white/90 cursor-pointer">
              <Zap size={15} className="text-gold-bright" /> Featured Picks
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-5 mt-8">
            {[
              { icon: ShieldCheck, text: 'Authentic Products' },
              { icon: Truck,       text: 'Same-day Delivery' },
              { icon: Star,        text: '4.9/5 Rated' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-slate-500">
                <Icon size={14} className="text-primary" /> {text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {['eSewa', 'Khalti', 'COD', 'Pathao'].map(p => (
              <span key={p} className="px-2.5 py-1 glass-card rounded-lg text-[10px] font-semibold text-slate-500">{p}</span>
            ))}
          </div>
        </div>

        {/* ── Right: Bento product showcase ──────────────────────── */}
        <div
          className="relative hidden lg:flex flex-col gap-4 h-auto"
          style={{
            transform: `perspective(1200px) rotateX(${mouse.y * 0.4}deg) rotateY(${mouse.x * 0.4}deg)`,
            transition: 'transform 0.25s ease-out',
          }}
        >
          {/* Row 1: Featured product card + category chips */}
          <div className="flex gap-4">
            {/* Featured product — auto-rotates through trending products */}
            <Link
              href={`/products/${current.slug}`}
              className="flex-1 glass-card p-4 animate-fade-in-up delay-100 hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
            >
              {/* Fading inner content — only the content transitions, not the card shell */}
              <div
                style={{
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.28s ease',
                }}
              >
                <div className="relative h-40 rounded-2xl overflow-hidden mb-3">
                  <Image
                    key={current.id}
                    src={current.images[0]}
                    alt={current.name}
                    fill className="object-cover"
                    sizes="220px"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.3), transparent)' }} />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-white text-[10px] font-bold rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                    #{activeIdx + 1} Trending
                  </span>
                </div>

                <p className="font-heading font-bold text-slate-800 text-sm leading-tight line-clamp-1">{current.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-extrabold text-base">
                      NPR {effectivePrice.toLocaleString()}
                    </span>
                    {current.salePrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {current.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={10}
                        className={i <= Math.round(current.rating) ? 'fill-gold-bright text-gold-bright' : 'text-slate-200'} />
                    ))}
                  </div>
                </div>

                {/* Dot indicators */}
                <div className="flex items-center gap-1 mt-2.5">
                  {trending.slice(0, 5).map((_, i) => (
                    <div key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === activeIdx ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Link>

            {/* Category chips */}
            <div className="w-36 flex flex-col gap-3">
              {categories.map(({ slug, name, color, count }, i) => (
                <Link
                  key={slug}
                  href={`/products?category=${slug}`}
                  className="glass-card p-3 flex items-center gap-2.5 hover:scale-105 transition-all duration-200 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                    <Package size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-xs leading-none">{name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{count} sold this week</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Row 2: Flash deal + delivery */}
          <div className="flex gap-4 animate-fade-in-up delay-300">
            <div className="flex-1 glass-card p-4 cursor-default"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                  <Zap size={13} className="text-white fill-white" />
                </div>
                <span className="text-xs font-bold text-slate-700">Flash Deal Active</span>
              </div>
              <p className="font-heading font-extrabold text-2xl text-slate-900">Up to <span className="gradient-text-warm">40% OFF</span></p>
              <p className="text-xs text-slate-500 mt-1">Selected products this week only</p>
              <Link href="/products?featured=true"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-violet-600 hover:text-violet-700 cursor-pointer">
                View Deals <ArrowRight size={12} />
              </Link>
            </div>

            <div className="w-36 glass-card p-3 cursor-default"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08))' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Truck size={16} className="text-emerald-600" />
              </div>
              <p className="font-bold text-slate-800 text-xs leading-tight">Same-day Delivery</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">Via Pathao across Kathmandu</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-semibold">
                <Clock size={10} /> 1–3 hrs
              </div>
            </div>
          </div>

          {/* Row 3: Stats */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-500">
            {stats.map(({ val, label, color }) => (
              <div key={label}
                className="glass-card p-3 text-center cursor-default hover:scale-105 transition-transform duration-200"
                style={{ borderTop: `2px solid ${color}22` }}
              >
                <p className="font-heading font-extrabold text-xl text-slate-900">{val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-[10px] text-slate-400 uppercase tracking-[0.25em]">Discover</span>
        <div className="w-px h-10 bg-gradient-to-b from-slate-400/40 to-transparent animate-float" />
      </div>
    </section>
  )
}

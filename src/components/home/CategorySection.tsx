'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface DbCategory {
  id: string; name: string; slug: string; color: string
  icon: string | null; image: string | null
  sales?: number
  _count?: { products: number }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function CategoryCard({ cat, idx }: { cat: DbCategory; idx: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [tilt,    setTilt]    = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  const rgb     = hexToRgb(cat.color || '#16A34A')
  const gradient = `linear-gradient(135deg, rgba(${rgb},0.06) 0%, rgba(${rgb},0.14) 50%, rgba(${rgb},0.22) 100%)`
  const blobA    = `rgba(${rgb},0.35)`
  const blobB    = `rgba(${rgb},0.20)`

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setTilt({
      x: ((e.clientY - r.top)  / r.height - 0.5) * -10,
      y: ((e.clientX - r.left) / r.width  - 0.5) *  10,
    })
  }

  return (
    <Link
      ref={ref}
      href={`/products?category=${cat.slug}`}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      className="block rounded-3xl overflow-hidden cursor-pointer animate-fade-in-up glass transition-shadow duration-300"
      style={{
        animationDelay: `${idx * 0.08}s`,
        transform: hovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.025)`
          : 'perspective(1000px) rotateX(0) rotateY(0) scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease',
        boxShadow: hovered ? `0 28px 56px rgba(${rgb},0.22)` : 'var(--glass-shadow)',
      }}
    >
      {/* Image / gradient area */}
      <div className="relative h-52 overflow-hidden" style={{ background: gradient }}>

        {/* Blob accents */}
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full blur-2xl" style={{ background: blobA }} />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-2xl" style={{ background: blobB }} />

        {/* Category image (if set) */}
        {cat.image ? (
          <>
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              sizes="400px"
              className="object-cover"
              style={{ opacity: hovered ? 0.95 : 0.85, transition: 'opacity 0.3s' }}
            />
            {/* Gradient overlay so text is readable */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(${rgb},0.6) 0%, transparent 60%)` }} />
          </>
        ) : (
          <>
            {/* Emoji watermark (large background) */}
            {cat.icon && (
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                <span style={{ fontSize: 110, opacity: 0.10, lineHeight: 1 }}>{cat.icon}</span>
              </div>
            )}

            {/* Center icon box */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300"
                style={{
                  background: `rgba(${rgb},0.15)`,
                  backdropFilter: 'blur(8px)',
                  border: `1px solid rgba(${rgb},0.3)`,
                  transform: hovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1) rotate(0deg)',
                }}
              >
                {cat.icon ? (
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{cat.icon}</span>
                ) : (
                  /* Color dot fallback */
                  <div className="w-8 h-8 rounded-full shadow-inner" style={{ background: cat.color }} />
                )}
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `rgba(${rgb},0.12)`, color: cat.color, backdropFilter: 'blur(8px)' }}>
                {cat.sales != null ? `${cat.sales} sold` : `${cat._count?.products ?? 0} items`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Text area */}
      <div className="p-5 border-t border-white/70">
        <h3 className="font-heading font-bold text-xl text-slate-800">{cat.name}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mt-1.5 line-clamp-2">
          {cat.sales != null
            ? `${cat.sales} sold this week · ${cat._count?.products ?? 0} products`
            : `${cat._count?.products ?? 0} products available`}
        </p>

        <div
          className="flex items-center gap-1.5 mt-4 text-sm font-semibold transition-all duration-200"
          style={{ color: hovered ? cat.color : '#64748B' }}
        >
          Shop now
          <ArrowRight size={14} style={{ transform: hovered ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Hover shine */}
      {hovered && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ background: `radial-gradient(circle at ${50 + tilt.y * 2}% ${50 + tilt.x * 2}%, rgba(255,255,255,0.40) 0%, transparent 55%)` }} />
      )}
    </Link>
  )
}

export default function CategorySection() {
  const [categories, setCategories] = useState<DbCategory[]>([])

  useEffect(() => {
    fetch('/api/categories?sort=sales&limit=4')
      .then(r => r.json())
      .then(d => { if (d.categories?.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F4F6FF 0%, #FAF5FF 100%)' }}
    >
      <div className="absolute top-10 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: '#8B5CF6', opacity: 0.08 }} />
      <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: '#06B6D4', opacity: 0.08 }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 animate-fade-in-up">
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">Trending This Week</p>
          <h2 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900">
            Shop by <span className="gradient-text">Category</span>
          </h2>
          <p className="text-slate-500 mt-4 max-w-md mx-auto">
            Top 4 categories by sales this week — updated automatically
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-64 rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} idx={i} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 bg-white rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer shadow-sm">
            Browse all categories <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

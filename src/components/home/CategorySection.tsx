'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'

interface DbCategory {
  id: string; name: string; slug: string; color: string
  icon: string | null; image: string | null
  sales?: number
  previewImages?: string[]
  _count?: { products: number }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function CategoryTile({ cat, idx }: { cat: DbCategory; idx: number }) {
  const rgb      = hexToRgb(cat.color || '#16A34A')
  const gradient = `linear-gradient(135deg, rgba(${rgb},0.08) 0%, rgba(${rgb},0.18) 100%)`
  const productCount = cat._count?.products ?? 0
  const previews     = cat.previewImages ?? []

  // Pad the preview slot count to 4 so the 2x2 grid always renders the same
  // shape — empty cells get a soft branded gradient instead of blank space.
  const cells = Array.from({ length: 4 }, (_, i) => previews[i] ?? null)

  return (
    <Link
      href={`/products?category=${cat.slug}`}
      className="group relative flex flex-col gap-3 p-3 rounded-2xl border border-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in-up overflow-hidden"
      style={{
        animationDelay: `${idx * 0.05}s`,
        background:'rgba(var(--th-surface-rgb),0.78)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Soft color wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: gradient }}
      />

      {/* 2x2 preview collage */}
      <div
        className="relative grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden aspect-square"
        style={{ background:`rgba(${rgb},0.06)` }}
      >
        {cells.map((src, i) =>
          src ? (
            <div key={i} className="relative bg-surface/60 rounded-md overflow-hidden">
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width:640px) 25vw, (max-width:1024px) 16vw, 12vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          ) : cat.icon && i === 0 && previews.length === 0 ? (
            <div
              key={i}
              className="col-span-2 row-span-2 flex items-center justify-center rounded-md"
              style={{
                background:`linear-gradient(135deg, rgba(${rgb},0.15), rgba(${rgb},0.30))`,
              }}
            >
              <span style={{ fontSize: 42, lineHeight: 1 }}>{cat.icon}</span>
            </div>
          ) : (
            <div
              key={i}
              className="rounded-md"
              style={{ background:`rgba(${rgb},0.10)` }}
            />
          ),
        )}
      </div>

      {/* Label + arrow */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-sm text-slate-800 leading-tight line-clamp-1">
            {cat.name}
          </h3>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {productCount} {productCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <ArrowRight
          size={14}
          className="shrink-0 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </Link>
  )
}

export default function CategorySection() {
  const [categories, setCategories] = useState<DbCategory[]>([])
  // Tiles (large collage cards), circles (one scrolling row) or chips: chosen by the theme.
  const variant = useTheme().layout.categories

  useEffect(() => {
    fetch('/api/categories?sort=sales&limit=8')
      .then(r => r.json())
      .then(d => { if (d.categories?.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  if (variant === 'circles' || variant === 'strip') {
    return (
      <section className="py-8 sm:py-10" data-categories={variant}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">Shop by category</h2>
            <Link href="/products" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          {variant === 'circles' ? (
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 chip-scroller">
              {(categories.length ? categories : Array.from({ length: 8 }, () => null)).map((cat, i) => cat ? (
                <Link key={cat.id} href={`/products?category=${cat.slug}`} className="group shrink-0 w-20 sm:w-24 text-center">
                  <span className="relative block w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-100 ring-2 ring-transparent group-hover:ring-primary transition-all"
                    style={{ boxShadow: '0 0 0 4px var(--th-surface)' }}>
                    {(cat.image ?? cat.previewImages?.[0]) && (
                      <Image src={(cat.image ?? cat.previewImages?.[0]) as string} alt="" fill className="object-cover" sizes="96px" />
                    )}
                  </span>
                  <span className="mt-2.5 block text-xs font-semibold text-slate-700 group-hover:text-primary line-clamp-2 leading-tight">{cat.name}</span>
                </Link>
              ) : (
                <div key={i} className="shrink-0 w-20 sm:w-24">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full skeleton" />
                  <div className="h-2.5 rounded skeleton mt-3 mx-3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {categories.map(cat => (
                <Link key={cat.id} href={`/products?category=${cat.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface text-sm font-semibold text-slate-700 hover:bg-primary hover:text-white transition-colors"
                  style={{ border:'1px solid rgba(var(--th-ink-rgb),0.14)' }}>
                  {cat.name}
                  {cat._count?.products ? <span className="text-[11px] font-medium opacity-60">{cat._count.products}</span> : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background:'linear-gradient(180deg, var(--th-wash-7) 0%, var(--th-wash-2) 100%)' }}
    >
      {/* Decorative blobs — keep the section feeling generous and prominent */}
      <div className="absolute top-10 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none th-decor" style={{ background:'#8B5CF6', opacity: 0.10 }} />
      <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none th-decor" style={{ background:'#06B6D4', opacity: 0.10 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none th-decor" style={{ background:'#EC4899', opacity: 0.05 }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Generous, prominent header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 shadow-sm"
            style={{
              background:'rgba(var(--th-surface-rgb),0.78)',
              backdropFilter: 'blur(12px)',
              border:'1px solid rgba(var(--th-surface-rgb),0.85)',
            }}>
            <LayoutGrid size={13} className="text-primary" />
            <span className="text-xs font-bold text-slate-700 tracking-wide">Browse All Categories</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-slate-900">
            Shop by <span className="gradient-text">Category</span>
          </h2>
          <p className="text-slate-500 mt-4 max-w-lg mx-auto text-sm sm:text-base">
            Explore our most popular categories — handpicked weekly based on what shoppers love
          </p>
        </div>

        {/* Compact 8-tile grid */}
        {categories.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="rounded-2xl border border-white/70 p-3" style={{ background:'rgba(var(--th-surface-rgb),0.78)' }}>
                <div className="aspect-square rounded-xl skeleton mb-3" />
                <div className="h-3 rounded skeleton w-2/3 mb-1.5" />
                <div className="h-2 rounded skeleton w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((cat, i) => (
              <CategoryTile key={cat.id} cat={cat} idx={i} />
            ))}
          </div>
        )}

        {/* Prominent "Browse all" CTA */}
        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-all cursor-pointer shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            <LayoutGrid size={15} />
            Browse all categories
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

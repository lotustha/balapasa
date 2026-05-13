'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { useState, useEffect } from 'react'

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

function CategoryTile({ cat, idx }: { cat: DbCategory; idx: number }) {
  const rgb      = hexToRgb(cat.color || '#16A34A')
  const gradient = `linear-gradient(135deg, rgba(${rgb},0.08) 0%, rgba(${rgb},0.18) 100%)`
  const productCount = cat._count?.products ?? 0

  return (
    <Link
      href={`/products?category=${cat.slug}`}
      className="group relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border border-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in-up overflow-hidden"
      style={{
        animationDelay: `${idx * 0.05}s`,
        background:    'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Soft color wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: gradient }}
      />

      {/* Icon container */}
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg] overflow-hidden"
        style={{
          background: `rgba(${rgb},0.12)`,
          border: `1px solid rgba(${rgb},0.25)`,
        }}
      >
        {cat.image ? (
          <Image src={cat.image} alt={cat.name} fill sizes="56px" className="object-cover" />
        ) : cat.icon ? (
          <span style={{ fontSize: 26, lineHeight: 1 }}>{cat.icon}</span>
        ) : (
          <div className="w-5 h-5 rounded-full" style={{ background: cat.color }} />
        )}
      </div>

      {/* Label */}
      <div className="relative text-center">
        <h3 className="font-heading font-bold text-sm text-slate-800 leading-tight line-clamp-1">
          {cat.name}
        </h3>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
          {productCount} {productCount === 1 ? 'item' : 'items'}
        </p>
      </div>
    </Link>
  )
}

export default function CategorySection() {
  const [categories, setCategories] = useState<DbCategory[]>([])

  useEffect(() => {
    fetch('/api/categories?sort=sales&limit=8')
      .then(r => r.json())
      .then(d => { if (d.categories?.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F4F6FF 0%, #FAF5FF 100%)' }}
    >
      {/* Decorative blobs — keep the section feeling generous and prominent */}
      <div className="absolute top-10 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: '#8B5CF6', opacity: 0.10 }} />
      <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: '#06B6D4', opacity: 0.10 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: '#EC4899', opacity: 0.05 }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Generous, prominent header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 shadow-sm"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.85)',
            }}>
            <LayoutGrid size={13} className="text-primary" />
            <span className="text-xs font-bold text-slate-700 tracking-wide">Browse All Categories</span>
          </div>
          <h2 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900">
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
              <div key={i} className="h-32 rounded-2xl skeleton" />
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

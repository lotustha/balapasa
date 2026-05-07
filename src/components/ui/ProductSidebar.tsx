'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, X, SlidersHorizontal, Cpu, Zap, Sparkles,
  Tag, Star, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

// Maps known category slugs to icons — unknown slugs fall back to a colored dot
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  electronics: Cpu,
  gadgets:     Zap,
  beauty:      Sparkles,
}

interface SidebarCategory { slug: string; name: string; color: string }

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First'        },
  { value: 'price-asc',  label: 'Price: Low → High'   },
  { value: 'price-desc', label: 'Price: High → Low'   },
  { value: 'rating',     label: 'Top Rated'           },
]

const PRICE_MAX = 50000

// ── Dual range slider ────────────────────────────────────────────────────────

function DualRangeSlider({
  min, max, value: [low, high], onChange,
}: {
  min: number; max: number; value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const range = max - min
  const lowPct  = ((low  - min) / range) * 100
  const highPct = ((high - min) / range) * 100

  function setLow(v: number) {
    onChange([Math.min(v, high - 100), high])
  }
  function setHigh(v: number) {
    onChange([low, Math.max(v, low + 100)])
  }

  return (
    <div className="px-1">
      {/* Price labels */}
      <div className="flex justify-between text-xs font-bold text-slate-700 mb-4">
        <span className="px-2 py-1 glass-card rounded-lg">{formatPrice(low)}</span>
        <span className="px-2 py-1 glass-card rounded-lg">{formatPrice(high)}</span>
      </div>

      {/* Slider track */}
      <div className="relative h-1.5 mx-2">
        {/* Background track */}
        <div className="absolute inset-0 bg-slate-200 rounded-full" />
        {/* Active fill */}
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${lowPct}%`,
            width: `${highPct - lowPct}%`,
            background: 'linear-gradient(90deg, #16A34A, #06B6D4)',
          }}
        />

        {/* Min input */}
        <input
          type="range" min={min} max={max} step={100} value={low}
          onChange={e => setLow(Number(e.target.value))}
          className="price-range-thumb"
          style={{ position: 'absolute', inset: 0, width: '100%' }}
          aria-label="Minimum price"
        />

        {/* Max input */}
        <input
          type="range" min={min} max={max} step={100} value={high}
          onChange={e => setHigh(Number(e.target.value))}
          className="price-range-thumb"
          style={{ position: 'absolute', inset: 0, width: '100%' }}
          aria-label="Maximum price"
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mt-3 px-1">
        <span>NPR 0</span>
        <span>NPR {(PRICE_MAX / 1000).toFixed(0)}K</span>
      </div>
    </div>
  )
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title, children, defaultOpen = true,
  accent,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; accent?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 px-1 text-left cursor-pointer group"
      >
        <span className="font-heading font-bold text-sm text-slate-800 group-hover:text-primary transition-colors">
          {accent && <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: accent }} />}
          {title}
        </span>
        {open
          ? <ChevronUp size={14} className="text-slate-400" />
          : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export default function ProductSidebar({ totalCount, categories }: { totalCount: number; categories: SidebarCategory[] }) {
  const displayCategories = [
    { slug: '', label: 'All Products', icon: null, color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
    ...categories.map(c => ({
      slug:  c.slug,
      label: c.name,
      icon:  ICON_MAP[c.slug] ?? null,
      color: c.color,
      bg:    `${c.color}1A`,
    })),
  ]
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Local state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [priceRange,  setPriceRange]  = useState<[number, number]>([
    Number(searchParams.get('minPrice') ?? 0),
    Number(searchParams.get('maxPrice') ?? PRICE_MAX),
  ])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeCategory = searchParams.get('category') ?? ''
  const activeSort     = searchParams.get('sort') ?? 'newest'
  const onSale         = searchParams.get('onSale') === 'true'
  const isNew          = searchParams.get('isNew')  === 'true'

  // Count active filters for badge
  const filterCount = [
    activeCategory, searchParams.get('search'),
    priceRange[0] > 0 ? '1' : '',
    priceRange[1] < PRICE_MAX ? '1' : '',
    onSale ? '1' : '', isNew ? '1' : '',
  ].filter(Boolean).length

  // Navigate with merged params — resets page to 1 on any filter change
  const navigate = useCallback((updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('page')
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '' || v === 'false' || v === '0' || (k === 'maxPrice' && v === String(PRICE_MAX))) {
        p.delete(k)
      } else {
        p.set(k, v)
      }
    }
    router.push(`/products?${p.toString()}`, { scroll: false })
  }, [searchParams, router])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ search: searchInput })
    }, 320)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Price range commit (on mouseup)
  function commitPrice(v: [number, number]) {
    setPriceRange(v)
    navigate({ minPrice: String(v[0]), maxPrice: String(v[1]) })
  }

  function clearAll() {
    setSearchInput('')
    setPriceRange([0, PRICE_MAX])
    router.push('/products', { scroll: false })
  }

  const SidebarContent = (
    <div className="space-y-0">
      {/* Search */}
      <Section title="Search" accent="#16A34A">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search products, brands…"
            className="w-full pl-10 pr-9 py-3 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </Section>

      {/* Categories */}
      <Section title="Category" accent="#6366F1">
        <div className="space-y-2">
          {displayCategories.map(({ slug, label, icon: Icon, color, bg }) => (
            <button
              key={slug}
              onClick={() => navigate({ category: slug })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              style={activeCategory === slug
                ? { background: bg, color, fontWeight: 700, border: `1.5px solid ${color}30` }
                : { background: 'transparent', color: '#475569', border: '1.5px solid transparent' }}
            >
              {Icon
                ? <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all"
                    style={{ background: activeCategory === slug ? `${color}20` : 'rgba(0,0,0,0.04)' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                : <div className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: activeCategory === slug ? `${color}20` : 'rgba(0,0,0,0.04)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  </div>
              }
              <span className="flex-1">{label}</span>
              {activeCategory === slug && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* Price Range */}
      <Section title="Price Range" accent="#EC4899">
        <DualRangeSlider
          min={0} max={PRICE_MAX}
          value={priceRange}
          onChange={(v) => { setPriceRange(v); commitPrice(v) }}
        />
      </Section>

      {/* Sort */}
      <Section title="Sort By" accent="#06B6D4">
        <div className="space-y-1.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <label key={value}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 text-sm ${
                activeSort === value
                  ? 'bg-primary-bg text-primary font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio" name="sort" value={value}
                checked={activeSort === value}
                onChange={() => navigate({ sort: value })}
                className="accent-primary w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {/* Quick Toggles */}
      <Section title="Quick Filters" defaultOpen={false} accent="#F59E0B">
        <div className="space-y-2.5">
          {[
            { key: 'isNew',  label: 'New Arrivals', icon: Star,  color: '#06B6D4', val: isNew  },
            { key: 'onSale', label: 'On Sale',       icon: Tag,   color: '#EC4899', val: onSale },
          ].map(({ key, label, icon: Icon, color, val }) => (
            <button
              key={key}
              onClick={() => navigate({ [key]: val ? null : 'true' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 cursor-pointer border-1.5 ${
                val
                  ? 'text-white border-transparent'
                  : 'text-slate-600 border-slate-100 bg-white hover:bg-slate-50'
              }`}
              style={val ? { background: `linear-gradient(135deg, ${color}, ${color}cc)` } : {}}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${val ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Icon size={14} style={{ color: val ? 'white' : color }} />
              </div>
              {label}
              {val && <span className="ml-auto text-white/80 text-[10px]">✓ Active</span>}
            </button>
          ))}
        </div>
      </Section>

      {/* Clear all */}
      {filterCount > 0 && (
        <div className="pt-2">
          <button
            onClick={clearAll}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-red-100"
          >
            <RotateCcw size={14} /> Clear All Filters
            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full ml-1">
              {filterCount}
            </span>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ── Mobile filter button ──────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 mb-5">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 glass-card rounded-2xl text-sm font-semibold text-slate-700 hover:bg-white/90 cursor-pointer transition-all shadow-sm"
        >
          <SlidersHorizontal size={15} className="text-primary" />
          Filters {filterCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
              {filterCount}
            </span>
          )}
        </button>
        <span className="text-sm text-slate-400">{totalCount} products</span>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 w-[300px] animate-slide-right lg:hidden"
            style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.9)', boxShadow: '8px 0 32px rgba(0,0,0,0.10)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-heading font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-primary" /> Filters
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-20 px-5 py-2">
              {SidebarContent}
            </div>
          </div>
        </>
      )}

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="glass-card p-5 sticky top-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-primary" /> Filters
            </h2>
            {filterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                {filterCount} active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">{totalCount} products</p>

          {/* Colorful blob accent */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }} />

          {SidebarContent}
        </div>
      </aside>
    </>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'

const CATEGORIES = ['electronics', 'gadgets', 'facewash', 'beauty']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Best Rated' },
]

export default function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category') ?? 'all'
  const activeSort = searchParams.get('sort') ?? 'newest'

  function navigate(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'newest' || value === 'all') params.delete(key)
    else params.set(key, value)
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('category', 'all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => navigate('category', cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-gray-400" />
        <select
          className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          value={activeSort}
          onChange={e => navigate('sort', e.target.value)}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

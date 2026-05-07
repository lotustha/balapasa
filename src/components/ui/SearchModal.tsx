'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, X, ArrowRight, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  images: string[]
  category: { name: string }
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`)
        const data = await res.json()
        setResults(data.products ?? [])
      } catch {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search size={20} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products, brands..."
              className="flex-1 text-gray-900 placeholder-gray-400 text-base outline-none font-body"
            />
            {loading && <Loader2 size={18} className="text-gray-400 animate-spin" />}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {results.length > 0 && (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {results.map(p => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-primary">{formatPrice(p.salePrice ?? p.price)}</p>
                    {p.salePrice && (
                      <p className="text-xs text-gray-400 line-through">{formatPrice(p.price)}</p>
                    )}
                  </div>
                </Link>
              ))}
              <Link
                href={`/products?search=${encodeURIComponent(query)}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-bg transition-colors cursor-pointer"
              >
                View all results <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No results for &quot;{query}&quot;
            </div>
          )}

          {!query && (
            <div className="px-4 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Popular</p>
              <div className="flex flex-wrap gap-2">
                {['iPhone', 'AirPods', 'Cerave', 'Smart Watch', 'Lipstick', 'Charger'].map(t => (
                  <button
                    key={t}
                    onClick={() => setQuery(t)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-primary-bg hover:text-primary rounded-xl text-sm text-gray-600 transition-colors cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

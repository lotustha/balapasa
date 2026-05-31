'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Loader2, Trash2, Search, ExternalLink, MessageSquare } from 'lucide-react'
import { useConfirm } from '@/components/ui/useConfirm'

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  author: string
  product: { id: string; name: string; slug: string; images: string[] } | null
}

const RATING_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: '5', label: '5★' },
  { key: '4', label: '4★' },
  { key: '3', label: '3★' },
  { key: '2', label: '2★' },
  { key: '1', label: '1★' },
]

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' })
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < n ? 'fill-gold-bright text-gold-bright' : 'text-slate-200'} />
      ))}
    </div>
  )
}

export default function ReviewModerationPage() {
  const { confirm, dialog } = useConfirm()
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating]   = useState('')
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (rating) qs.set('rating', rating)
    if (search.trim()) qs.set('search', search.trim())
    const res = await fetch(`/api/admin/reviews?${qs}`, { cache: 'no-store' })
    if (res.ok) setReviews((await res.json()).reviews ?? [])
    setLoading(false)
  }, [rating, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function del(r: Review) {
    const ok = await confirm({
      title: 'Delete review?',
      message: <>This {r.rating}★ review by <span className="font-bold text-slate-700">{r.author}</span> will be removed and the product&rsquo;s rating recalculated.</>,
      confirmLabel: 'Delete review',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(r.id)
    const res = await fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' })
    if (res.ok) setReviews(prev => prev.filter(x => x.id !== r.id))
    else alert('Failed to delete review')
    setBusy(null)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" /> Reviews
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Moderate customer reviews. Deleting one recalculates the product rating.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
          {RATING_TABS.map(t => (
            <button key={t.key} onClick={() => setRating(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rating === t.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search comments…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-300 bg-white rounded-2xl border border-slate-100">
          <MessageSquare size={36} className="mb-3" />
          <p className="text-sm font-medium text-slate-400">No reviews match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
              {r.product && (
                <Link href={`/products/${r.product.slug}`} target="_blank"
                  className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                  <Image src={r.product.images?.[0] ?? '/placeholder.jpg'} alt={r.product.name} fill className="object-cover" sizes="48px" />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars n={r.rating} />
                  {r.product
                    ? <Link href={`/products/${r.product.slug}`} target="_blank" className="text-xs font-bold text-slate-500 hover:text-primary inline-flex items-center gap-1">
                        {r.product.name} <ExternalLink size={10} />
                      </Link>
                    : <span className="text-xs font-bold text-slate-400">Product removed</span>}
                </div>
                {r.comment
                  ? <p className="text-slate-800 text-sm mt-1.5 break-words">{r.comment}</p>
                  : <p className="text-slate-400 text-sm mt-1.5 italic">No comment — rating only</p>}
                <p className="text-[11px] text-slate-400 mt-1">{r.author} · {fmtDate(r.createdAt)}</p>
              </div>
              <button onClick={() => del(r)} disabled={busy === r.id} title="Delete review"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0">
                {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}

'use client'

import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2, ChevronRight, BadgeCheck, ThumbsUp, Pencil, Trash2, X } from 'lucide-react'
import type { ClientReview } from './types'

type ReviewSort = 'recent' | 'helpful' | 'highest' | 'lowest'
type ReviewFilter = 0 | 1 | 2 | 3 | 4 | 5

// Reviews are split out of ProductDetailClient and loaded via next/dynamic so
// their JS stays out of the product page's initial bundle — the whole block is
// below the fold and most visitors never reach it. All review state lives here;
// the write path calls router.refresh() so the server re-renders the (cached)
// rating, meaning nothing here has to lift state back up to the parent.
interface Props {
  productId: string
  rating: number
  reviews: ClientReview[]
}

export default function ProductReviews({ productId, rating, reviews }: Props) {
  const router = useRouter()

  // ── Reviews filter + sort ────────────────────────────────────────────────
  const [helpful, setHelpful] = useState<Set<string>>(new Set())
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(0)
  const [reviewSort, setReviewSort] = useState<ReviewSort>('recent')
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const filteredReviews = useMemo(() => {
    const filtered = reviewFilter === 0 ? reviews : reviews.filter(r => r.rating === reviewFilter)
    const sorted = [...filtered]
    if (reviewSort === 'recent') sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    else if (reviewSort === 'highest') sorted.sort((a, b) => b.rating - a.rating)
    else if (reviewSort === 'lowest') sorted.sort((a, b) => a.rating - b.rating)
    else if (reviewSort === 'helpful') sorted.sort((a, b) => (helpful.has(b.id) ? 1 : 0) - (helpful.has(a.id) ? 1 : 0))
    return sorted
  }, [reviews, reviewFilter, reviewSort, helpful])

  // ── Write a review ──────────────────────────────────────────────────────
  const [showReviewForm,  setShowReviewForm]  = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [myRating,      setMyRating]      = useState(0)
  const [myReview,      setMyReview]      = useState('')
  const [reviewSaving,  setReviewSaving]  = useState(false)
  const [reviewMsg,     setReviewMsg]     = useState<{ text: string; ok: boolean } | null>(null)
  // Ownership of reviews is resolved client-side (the page is ISR-cached, so we
  // can't read the cookie server-side without making it dynamic). GET /api/reviews
  // returns a `mine` flag per review; we keep the ids of the user's own reviews.
  const [myReviewIds,   setMyReviewIds]   = useState<Set<string>>(new Set())
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  useEffect(() => {
    if (!productId) return
    fetch(`/api/reviews?productId=${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { reviews?: Array<{ id: string; mine: boolean }> } | null) => {
        if (d?.reviews) setMyReviewIds(new Set(d.reviews.filter(x => x.mine).map(x => x.id)))
      })
      .catch(() => {})
  }, [productId])

  async function submitReview() {
    if (myRating === 0) return
    setReviewSaving(true); setReviewMsg(null)
    const res = editingReviewId
      ? await fetch(`/api/reviews/${editingReviewId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: myRating, comment: myReview }),
        })
      : await fetch('/api/reviews', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, rating: myRating, comment: myReview }),
        })
    const data = await res.json()
    if (res.ok) {
      setReviewMsg({ text: editingReviewId ? 'Review updated!' : 'Review submitted! Thank you.', ok: true })
      setMyRating(0); setMyReview(''); setShowReviewForm(false); setEditingReviewId(null)
      router.refresh()
    } else {
      setReviewMsg({ text: data.error ?? 'Failed to submit review', ok: false })
    }
    setReviewSaving(false)
  }

  function startEditReview(r: ClientReview) {
    setEditingReviewId(r.id)
    setMyRating(r.rating)
    setMyReview(r.comment ?? '')
    setReviewMsg(null)
    setShowReviewForm(true)
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete your review? This cannot be undone.')) return
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMyReviewIds(prev => { const s = new Set(prev); s.delete(id); return s })
      if (editingReviewId === id) { setEditingReviewId(null); setShowReviewForm(false); setMyRating(0); setMyReview('') }
      router.refresh()
    }
  }

  const ratingBreakdown = [5,4,3,2,1].map(stars => ({
    stars,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === stars).length / reviews.length * 100) : 0,
    count: reviews.filter(r => r.rating === stars).length,
  }))

  return (
    <>
      <section id="reviews" className="mt-16 animate-fade-in-up" aria-labelledby="reviews-heading">
        <div className="flex items-center justify-between mb-5">
          <h2 id="reviews-heading" className="font-heading font-bold text-slate-900 text-2xl flex items-center gap-2">
            <Star size={20} className="text-gold-bright fill-gold-bright" /> Customer Reviews
          </h2>
          <button onClick={() => setShowReviewForm(s=>!s)} aria-expanded={showReviewForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors">
            + Write Review
          </button>
        </div>

        {showReviewForm && (
          <div className="glass-panel p-5 space-y-3 mb-5 animate-fade-in-up">
            <p className="text-xs text-slate-500">Only verified customers can submit reviews.</p>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Your rating">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setMyRating(i)} aria-label={`${i} star${i>1?'s':''}`} className="cursor-pointer">
                  <Star size={22} className={i<=myRating?'fill-gold-bright text-gold-bright':'text-slate-200 hover:text-amber-300'} />
                </button>
              ))}
            </div>
            <textarea value={myReview} onChange={e=>setMyReview(e.target.value)} placeholder="Share your experience…" rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none text-slate-800"
              style={{ background:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.80)' }} />
            {reviewMsg && (
              <p className={`text-xs font-semibold ${reviewMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{reviewMsg.text}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={()=>{ setShowReviewForm(false); setEditingReviewId(null) }} className="px-4 py-2 text-sm text-slate-500 cursor-pointer">Cancel</button>
              <button onClick={submitReview} disabled={reviewSaving || myRating === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
                {reviewSaving ? <><Loader2 size={13} className="animate-spin" /> {editingReviewId ? 'Saving…' : 'Submitting…'}</> : (editingReviewId ? 'Update Review' : 'Submit Review')}
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="glass-panel px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--clr-primary) 6%, transparent) 0%, rgba(6,182,212,0.04) 100%)' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={18} className="text-slate-200" />)}
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">No reviews yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Be the first to review this product</p>
              </div>
            </div>
            <button onClick={() => setShowReviewForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/20 shrink-0">
              <Star size={13} className="fill-white" /> Write a Review
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 glass-panel p-5 h-fit">
              <div className="flex items-center gap-4">
                <span className="font-heading font-extrabold text-5xl text-slate-900">{rating.toFixed(1)}</span>
                <div>
                  <div className="flex items-center gap-0.5 mb-1">
                    {[1,2,3,4,5].map(i=><Star key={i} size={16} className={i<=Math.round(rating)?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
                  </div>
                  <p className="text-xs text-slate-500">Based on {reviews.length} reviews</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {ratingBreakdown.map(({stars,pct,count})=>(
                  <button key={stars} onClick={() => setReviewFilter(stars as ReviewFilter)}
                    className={`flex items-center gap-2 w-full cursor-pointer p-1 rounded-lg transition-colors ${reviewFilter === stars ? 'bg-primary-bg' : 'hover:bg-white/40'}`} title={`${count} reviews`}>
                    <span className="text-xs text-slate-600 w-3">{stars}</span>
                    <Star size={11} className="text-gold-bright fill-gold-bright shrink-0" aria-hidden="true" />
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.06)' }}>
                      <div className="h-full bg-gradient-to-r from-amber-400 to-gold-bright rounded-full" style={{ width:`${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-7 text-right">{pct}%</span>
                  </button>
                ))}
              </div>
              {reviewFilter !== 0 && (
                <button onClick={() => setReviewFilter(0)} className="mt-3 text-xs font-semibold text-primary hover:text-primary-dark cursor-pointer">Clear filter</button>
              )}
              <button onClick={() => setShowReviewForm(true)} className="mt-4 w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
                Write a Review
              </button>
            </div>

            <div className="md:col-span-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
                {([0,5,4,3,2,1] as ReviewFilter[]).map(n => (
                  <button key={n} onClick={() => setReviewFilter(n)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${reviewFilter === n ? 'bg-primary text-white' : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-white/70'}`}>
                    {n === 0 ? 'All' : `${n}★`}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort:</span>
                  <select value={reviewSort} onChange={e => setReviewSort(e.target.value as ReviewSort)}
                    className="text-xs font-semibold bg-white/60 border border-white/70 rounded-lg px-2 py-1.5 cursor-pointer text-slate-700 outline-none">
                    <option value="recent">Most Recent</option>
                    <option value="helpful">Most Helpful</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
              </div>

              {(reviewsExpanded ? filteredReviews : filteredReviews.slice(0, 4)).map(r => (
                <article key={r.id} className="glass-panel p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-0.5 mb-1">
                        {[1,2,3,4,5].map(i=><Star key={i} size={13} className={i<=r.rating?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          {r.user.avatar ? (
                            <Image src={r.user.avatar} alt={r.user.name??'User'} width={28} height={28} className="rounded-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-extrabold text-primary">{(r.user.name??'A')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{r.user.name ?? 'Anonymous'}</span>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full">
                          <BadgeCheck size={9} /> Verified
                        </span>
                      </div>
                    </div>
                    <time className="text-xs text-slate-400 shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('en-NP',{year:'numeric',month:'short',day:'numeric'})}
                    </time>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mt-3">{r.comment ?? 'No comment provided.'}</p>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <button onClick={() => { const s=new Set(helpful); s.has(r.id)?s.delete(r.id):s.add(r.id); setHelpful(s) }}
                      className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${helpful.has(r.id)?'text-primary':'text-slate-400 hover:text-slate-600'}`}>
                      <ThumbsUp size={12} /> {helpful.has(r.id)?'Helpful':'Mark helpful'}
                    </button>
                    {myReviewIds.has(r.id) && (
                      <>
                        <button onClick={() => startEditReview(r)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => deleteReview(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
                          <Trash2 size={11} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}

              {filteredReviews.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No reviews match this filter</div>
              )}

              {filteredReviews.length > 4 && (
                <button onClick={() => reviewsExpanded ? setShowReviewModal(true) : setReviewsExpanded(true)}
                  className="self-center text-sm font-bold text-primary hover:text-primary-dark cursor-pointer inline-flex items-center gap-1.5">
                  {reviewsExpanded ? `View all ${filteredReviews.length} in modal` : `Show ${filteredReviews.length - 4} more`} <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Reviews modal ───────────────────────────────────────────────── */}
      {showReviewModal && (
        <>
          <div className="fixed inset-0 z-50 animate-fade-in" style={{ background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)' }}
            onClick={() => setShowReviewModal(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="review-modal-title"
            className="fixed inset-x-4 top-16 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 flex flex-col rounded-3xl overflow-hidden animate-fade-in-up"
            style={{ background:'rgba(255,255,255,0.90)', backdropFilter:'blur(28px) saturate(200%)', border:'1px solid rgba(255,255,255,0.90)', boxShadow:'0 32px 80px rgba(0,0,0,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <h3 id="review-modal-title" className="font-heading font-bold text-slate-900 text-lg">All Reviews ({filteredReviews.length})</h3>
              <button onClick={() => setShowReviewModal(false)} aria-label="Close"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {filteredReviews.map(r => (
                <article key={r.id} className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.70)', border:'1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-extrabold text-primary">{(r.user.name??'A')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm">{r.user.name ?? 'Anonymous'}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1,2,3,4,5].map(i=><Star key={i} size={11} className={i<=r.rating?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
                        </div>
                      </div>
                    </div>
                    <time className="text-xs text-slate-400 shrink-0">{new Date(r.createdAt).toLocaleDateString('en-NP',{year:'numeric',month:'short',day:'numeric'})}</time>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{r.comment ?? 'No comment provided.'}</p>
                </article>
              ))}
            </div>
            <div className="px-6 py-4 border-t" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <button onClick={() => { setShowReviewModal(false); setShowReviewForm(true) }}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl cursor-pointer transition-colors shadow-lg shadow-primary/20">
                + Write a Review
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

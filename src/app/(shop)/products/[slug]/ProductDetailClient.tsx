'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ShoppingCart, Star, Shield, Truck, RotateCcw, Minus, Plus, Zap,
  CheckCircle, ChevronRight, Package, BadgeCheck, ThumbsUp, ShoppingBag,
  Award, Link2, MessageCircle, Copy, X, Play, PlayCircle, Loader2,
  GitCompareArrows, Eye,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useRegisterProduct } from '@/context/ProductContext'
import { formatPrice, discountPercent } from '@/lib/utils'
import type { ClientProduct, ClientReview, ClientSlimProduct } from './types'

// ── Color hex map ───────────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  black: '#1c1c1e', white: '#f5f5f0', red: '#ef4444', blue: '#3b82f6',
  green: '#16a34a', yellow: '#eab308', purple: '#8b5cf6', pink: '#ec4899',
  orange: '#f97316', gray: '#6b7280', grey: '#6b7280', silver: '#c0c0c0',
  gold: '#f59e0b', brown: '#92400e', navy: '#1e3a5f', cyan: '#06b6d4',
  rose: '#f43f5e', teal: '#0d9488', indigo: '#6366f1', violet: '#7c3aed',
  midnight: '#1c1c1e', starlight: '#f5f5f0', beige: '#f5f0e8',
}
function colorHex(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '')
  if (COLOR_HEX[key]) return COLOR_HEX[key]
  const first = name.toLowerCase().split(/\s+/)[0]
  if (COLOR_HEX[first]) return COLOR_HEX[first]
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360},50%,45%)`
}

function ytId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/)
  return m?.[1] ?? null
}

// ── Blob background ─────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}
function hsl(h: number, s: number, l: number) { return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)` }
function extractDominantColor(src: string): Promise<[number, number, number]> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    try {
      const isCrossOrigin = new URL(src, window.location.href).origin !== window.location.origin
      if (isCrossOrigin) img.crossOrigin = 'anonymous'
    } catch { /* same origin */ }
    img.onload = () => {
      try {
        const SIZE = 80
        const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE
        const ctx = c.getContext('2d'); if (!ctx) return reject()
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const d = ctx.getImageData(0, 0, SIZE, SIZE).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 128) continue
          const [rv, gv, bv] = [d[i], d[i+1], d[i+2]]
          const br  = (rv + gv + bv) / 3
          const sat = Math.max(rv, gv, bv) - Math.min(rv, gv, bv)
          if (br > 8 && br < 248 && sat > 15) { r += rv; g += gv; b += bv; n++ }
        }
        if (n === 0) {
          for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] < 128) continue
            const br = (d[i] + d[i+1] + d[i+2]) / 3
            if (br > 5 && br < 250) { r += d[i]; g += d[i+1]; b += d[i+2]; n++ }
          }
        }
        if (n === 0) return reject()
        resolve([Math.round(r/n), Math.round(g/n), Math.round(b/n)])
      } catch { reject() }
    }
    img.onerror = reject
    img.src = src
  })
}

// ── Recently viewed (localStorage) ────────────────────────────────────────────
const RV_KEY = 'balapasa_recently_viewed'
function readRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RV_KEY) ?? '[]') as string[] } catch { return [] }
}
function writeRecentlyViewed(slugs: string[]) {
  try { localStorage.setItem(RV_KEY, JSON.stringify(slugs.slice(0, 12))) } catch { /* quota */ }
}

function estimatedDeliveryRange(): string {
  const base = new Date()
  const min = new Date(base); min.setDate(min.getDate() + 2)
  const max = new Date(base); max.setDate(max.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('en-NP', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${fmt(min)} – ${fmt(max)}`
}

interface Props {
  initialProduct: ClientProduct | null
  similar: ClientSlimProduct[]
  shopsChoice: ClientSlimProduct[]
  boughtTogether: ClientSlimProduct[]
  reviews: ClientReview[]
}

type ReviewSort = 'recent' | 'helpful' | 'highest' | 'lowest'
type ReviewFilter = 0 | 1 | 2 | 3 | 4 | 5

export default function ProductDetailClient({ initialProduct, similar, shopsChoice, boughtTogether, reviews }: Props) {
  const { addItem, setBuyNow } = useCart()
  const router = useRouter()
  const p = initialProduct

  useRegisterProduct(p?.name ?? null, p ? (p.salePrice ?? p.price) : null, p?.slug ?? null)

  // ── Active image ────────────────────────────────────────────────────────
  const images = p?.images.length ? p.images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&h=700&fit=crop']
  const [activeImg,  setActiveImg]  = useState(0)
  const [imgVisible, setImgVisible] = useState(true)
  const [mediaMode,  setMediaMode]  = useState<'image' | 'video'>('image')
  const [activeVideo,setActiveVideo]= useState<string | null>(null)
  function switchImg(idx: number) {
    if (idx === activeImg) return
    setImgVisible(false)
    setTimeout(() => { setActiveImg(idx); setImgVisible(true) }, 220)
  }

  // ── Blob background ─────────────────────────────────────────────────────
  const [blobs, setBlobs] = useState<[string,string,string]>(['hsl(159,25%,82%)','hsl(199,20%,85%)','hsl(239,22%,80%)'])
  const applyBlob = useCallback((src: string) => {
    extractDominantColor(src)
      .then(([r,g,b]) => {
        const [h,s] = rgbToHsl(r,g,b)
        const sat = Math.min(45, Math.max(20, s * 0.5))
        setBlobs([hsl(h, sat, 80), hsl((h + 20) % 360, sat - 5, 83), hsl((h - 20 + 360) % 360, sat - 5, 78)])
      })
      .catch(() => {})
  }, [])
  useEffect(() => { applyBlob(images[activeImg]) }, [activeImg, applyBlob, images])

  // ── Sticky bar ──────────────────────────────────────────────────────────
  // Visible whenever the main Add-to-Cart button is NOT in the viewport —
  // whether it's still below the fold (initial page load on mobile) or
  // already scrolled past. Hides only when the main button is in view.
  const [showSticky, setShowSticky] = useState(false)
  const addToCartRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = addToCartRef.current
    if (!el) return
    function check() {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const inView = rect.bottom > 0 && rect.top < vh
      setShowSticky(!inView)
    }
    check()
    const observer = new IntersectionObserver(check, {
      threshold: [0, 0.01, 0.5, 1],
      rootMargin: '0px',
    })
    observer.observe(el)
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  // ── Variants ───────────────────────────────────────────────────────────
  const options = p?.options ?? []
  const variants = p?.variants ?? []
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {}
    options.forEach(o => { d[o.name] = o.values[0] ?? '' })
    return d
  })
  const activeVariant = variants.find(v =>
    options.every(o => !selected[o.name] || (v.options as Record<string,string>)[o.name] === selected[o.name])
  ) ?? null
  function selectOption(optName: string, value: string) {
    setSelected(prev => {
      const next = { ...prev, [optName]: value }
      if (/^colou?r$/i.test(optName)) {
        const v = variants.find(vr => (vr.options as Record<string,string>)[optName] === value)
        if (v?.image) {
          const idx = images.indexOf(v.image)
          if (idx !== -1) switchImg(idx)
        }
      }
      return next
    })
  }

  const saleActive = p?.salePrice != null && (!p.salePriceExpiresAt || new Date(p.salePriceExpiresAt) > new Date())
  const effectivePrice = activeVariant?.price ?? (saleActive ? p?.salePrice : null) ?? p?.price ?? 0
  const originalPrice  = p?.price ?? 0
  const totalVariantStock = variants.reduce((s, v) => s + (v.stock ?? 0), 0)
  const useVariantStock   = variants.length > 0 && totalVariantStock > 0
  const variantStock      = useVariantStock ? (activeVariant?.stock ?? 0) : (p?.stock ?? 0)
  const discount       = originalPrice > effectivePrice ? discountPercent(originalPrice, effectivePrice) : 0

  // ── Cart ────────────────────────────────────────────────────────────────
  const [qty,   setQty]   = useState(1)
  const [added, setAdded] = useState(false)
  const [wished,setWished]= useState(false)
  function handleAdd() {
    if (!p) return
    addItem({ id: p.id, name: p.name, price: originalPrice, salePrice: effectivePrice, image: images[0], slug: p.slug, codAvailable: true }, qty)
    setAdded(true); setTimeout(() => setAdded(false), 2000)
  }

  // ── Video ───────────────────────────────────────────────────────────────
  const videoYtId = p?.videoUrl ? ytId(p.videoUrl) : null
  const [playingVideo, setPlayingVideo] = useState(false)

  // ── View tracking + recently viewed ─────────────────────────────────────
  useEffect(() => {
    if (!p?.id) return
    const key = `viewed_${p.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/products/${p.id}/view`, { method: 'POST' }).catch(() => {})
  }, [p?.id])
  useEffect(() => {
    if (!p?.slug) return
    const prev = readRecentlyViewed().filter(s => s !== p.slug)
    writeRecentlyViewed([p.slug, ...prev])
  }, [p?.slug])

  // ── Tabs ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description')
  const specs: Array<[string, string]> = useMemo(() => {
    if (!p) return []
    const rows: Array<[string, string]> = []
    if (p.brand) rows.push(['Brand', p.brand])
    if (p.sku) rows.push(['SKU', p.sku])
    rows.push(['Category', p.category.name])
    if (p.weight) rows.push(['Weight', `${p.weight} kg`])
    if (p.tags.length) rows.push(['Tags', p.tags.join(', ')])
    if (options.length) options.forEach(o => { rows.push([o.name, o.values.join(', ')]) })
    rows.push(['Availability', variantStock > 0 ? `${variantStock} in stock` : 'Out of stock'])
    rows.push(['Tax', p.isTaxable ? 'Inclusive of VAT' : 'Tax-free'])
    return rows
  }, [p, options, variantStock])

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
  async function submitReview() {
    if (!p || myRating === 0) return
    setReviewSaving(true); setReviewMsg(null)
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: p.id, rating: myRating, comment: myReview }),
    })
    const data = await res.json()
    if (res.ok) {
      setReviewMsg({ text: 'Review submitted! Thank you.', ok: true })
      setMyRating(0); setMyReview(''); setShowReviewForm(false)
    } else {
      setReviewMsg({ text: data.error ?? 'Failed to submit review', ok: false })
    }
    setReviewSaving(false)
  }

  const ratingBreakdown = [5,4,3,2,1].map(stars => ({
    stars,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === stars).length / reviews.length * 100) : 0,
    count: reviews.filter(r => r.rating === stars).length,
  }))

  // ── Live viewers ────────────────────────────────────────────────────────
  const sessionId = useRef(Math.random().toString(36).slice(2))
  const [viewers, setViewers] = useState<number | null>(null)
  useEffect(() => {
    if (!p?.slug) return
    const slug = p.slug
    const sid  = sessionId.current
    async function heartbeat() {
      try {
        const res = await fetch(`/api/viewers/${slug}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        })
        const data = await res.json()
        setViewers(data.count ?? null)
      } catch { /* ignore */ }
    }
    heartbeat()
    const interval = setInterval(heartbeat, 30_000)
    return () => {
      clearInterval(interval)
      fetch(`/api/viewers/${slug}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }), keepalive: true,
      }).catch(() => {})
    }
  }, [p?.slug])

  // ── Bundle / FBT ────────────────────────────────────────────────────────
  const [btSelected, setBtSelected] = useState<Set<string>>(new Set(boughtTogether.map(b => b.id)))
  const btSelectedItems = boughtTogether.filter(b => btSelected.has(b.id))
  const btSubtotal = btSelectedItems.reduce((s, b) => s + (b.salePrice ?? b.price), 0) + effectivePrice
  const btOriginal = btSelectedItems.reduce((s, b) => s + b.price, 0) + originalPrice
  const btSavings = Math.max(0, btOriginal - btSubtotal)

  // ── Compare ─────────────────────────────────────────────────────────────
  const [compareList, setCompareList] = useState<ClientSlimProduct[]>([])
  const [showCompare, setShowCompare] = useState(false)
  function toggleCompare(item: ClientSlimProduct) {
    setCompareList(prev => {
      if (prev.find(c => c.id === item.id)) return prev.filter(c => c.id !== item.id)
      if (prev.length >= 3) return prev
      return [...prev, item]
    })
  }
  const compareSelf = p ? { id: p.id, name: p.name, slug: p.slug, price: p.price, salePrice: p.salePrice, images: p.images, rating: p.rating, reviewCount: p.reviewCount, brand: p.brand } as ClientSlimProduct : null

  // ── Recently viewed lookup ──────────────────────────────────────────────
  const [recentlyViewed, setRecentlyViewed] = useState<ClientSlimProduct[]>([])
  useEffect(() => {
    if (!p?.slug) return
    const slugs = readRecentlyViewed().filter(s => s !== p.slug).slice(0, 6)
    if (slugs.length === 0) { setRecentlyViewed([]); return }
    fetch(`/api/products?slugs=${slugs.join(',')}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data?.products)) {
          const order = new Map(slugs.map((s, i) => [s, i]))
          const sorted = [...data.products].sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99))
          setRecentlyViewed(sorted as ClientSlimProduct[])
        }
      })
      .catch(() => {})
  }, [p?.slug])

  if (!p) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-700 mb-2">Product not found</p>
        <Link href="/products" className="text-primary underline">Browse all products</Link>
      </div>
    </div>
  )

  const deliveryWindow = estimatedDeliveryRange()
  const allMedia: { src: string; isVideo?: boolean }[] = videoYtId
    ? [...images.map(src => ({ src })), { src: `https://img.youtube.com/vi/${videoYtId}/mqdefault.jpg`, isVideo: true }]
    : images.map(src => ({ src }))

  return (
    <div className="min-h-screen relative"
      style={{ background: 'linear-gradient(135deg,#EEF2FF 0%,#FAF5FF 40%,#FFF0F9 70%,#F0FDF4 100%)' }}>

      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex:0 }}>
        {[
          { b:blobs[0], w:540, op:0.18, delay:'0s',   cls:'animate-blob-float-a', pos:'-top-24 -left-24' },
          { b:blobs[1], w:420, op:0.14, delay:'2s',   cls:'animate-blob-float-b', pos:'top-1/3 -right-20' },
          { b:blobs[2], w:460, op:0.13, delay:'1s',   cls:'animate-blob-float-c', pos:'bottom-0 left-1/3' },
          { b:blobs[1], w:300, op:0.10, delay:'3.5s', cls:'animate-blob-float-a', pos:'top-1/2 left-1/2' },
        ].map(({ b,w,op,delay,cls,pos },i) => (
          <div key={i} className={`blob absolute animate-blob-morph ${cls} ${pos}`}
            style={{ background:b, opacity:op, transition:'background 1.2s ease', animationDelay:delay, width:w, height:w }} />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 animate-fade-in">
          {[['/', 'Home'], ['/products','Products'], [`/products?category=${p.category.slug}`, p.category.name]].map(([href,label]) => (
            <span key={href} className="flex items-center gap-1.5">
              <Link href={href} className="hover:text-primary transition-colors capitalize">{label}</Link>
              <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
            </span>
          ))}
          <span className="text-slate-700 font-semibold truncate max-w-[200px]" aria-current="page">{p.name}</span>
        </nav>

        {/* ── Hero — sticky-left gallery / scrolling-right info ───────────────────── */}
        <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in-up">

          {/* LEFT — Gallery (sticky on lg). All images visible at once: vertical thumbnail strip + main image. */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 self-start">
            <div className="flex flex-col-reverse lg:flex-row gap-3">

              {/* Vertical thumbnail strip (desktop) / horizontal (mobile) */}
              <div className="lg:w-20 shrink-0 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-7rem)] pb-1 lg:pb-0" style={{ scrollbarWidth: 'none' }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => { switchImg(i); setMediaMode('image'); setActiveVideo(null) }}
                    aria-label={`View image ${i+1}`}
                    className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${mediaMode==='image' && activeImg===i ? 'ring-2 ring-primary ring-offset-2 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'}`}>
                    <Image src={img} alt={`${p.name} view ${i+1}`} fill className="object-cover" sizes="80px" />
                  </button>
                ))}
                {videoYtId && (
                  <button onClick={() => { setMediaMode('video'); setActiveVideo(videoYtId) }}
                    aria-label="Play product video"
                    className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${mediaMode==='video' ? 'ring-2 ring-accent ring-offset-2 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'}`}>
                    <Image src={`https://img.youtube.com/vi/${videoYtId}/mqdefault.jpg`} alt="Product video" fill className="object-cover" sizes="80px" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play size={18} className="text-white fill-white ml-0.5" />
                    </div>
                  </button>
                )}
              </div>

              {/* Main image (flex-1, square, glass framed) */}
              <div className="flex-1 relative overflow-hidden"
                style={{ borderRadius:'2rem', background:'rgba(255,255,255,0.50)', backdropFilter:'blur(24px) saturate(200%)', border:'1px solid rgba(255,255,255,0.78)', boxShadow:'0 24px 64px rgba(0,0,0,0.10)' }}>
                <div className="relative aspect-square">
                  {mediaMode === 'video' && activeVideo ? (
                    <>
                      <iframe src={`https://www.youtube-nocookie.com/embed/${activeVideo}?autoplay=1&rel=0`}
                        className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen title="Product video" />
                      <button onClick={() => { setMediaMode('image'); setActiveVideo(null) }}
                        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                        style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)' }}>
                        <X size={12} /> Back to photos
                      </button>
                    </>
                  ) : (
                    <Image src={images[activeImg]} alt={`${p.name} — image ${activeImg+1}`} fill
                      className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" priority
                      style={{ opacity: imgVisible ? 1 : 0, transition: 'opacity 0.22s ease' }} />
                  )}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {discount > 0 && <span className="px-3 py-1 text-white text-sm font-extrabold rounded-xl shadow-lg bg-accent">-{discount}% OFF</span>}
                    {p.isNew && <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-primary text-white text-sm font-extrabold rounded-xl shadow-lg">New</span>}
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button onClick={() => setWished(w => !w)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all cursor-pointer ${wished?'bg-red-500 text-white':'text-slate-400 hover:text-red-500'}`}
                      style={!wished ? { background:'rgba(255,255,255,0.52)', backdropFilter:'blur(12px)' } : {}}>
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 ${wished?'fill-white':'fill-none stroke-current'}`} strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button aria-label="Share product" onClick={() => navigator.clipboard?.writeText(window.location.href)}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                      style={{ background:'rgba(255,255,255,0.52)', backdropFilter:'blur(12px)' }}>
                      <Link2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
            <p className="hidden lg:block text-[10px] text-slate-400 mt-3 text-center">{activeImg + 1} / {allMedia.length} · click to switch</p>
          </div>

          {/* RIGHT — Info (scrolls naturally; usually taller than gallery → left stays sticky) */}
          <div className="lg:col-span-5 space-y-4">

            {/* Name + rating */}
            <div className="glass-panel p-5">
              {p.brand && <p className="text-xs font-extrabold uppercase tracking-widest mb-2 text-primary">{p.brand}</p>}
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">{p.name}</h1>
              {p.sku && <p className="text-[10px] text-slate-400 mt-1">SKU: {p.sku}</p>}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-0.5" aria-label={`Rating: ${p.rating} out of 5`}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={15} className={i<=Math.round(p.rating)?'fill-amber-400 text-amber-400':'text-slate-200'} aria-hidden="true" />)}
                </div>
                <span className="font-bold text-slate-800 text-sm">{p.rating.toFixed(1)}</span>
                <a href="#reviews" className="text-sm text-slate-400 hover:text-primary transition-colors">{p.reviewCount} reviews</a>
                {viewers !== null && viewers > 1 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> {viewers} viewing
                  </span>
                )}
              </div>
              <div className="mt-3">
                {variantStock > 0 && variantStock <= 20 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-accent">Only {variantStock} left!</span>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.08)' }}>
                      <div className="h-full bg-gradient-to-r from-accent to-red-400 rounded-full" style={{ width:`${Math.round((variantStock/30)*100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className={`text-sm font-semibold ${variantStock>0?'text-green-600':'text-red-500'}`}>
                    {variantStock > 0 ? 'In stock' : 'Out of stock'}
                  </span>
                )}
              </div>
            </div>

            {/* Price + delivery + CTAs */}
            <div className="glass-panel p-5 flex flex-col gap-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900">{formatPrice(effectivePrice)}</span>
                {originalPrice > effectivePrice && (
                  <span className="text-xl text-slate-400 line-through font-medium">{formatPrice(originalPrice)}</span>
                )}
                {discount > 0 && (
                  <span className="px-2.5 py-1 text-sm font-bold rounded-xl text-white bg-primary">Save {formatPrice(originalPrice - effectivePrice)}</span>
                )}
              </div>
              {p.isTaxable && (
                <p className="text-xs text-slate-400 -mt-2">
                  Incl. 13% VAT <span className="ml-1">({formatPrice(Math.round(effectivePrice - effectivePrice/1.13))})</span>
                </p>
              )}

              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                <Truck size={16} className="text-blue-600 shrink-0" />
                <p className="text-xs text-slate-700">
                  <span className="font-bold">Estimated delivery:</span>{' '}
                  <span className="text-blue-700 font-semibold">{deliveryWindow}</span>
                </p>
              </div>

              {/* Options */}
              {options.length > 0 && (
                <div className="space-y-3">
                  {options.map(opt => {
                    const isColor = /^colou?r$/i.test(opt.name)
                    return (
                      <div key={opt.id}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          {opt.name}{selected[opt.name] ? <span className="text-primary font-semibold normal-case ml-1">— {selected[opt.name]}</span> : ''}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={opt.name}>
                          {opt.values.map(val => isColor ? (
                            <button key={val} onClick={() => selectOption(opt.name, val)}
                              role="radio" aria-checked={selected[opt.name]===val} aria-label={val}
                              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer ${selected[opt.name]===val?'border-primary scale-110 shadow-md':'border-transparent hover:scale-105'}`}
                              style={{ background: colorHex(val) }} title={val}>
                              {selected[opt.name]===val && <span className="block w-full h-full rounded-full border-2 border-white" />}
                            </button>
                          ) : (
                            <button key={val} onClick={() => selectOption(opt.name, val)}
                              role="radio" aria-checked={selected[opt.name]===val}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${selected[opt.name]===val?'bg-primary text-white shadow-md shadow-primary/25':'text-slate-600 hover:bg-white/70'}`}
                              style={selected[opt.name]===val?{}:{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.75)' }}>
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {activeVariant?.sku && <p className="text-[10px] text-slate-400">Variant SKU: {activeVariant.sku}</p>}
                </div>
              )}

              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-700">Quantity</span>
                <div className="flex items-center gap-2 rounded-2xl p-1" style={{ background:'rgba(255,255,255,0.40)' }}>
                  <button onClick={() => setQty(q => Math.max(1,q-1))} aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer" style={{ background:'rgba(255,255,255,0.50)' }}>
                    <Minus size={15} className="text-slate-600" />
                  </button>
                  <span className="w-10 text-center font-bold text-lg tabular-nums text-slate-900" aria-live="polite">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(variantStock,q+1))} aria-label="Increase quantity"
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer" style={{ background:'rgba(255,255,255,0.50)' }}>
                    <Plus size={15} className="text-slate-600" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button ref={addToCartRef} onClick={handleAdd} disabled={variantStock===0}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base cursor-pointer shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
                    variantStock === 0
                      ? 'bg-slate-200 text-slate-400'
                      : added
                        ? 'bg-primary-dark text-white'
                        : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                  style={{ boxShadow: variantStock > 0 ? '0 8px 24px color-mix(in srgb, var(--clr-primary) 30%, transparent)' : 'none' }}>
                  {added ? <><CheckCircle size={19} /> Added!</> : <><ShoppingCart size={19} /> Add to Cart</>}
                </button>
                <button
                  onClick={() => { setBuyNow({ id:p.id, name:p.name, price:originalPrice, salePrice:effectivePrice, image:images[0], slug:p.slug, codAvailable:true }, qty); router.push('/checkout') }}
                  disabled={variantStock===0}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-slate-800 hover:bg-white/80 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                  style={{ background:'rgba(255,255,255,0.42)', border:'1px solid rgba(255,255,255,0.72)', backdropFilter:'blur(8px)' }}>
                  <Zap size={17} className="text-gold-bright" /> Buy Now
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                </div>
                <p className="text-xs font-bold text-green-700">COD Available — Pay when delivered</p>
              </div>
            </div>

            {/* Guarantees + share */}
            <div className="glass-panel p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[{icon:Shield,label:'Warranty',sub:'6 months'},{icon:Truck,label:'Fast Delivery',sub:'2-4 days'},{icon:RotateCcw,label:'Returns',sub:'7 days'}].map(({icon:Icon,label,sub}) => (
                  <div key={label} className="flex flex-col items-center text-center p-3 rounded-2xl"
                    style={{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.72)' }}>
                    <div className="w-8 h-8 rounded-xl mb-1.5 flex items-center justify-center bg-primary-bg">
                      <Icon size={15} className="text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{sub}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-white/30">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Share</p>
                <div className="flex items-center gap-2">
                  {[
                    { icon: Link2,         label: 'Copy link', action: () => navigator.clipboard?.writeText(window.location.href) },
                    { icon: MessageCircle, label: 'WhatsApp',  action: () => window.open(`https://wa.me/?text=${encodeURIComponent(p.name+' '+window.location.href)}`) },
                    { icon: Copy,          label: 'Copy name', action: () => navigator.clipboard?.writeText(p.name) },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} aria-label={label}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:scale-110 transition-all cursor-pointer"
                      style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.78)' }}>
                      <Icon size={15} aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 ml-auto">{p.reviewCount} love this</p>
              </div>
            </div>

            {/* Description / Specs tabs */}
            <div className="glass-panel p-5">
              <div className="flex gap-6 border-b border-white/40 mb-4">
                <button onClick={() => setActiveTab('description')}
                  className={`pb-3 font-heading font-bold text-sm cursor-pointer transition-colors ${activeTab==='description'?'text-primary border-b-2 border-primary -mb-px':'text-slate-500 hover:text-slate-700'}`}>
                  Description
                </button>
                <button onClick={() => setActiveTab('specs')}
                  className={`pb-3 font-heading font-bold text-sm cursor-pointer transition-colors ${activeTab==='specs'?'text-primary border-b-2 border-primary -mb-px':'text-slate-500 hover:text-slate-700'}`}>
                  Specifications
                </button>
              </div>
              {activeTab === 'description' ? (
                <div>
                  <div className="text-slate-600 text-sm leading-relaxed rte-render"
                    dangerouslySetInnerHTML={{ __html: p.description }} />
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/30">
                      {p.tags.map(t => <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-primary-bg text-primary">#{t}</span>)}
                    </div>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([k, v]) => (
                      <tr key={k} className="border-b border-white/30 last:border-b-0">
                        <th className="text-left py-2 pr-4 font-semibold text-slate-700 align-top whitespace-nowrap">{k}</th>
                        <td className="py-2 text-slate-600">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Frequently Bought Together */}
            {boughtTogether.length > 0 && (
              <div className="glass-panel p-5" aria-labelledby="fbt-heading">
                <h3 id="fbt-heading" className="font-heading font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                  <ShoppingBag size={16} className="text-primary" /> Frequently Bought Together
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary-bg/60 border border-primary/15">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                      <Image src={images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">{p.name}</p>
                      <p className="text-primary font-bold text-sm">{formatPrice(effectivePrice)}</p>
                    </div>
                    <CheckCircle size={18} className="text-primary shrink-0" />
                  </div>
                  {boughtTogether.map(item => (
                    <label key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${btSelected.has(item.id) ? 'bg-white/70 border border-primary/30' : 'bg-white/40 border border-white/50 hover:bg-white/60'}`}>
                      <input type="checkbox" checked={btSelected.has(item.id)}
                        onChange={() => { const s = new Set(btSelected); s.has(item.id)?s.delete(item.id):s.add(item.id); setBtSelected(s) }}
                        className="accent-primary w-4 h-4 shrink-0" aria-label={`Include ${item.name}`} />
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                        <Image src={item.images[0] ?? ''} alt={item.name} fill className="object-cover" sizes="56px" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <Link href={`/products/${item.slug}`} className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-primary">{item.name}</Link>
                        <div className="flex items-center gap-1.5">
                          <p className="text-primary font-bold text-sm">{formatPrice(item.salePrice ?? item.price)}</p>
                          {item.salePrice && <p className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</p>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/40">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-slate-500">Bundle total</span>
                    <span className="font-heading font-extrabold text-lg text-slate-900">{formatPrice(btSubtotal)}</span>
                  </div>
                  {btSavings > 0 && (
                    <p className="text-xs font-bold text-green-600 mb-3">You save {formatPrice(btSavings)}</p>
                  )}
                  <button onClick={() => { btSelectedItems.forEach(b => addItem({ id:b.id, name:b.name, price:b.price, salePrice:b.salePrice, image:b.images[0], slug:b.slug })); handleAdd() }}
                    className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/20">
                    Add {btSelected.size + 1} items to Cart
                  </button>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="glass-panel flex items-center gap-3 px-4 py-3" style={{ borderRadius:'1rem' }}>
              <Package size={15} className="text-slate-400" />
              <span className="text-sm text-slate-500">Category:</span>
              <Link href={`/products?category=${p.category.slug}`} className="text-sm font-bold capitalize text-primary hover:text-primary-dark transition-colors">{p.category.name}</Link>
              <ChevronRight size={13} className="text-slate-300 ml-auto" />
            </div>
          </div>
        </div>

        {/* ── Product video (full width) ──────────────────────────────────── */}
        {videoYtId && (
          <section className="mt-16 animate-fade-in-up" aria-labelledby="video-heading">
            <h2 id="video-heading" className="font-heading font-bold text-slate-900 text-2xl mb-6 flex items-center gap-2">
              <Play size={20} className="text-primary" /> Product Video
            </h2>
            <div className="glass-panel overflow-hidden">
              <div className="relative" style={{ paddingBottom:'56.25%' }}>
                {playingVideo ? (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${videoYtId}?autoplay=1&rel=0`}
                    className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen title={`${p.name} video`} />
                ) : (
                  <>
                    <Image src={`https://img.youtube.com/vi/${videoYtId}/maxresdefault.jpg`} alt={`${p.name} video thumbnail`} fill className="object-cover" sizes="100vw" />
                    <div className="absolute inset-0 bg-black/30" />
                    <button onClick={() => setPlayingVideo(true)} className="absolute inset-0 flex items-center justify-center cursor-pointer group">
                      <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:bg-white">
                        <PlayCircle size={40} className="text-primary fill-primary" />
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Reviews (full width below hero) ──────────────────────────── */}
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
                <button onClick={()=>setShowReviewForm(false)} className="px-4 py-2 text-sm text-slate-500 cursor-pointer">Cancel</button>
                <button onClick={submitReview} disabled={reviewSaving || myRating === 0}
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
                  {reviewSaving ? <><Loader2 size={13} className="animate-spin" /> Submitting…</> : 'Submit Review'}
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
                  <span className="font-heading font-extrabold text-5xl text-slate-900">{p.rating.toFixed(1)}</span>
                  <div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1,2,3,4,5].map(i=><Star key={i} size={16} className={i<=Math.round(p.rating)?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
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
                    <button onClick={() => { const s=new Set(helpful); s.has(r.id)?s.delete(r.id):s.add(r.id); setHelpful(s) }}
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${helpful.has(r.id)?'text-primary':'text-slate-400 hover:text-slate-600'}`}>
                      <ThumbsUp size={12} /> {helpful.has(r.id)?'Helpful':'Mark helpful'}
                    </button>
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

        {/* ── Shop's Choice ──────────────────────────────────────────────── */}
        {shopsChoice.length > 0 && (
          <section className="mt-16 animate-fade-in-up" aria-labelledby="shops-choice-heading">
            <h2 id="shops-choice-heading" className="font-heading font-bold text-slate-900 text-2xl mb-6 flex items-center gap-2">
              <Award size={20} className="text-gold-bright" /> Shop&apos;s Choice
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {shopsChoice.map(item => (
                <Link key={item.id} href={`/products/${item.slug}`}
                  className="glass-panel p-4 flex gap-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                    <Image src={item.images[0]??''} alt={item.name} fill className="object-cover" sizes="96px" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-white text-[10px] font-extrabold rounded-lg"
                      style={{ background:'linear-gradient(135deg,#CA8A04,#EAB308)' }}>Featured</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-slate-900 text-sm leading-snug">{item.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} className="fill-gold-bright text-gold-bright" />
                      <span className="text-xs text-slate-600 font-semibold">{item.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                    </div>
                    <p className="font-extrabold text-primary text-base mt-1">{formatPrice(item.salePrice??item.price)}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 self-center shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Recently Viewed — Hover-reveal Quick Add ────────────────────── */}
        {recentlyViewed.length > 0 && (
          <section className="mt-16 animate-fade-in-up" aria-labelledby="recently-viewed-heading">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
                  <Eye size={11} /> Your trail
                </p>
                <h2 id="recently-viewed-heading" className="font-heading font-bold text-slate-900 text-2xl sm:text-3xl">Recently Viewed</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {recentlyViewed.slice(0, 4).map(item => {
                const inCompare = !!compareList.find(c => c.id === item.id)
                const sale = item.salePrice ?? null
                return (
                  <Link key={item.id} href={`/products/${item.slug}`}
                    className="group block cursor-pointer">
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3"
                      style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.75)' }}>
                      <Image src={item.images[0] ?? ''} alt={item.name} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width:1024px) 50vw, 25vw" />

                      {sale != null && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-accent text-white text-[10px] font-extrabold rounded-lg shadow-md z-10">
                          -{discountPercent(item.price, sale)}%
                        </span>
                      )}

                      <button onClick={(e) => { e.preventDefault(); toggleCompare(item) }}
                        aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
                        className={`absolute top-3 right-3 z-10 p-2 rounded-xl cursor-pointer transition-all backdrop-blur opacity-90 hover:opacity-100 ${inCompare ? 'bg-primary text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}`}>
                        <GitCompareArrows size={13} />
                      </button>

                      <div className="hidden lg:flex absolute inset-0 flex-col items-stretch justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto"
                        style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.25) 55%, transparent 100%)' }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            addItem({ id: item.id, name: item.name, price: item.price, salePrice: item.salePrice, image: item.images[0], slug: item.slug })
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-900 text-xs font-extrabold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-primary hover:text-white transition-colors shadow-lg">
                          <ShoppingCart size={14} /> Quick Add
                        </button>
                        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-white/95">
                          Tap image for details
                        </p>
                      </div>
                    </div>

                    <div className="px-0.5">
                      {item.brand && (
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{item.brand}</p>
                      )}
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 mb-1.5 min-h-[2.6rem] group-hover:text-primary transition-colors">{item.name}</h3>
                      <div className="flex items-center gap-1 mb-1.5">
                        <Star size={11} className="fill-gold-bright text-gold-bright" />
                        <span className="text-[11px] font-semibold text-slate-600">{item.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{formatPrice(item.salePrice ?? item.price)}</span>
                        {item.salePrice && <span className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── You Might Also Like — Hover-reveal Quick Add ─────────────────── */}
        {similar.length > 0 && (
          <section className="mt-16 mb-10 animate-fade-in-up" aria-labelledby="similar-heading">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary mb-1.5">Curated for you</p>
                <h2 id="similar-heading" className="font-heading font-bold text-slate-900 text-2xl sm:text-3xl">You May Also Like</h2>
              </div>
              <Link href={`/products?category=${p.category.slug}`}
                className="text-sm font-semibold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1 shrink-0">
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {similar.slice(0, 4).map(item => {
                const inCompare = !!compareList.find(c => c.id === item.id)
                const sale = item.salePrice ?? null
                return (
                  <Link key={item.id} href={`/products/${item.slug}`}
                    className="group block cursor-pointer">
                    {/* Image — square, with hover overlay (desktop only) */}
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3"
                      style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.75)' }}>
                      <Image src={item.images[0] ?? ''} alt={item.name} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width:1024px) 50vw, 25vw" />

                      {/* Sale badge */}
                      {sale != null && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-accent text-white text-[10px] font-extrabold rounded-lg shadow-md z-10">
                          -{discountPercent(item.price, sale)}%
                        </span>
                      )}

                      {/* Compare toggle — always visible top-right (subtle) */}
                      <button onClick={(e) => { e.preventDefault(); toggleCompare(item) }}
                        aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
                        className={`absolute top-3 right-3 z-10 p-2 rounded-xl cursor-pointer transition-all backdrop-blur opacity-90 hover:opacity-100 ${inCompare ? 'bg-primary text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}`}>
                        <GitCompareArrows size={13} />
                      </button>

                      {/* Hover overlay — desktop only */}
                      <div className="hidden lg:flex absolute inset-0 flex-col items-stretch justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto"
                        style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.25) 55%, transparent 100%)' }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            addItem({ id: item.id, name: item.name, price: item.price, salePrice: item.salePrice, image: item.images[0], slug: item.slug })
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-900 text-xs font-extrabold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-primary hover:text-white transition-colors shadow-lg">
                          <ShoppingCart size={14} /> Quick Add
                        </button>
                        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-white/95">
                          Tap image for details
                        </p>
                      </div>
                    </div>

                    {/* Card body — clean text below image */}
                    <div className="px-0.5">
                      {item.brand && (
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{item.brand}</p>
                      )}
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 mb-1.5 min-h-[2.6rem] group-hover:text-primary transition-colors">{item.name}</h3>
                      <div className="flex items-center gap-1 mb-1.5">
                        <Star size={11} className="fill-gold-bright text-gold-bright" />
                        <span className="text-[11px] font-semibold text-slate-600">{item.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{formatPrice(item.salePrice ?? item.price)}</span>
                        {item.salePrice && <span className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Compare bar ─────────────────────────────────────────────────── */}
      {compareList.length > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up"
          style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(24px) saturate(180%)', border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 16px 48px rgba(0,0,0,0.15)', borderRadius:'1.5rem' }}>
          <div className="flex items-center gap-3 px-5 py-3">
            <GitCompareArrows size={18} className="text-primary shrink-0" />
            <span className="text-sm font-bold text-slate-800">{compareList.length} to compare</span>
            <button onClick={() => setShowCompare(true)} disabled={compareList.length < 1}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl cursor-pointer transition-colors">
              Compare now
            </button>
            <button onClick={() => setCompareList([])} className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">Clear</button>
          </div>
        </div>
      )}

      {/* ── Compare modal ───────────────────────────────────────────────── */}
      {showCompare && compareSelf && (
        <>
          <div className="fixed inset-0 z-50 animate-fade-in" style={{ background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)' }}
            onClick={() => setShowCompare(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="compare-modal-title"
            className="fixed inset-x-4 top-16 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-4xl z-50 flex flex-col rounded-3xl overflow-hidden animate-fade-in-up"
            style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(28px) saturate(200%)', border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 32px 80px rgba(0,0,0,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <h3 id="compare-modal-title" className="font-heading font-bold text-slate-900 text-lg">Compare Products</h3>
              <button onClick={() => setShowCompare(false)} aria-label="Close"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-32">Feature</th>
                      {[compareSelf, ...compareList].map(c => (
                        <th key={c.id} className="text-left py-2 px-3 min-w-[180px]">
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden mb-2">
                            <Image src={c.images[0]??''} alt={c.name} fill className="object-cover" sizes="96px" />
                          </div>
                          <Link href={`/products/${c.slug}`} className="font-heading font-bold text-slate-900 text-sm line-clamp-2 hover:text-primary">{c.name}</Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ['Brand', (c: ClientSlimProduct) => c.brand ?? '—'],
                      ['Price', (c: ClientSlimProduct) => formatPrice(c.salePrice ?? c.price)],
                      ['Original', (c: ClientSlimProduct) => c.salePrice ? formatPrice(c.price) : '—'],
                      ['Rating', (c: ClientSlimProduct) => `${c.rating.toFixed(1)} ★ (${c.reviewCount})`],
                    ] as Array<[string, (c: ClientSlimProduct) => string]>).map(([label, fn]) => (
                      <tr key={label} className="border-t border-slate-100">
                        <th className="text-left py-3 pr-3 font-semibold text-slate-600 text-xs">{label}</th>
                        {[compareSelf, ...compareList].map(c => (
                          <td key={c.id} className="py-3 px-3 text-slate-700">{fn(c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <button onClick={() => { setCompareList([]); setShowCompare(false) }} className="px-4 py-2 text-sm text-slate-500 cursor-pointer">Clear &amp; Close</button>
              <button onClick={() => setShowCompare(false)} className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl cursor-pointer">Done</button>
            </div>
          </div>
        </>
      )}

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

      {/* ── Sticky buy bar ──────────────────────────────────────────────── */}
      {showSticky && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 animate-fade-in-up"
          style={{ background:'rgba(255,255,255,0.88)', backdropFilter:'blur(24px) saturate(180%)', borderTop:'1px solid rgba(255,255,255,0.80)', boxShadow:'0 -4px 24px rgba(0,0,0,0.08)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border:'1px solid rgba(255,255,255,0.80)' }}>
              <Image src={images[activeImg]} alt={p.name} fill className="object-cover" sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
              <span className="text-primary font-extrabold">{formatPrice(effectivePrice)}</span>
            </div>
            <button onClick={handleAdd} disabled={variantStock===0}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl text-sm cursor-pointer transition-colors shadow-lg shadow-primary/20 shrink-0">
              <ShoppingCart size={16} /> {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

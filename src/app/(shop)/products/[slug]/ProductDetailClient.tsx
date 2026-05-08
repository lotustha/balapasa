'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingCart, Star, Shield, Truck, RotateCcw, Minus, Plus, Zap,
  CheckCircle, ChevronRight, Package, BadgeCheck, ThumbsUp, ShoppingBag,
  Award, Link2, MessageCircle, Copy, X, Play, PlayCircle, Loader2,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
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

// ── YouTube ID extractor ────────────────────────────────────────────────────
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
    } catch { /* relative — same origin */ }

    img.onload = () => {
      try {
        const SIZE = 80
        const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE
        const ctx = c.getContext('2d'); if (!ctx) return reject()
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const d = ctx.getImageData(0, 0, SIZE, SIZE).data
        let r = 0, g = 0, b = 0, n = 0

        // Pass 1: prefer colorful pixels (not near-grey/white/black)
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 128) continue // skip transparent
          const [rv, gv, bv] = [d[i], d[i+1], d[i+2]]
          const br  = (rv + gv + bv) / 3
          const sat = Math.max(rv, gv, bv) - Math.min(rv, gv, bv) // colorfulness 0–255
          if (br > 8 && br < 248 && sat > 15) { r += rv; g += gv; b += bv; n++ }
        }

        // Pass 2 fallback — accept all non-transparent, non-pure-white/black pixels
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

interface Props {
  initialProduct: ClientProduct | null
  similar: ClientSlimProduct[]
  shopsChoice: ClientSlimProduct[]
  boughtTogether: ClientSlimProduct[]
  reviews: ClientReview[]
}

export default function ProductDetailClient({ initialProduct, similar, shopsChoice, boughtTogether, reviews }: Props) {
  const { addItem, setBuyNow } = useCart()
  const router = useRouter()
  const p = initialProduct

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
        // Keep saturation low and lightness high → soft pastel tones
        const sat = Math.min(45, Math.max(20, s * 0.5))
        setBlobs([
          hsl(h, sat, 80),
          hsl((h + 20) % 360, sat - 5, 83),
          hsl((h - 20 + 360) % 360, sat - 5, 78),
        ])
      })
      .catch(() => {})
  }, [])
  useEffect(() => { applyBlob(images[activeImg]) }, [activeImg, applyBlob, images])

  // ── Sticky bar ──────────────────────────────────────────────────────────
  const [showSticky, setShowSticky] = useState(false)
  const addToCartRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = addToCartRef.current; if (!el) return
    let scrolled = false
    const obs = new IntersectionObserver(([e]) => { if (scrolled) setShowSticky(!e.isIntersecting) }, { threshold: 0 })
    obs.observe(el)
    window.addEventListener('scroll', () => { scrolled = true }, { passive: true, once: true })
    return () => obs.disconnect()
  }, [])

  // ── Variant / option selection ─────────────────────────────────────────
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

  const colorOption = options.find(o => /^colou?r$/i.test(o.name))

  // When color changes, switch to the variant image if one exists
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

  // Check if sale price is still active (not expired)
  const saleActive = p?.salePrice != null && (
    !p.salePriceExpiresAt || new Date(p.salePriceExpiresAt) > new Date()
  )
  const effectivePrice = activeVariant?.price ?? (saleActive ? p?.salePrice : null) ?? p?.price ?? 0
  const originalPrice  = p?.price ?? 0
  const variantStock   = activeVariant ? activeVariant.stock : (p?.stock ?? 0)
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

  // ── Highlights (dynamic) ────────────────────────────────────────────────
  const highlights = [
    { icon: Star,      label: p ? `${p.rating.toFixed(1)} Rated`   : '—', sub: p ? `${p.reviewCount} reviews`          : '' },
    { icon: Package,   label: variantStock > 0 ? 'In Stock'        : 'Out of Stock', sub: variantStock > 0 ? `${variantStock} units` : 'Notify me' },
    { icon: Shield,    label: p?.brand ? p.brand                    : 'Genuine',     sub: 'Authentic product'                                        },
    { icon: RotateCcw, label: '7-Day Returns',                      sub: 'Hassle-free policy'                                                        },
  ]

  // ── Video ───────────────────────────────────────────────────────────────
  const videoYtId = p?.videoUrl ? ytId(p.videoUrl) : null
  const [playingVideo, setPlayingVideo] = useState(false)

  // ── Reviews ─────────────────────────────────────────────────────────────
  const [helpful, setHelpful] = useState<Set<string>>(new Set())
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

  // Bought-together selection
  // ── View count tracking (once per session per product) ─────────────────
  useEffect(() => {
    if (!p?.id) return
    const key = `viewed_${p.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/products/${p.id}/view`, { method: 'POST' }).catch(() => {})
  }, [p?.id])

  // ── Live viewer count ───────────────────────────────────────────────────
  const mainImgRef = useRef<HTMLDivElement>(null)

  // ── Share card position ─────────────────────────────────────────────────
  // imgStableRef wraps ONLY the image viewer + thumbnails (never the share card)
  // so the measurement never changes when share moves — no circular flicker.
  const imgStableRef = useRef<HTMLDivElement>(null)
  const infoColRef   = useRef<HTMLDivElement>(null)
  const [shareInLeftCol, setShareInLeftCol] = useState(false)
  useEffect(() => {
    const check = () => {
      if (!imgStableRef.current || !infoColRef.current) return
      setShareInLeftCol(infoColRef.current.scrollHeight > imgStableRef.current.scrollHeight + 32)
    }
    const ro = new ResizeObserver(check)
    if (imgStableRef.current) ro.observe(imgStableRef.current)
    if (infoColRef.current)   ro.observe(infoColRef.current)
    check()
    return () => ro.disconnect()
  }, [])

  const sessionId = useRef(Math.random().toString(36).slice(2))
  const [viewers, setViewers] = useState<number | null>(null)
  useEffect(() => {
    if (!p?.slug) return
    const slug = p.slug
    const sid  = sessionId.current

    async function heartbeat() {
      try {
        const res = await fetch(`/api/viewers/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        })
        const data = await res.json()
        setViewers(data.count ?? null)
      } catch { /* ignore network errors */ }
    }

    heartbeat()
    const interval = setInterval(heartbeat, 30_000)

    return () => {
      clearInterval(interval)
      fetch(`/api/viewers/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [p?.slug])

  const [btSelected, setBtSelected] = useState<Set<string>>(new Set(boughtTogether.map(b => b.id)))
  const btTotal = boughtTogether.filter(b => btSelected.has(b.id)).reduce((s,b) => s + (b.salePrice ?? b.price), 0) + effectivePrice

  if (!p) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-700 mb-2">Product not found</p>
        <Link href="/products" className="text-primary underline">Browse all products</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden"
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-8 animate-fade-in">
          {[['/', 'Home'],['/products','Products'],[`/products?category=${p.category.slug}`, p.category.name]].map(([href,label]) => (
            <span key={href} className="flex items-center gap-1.5">
              <Link href={href} className="hover:text-primary transition-colors capitalize">{label}</Link>
              <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
            </span>
          ))}
          <span className="text-slate-700 font-semibold truncate max-w-[200px]" aria-current="page">{p.name}</span>
        </nav>

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8 items-start animate-fade-in-up">

          {/* Left: images */}
          <div className="space-y-4 lg:sticky lg:top-24 self-start">
          <div ref={imgStableRef} className="space-y-4">
            <div ref={mainImgRef} className="relative overflow-hidden"
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
                    className="object-cover" sizes="(max-width:1024px) 100vw,50vw" priority
                    style={{ opacity: imgVisible?1:0, transition:'opacity 0.22s ease' }} />
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

            {/* Thumbnails */}
            <div className="flex gap-3 flex-wrap">
              {images.map((img, i) => (
                <button key={i} onClick={() => { switchImg(i); setMediaMode('image'); setActiveVideo(null) }}
                  aria-label={`View image ${i+1}`}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${mediaMode==='image'&&activeImg===i?'ring-2 ring-primary ring-offset-2 scale-105 shadow-lg':'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'}`}>
                  <Image src={img} alt={`${p.name} view ${i+1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}
              {videoYtId && (
                <button onClick={() => { setMediaMode('video'); setActiveVideo(videoYtId) }}
                  aria-label="Play product video"
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${mediaMode==='video'?'ring-2 ring-accent ring-offset-2 scale-105 shadow-lg':'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'}`}>
                  <Image src={`https://img.youtube.com/vi/${videoYtId}/mqdefault.jpg`} alt="Product video" fill className="object-cover" sizes="80px" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                      <Play size={12} className="text-slate-800 fill-slate-800 ml-0.5" />
                    </div>
                  </div>
                </button>
              )}
            </div>

          </div>{/* end imgStableRef */}

          {/* Share card — shown in left col only when description is tall */}
          {shareInLeftCol && (
            <div className="glass-panel p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Share</p>
                <div className="flex items-center gap-2">
                  {[
                    { icon: Link2,         label: 'Copy link',  action: () => navigator.clipboard?.writeText(window.location.href) },
                    { icon: MessageCircle, label: 'WhatsApp',   action: () => window.open(`https://wa.me/?text=${encodeURIComponent(p.name+' '+window.location.href)}`) },
                    { icon: Copy,          label: 'Copy name',  action: () => navigator.clipboard?.writeText(p.name) },
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
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                </div>
                <p className="text-xs font-bold text-green-700">COD Available — Pay when delivered</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{icon:Shield,label:'Warranty',sub:'6 months'},{icon:Truck,label:'Delivery',sub:'Same day'},{icon:RotateCcw,label:'Returns',sub:'7 days'}].map(({icon:Icon,label,sub}) => (
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
            </div>
          )}
          </div>

          {/* Right: info */}
          <div ref={infoColRef} className="space-y-4">
            <div className={`flex flex-col gap-4 ${options.length > 0 ? 'lg:aspect-square' : ''}`}>

              {/* Name + Rating */}
              <div className="glass-panel p-4 animate-fade-in-up">
                {p.brand && <p className="text-xs font-extrabold uppercase tracking-widest mb-2 text-primary">{p.brand}</p>}
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">{p.name}</h1>
                {p.sku && <p className="text-[10px] text-slate-400 mt-1">SKU: {p.sku}</p>}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <div className="flex items-center gap-0.5" aria-label={`Rating: ${p.rating} out of 5`}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={15} className={i<=Math.round(p.rating)?'fill-amber-400 text-amber-400':'text-slate-200'} aria-hidden="true" />)}
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{p.rating.toFixed(1)}</span>
                  <a href="#reviews" className="text-sm text-slate-400 hover:text-primary transition-colors">{p.reviewCount} reviews</a>
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
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
                  <span className="flex items-center gap-1.5 text-xs text-slate-400" aria-hidden="true">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> {viewers !== null ? `${viewers} people viewing now` : ''}
                  </span>
                </div>
              </div>

              {/* Options (dynamic) */}
              {options.length > 0 && (
                <div className="glass-panel p-4 animate-fade-in-up space-y-4">
                  {options.map(opt => {
                    const isColor = /^colou?r$/i.test(opt.name)
                    return (
                      <div key={opt.id}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                          {opt.name}{selected[opt.name] ? <span className="text-primary font-semibold normal-case ml-1">— {selected[opt.name]}</span> : ''}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={opt.name}>
                          {opt.values.map(val => isColor ? (
                            <button key={val} onClick={() => selectOption(opt.name, val)}
                              role="radio" aria-checked={selected[opt.name]===val} aria-label={val}
                              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer ${selected[opt.name]===val?'border-primary scale-110 shadow-md':'border-transparent hover:scale-105'}`}
                              style={{ background: colorHex(val) }}
                              title={val}>
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

              {/* Price + CTA */}
              <div className="glass-panel p-4 animate-fade-in-up flex flex-col gap-4">
                <div className="flex items-baseline gap-3">
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
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base cursor-pointer text-white shadow-lg transition-all duration-200"
                    style={{ background:added?'#15803D':variantStock===0?'#e2e8f0':'#16A34A', boxShadow:variantStock>0?'0 8px 24px rgba(22,163,74,0.30)':'none', color:variantStock===0?'#94a3b8':'white' }}>
                    {added ? <><CheckCircle size={19} /> Added!</> : <><ShoppingCart size={19} /> Add to Cart</>}
                  </button>
                  <button
                    onClick={() => { setBuyNow({ id:p.id, name:p.name, price:originalPrice, salePrice:effectivePrice, image:images[0], slug:p.slug, codAvailable:true }, qty); router.push('/checkout') }}
                    disabled={variantStock===0}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-slate-800 hover:bg-white/80 transition-all duration-200 cursor-pointer"
                    style={{ background:'rgba(255,255,255,0.42)', border:'1px solid rgba(255,255,255,0.72)', backdropFilter:'blur(8px)' }}>
                    <Zap size={17} className="text-gold-bright" /> Buy Now
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="glass-panel flex items-center gap-3 px-4 py-3" style={{ borderRadius:'1rem' }}>
              <Package size={15} className="text-slate-400" />
              <span className="text-sm text-slate-500">Category:</span>
              <Link href={`/products?category=${p.category.slug}`} className="text-sm font-bold capitalize text-primary hover:text-primary-dark transition-colors">{p.category.name}</Link>
              <ChevronRight size={13} className="text-slate-300 ml-auto" />
            </div>

            {/* Description */}
            <div className="glass-panel p-6 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-primary" />
                <h2 className="font-heading font-bold text-slate-900">Description</h2>
              </div>
              <div className="text-slate-600 text-sm leading-relaxed rte-render"
                dangerouslySetInnerHTML={{ __html: p.description }} />
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/30">
                  {p.tags.map(t => <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-primary-bg text-primary">#{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Highlights + Share — full-width row ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 items-stretch">

          {/* Product Highlights */}
          <div className="glass-panel p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Product Highlights</p>
            <div className="grid grid-cols-2 gap-3">
              {highlights.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.72)' }}>
                  <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs leading-none">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share + COD + Guarantees — only in row when description is short */}
          {!shareInLeftCol && <div className="glass-panel p-5 flex flex-col justify-between gap-4">
            {/* Share row */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Share</p>
              <div className="flex items-center gap-2">
                {[
                  { icon: Link2,         label: 'Copy link',  action: () => navigator.clipboard?.writeText(window.location.href) },
                  { icon: MessageCircle, label: 'WhatsApp',   action: () => window.open(`https://wa.me/?text=${encodeURIComponent(p.name+' '+window.location.href)}`) },
                  { icon: Copy,          label: 'Copy name',  action: () => navigator.clipboard?.writeText(p.name) },
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

            {/* COD */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
              </div>
              <p className="text-xs font-bold text-green-700">COD Available — Pay when delivered</p>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-3">
              {[{icon:Shield,label:'Warranty',sub:'6 months'},{icon:Truck,label:'Delivery',sub:'Same day'},{icon:RotateCcw,label:'Returns',sub:'7 days'}].map(({icon:Icon,label,sub}) => (
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
          </div>}

        </div>

        {/* ── Product Video ────────────────────────────────────────────── */}
        {videoYtId && (
          <section className="mt-12 animate-fade-in-up" aria-labelledby="video-heading">
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

        {/* ── Frequently Bought Together ───────────────────────────────── */}
        {boughtTogether.length > 0 && (
          <section className="mt-12 glass-panel p-6 animate-fade-in-up" aria-labelledby="bought-together-heading">
            <h2 id="bought-together-heading" className="font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary" /> Frequently Bought Together
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
              {/* Current product */}
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}>
                <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                  <Image src={images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-xs line-clamp-1 max-w-[120px]">{p.name}</p>
                  <p className="text-primary font-bold text-sm">{formatPrice(effectivePrice)}</p>
                </div>
              </div>
              {boughtTogether.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-lg shrink-0">+</span>
                  <label className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${btSelected.has(item.id)?'ring-2 ring-primary':''}`}
                    style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}>
                    <input type="checkbox" checked={btSelected.has(item.id)}
                      onChange={() => { const s = new Set(btSelected); s.has(item.id)?s.delete(item.id):s.add(item.id); setBtSelected(s) }}
                      className="accent-primary w-4 h-4" aria-label={`Include ${item.name}`} />
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                      <Image src={item.images[0] ?? ''} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs line-clamp-1 max-w-[120px]">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-primary font-bold text-sm">{formatPrice(item.salePrice??item.price)}</p>
                        {item.salePrice && <p className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</p>}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/30">
              <div>
                <p className="text-xs text-slate-500">{btSelected.size+1} items total</p>
                <p className="font-heading font-extrabold text-xl text-slate-900">{formatPrice(btTotal)}<span className="text-sm text-slate-400 font-normal ml-2">for all selected</span></p>
              </div>
              <button onClick={() => { boughtTogether.filter(b=>btSelected.has(b.id)).forEach(b=>addItem({id:b.id,name:b.name,price:b.price,salePrice:b.salePrice,image:b.images[0],slug:b.slug})); handleAdd() }}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-primary/20">
                <ShoppingCart size={16} /> Add Bundle to Cart
              </button>
            </div>
          </section>
        )}

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        <section id="reviews" className="mt-12 animate-fade-in-up" aria-labelledby="reviews-heading">
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
              style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.06) 0%, rgba(6,182,212,0.04) 100%)' }}>
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
            <div className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start overflow-hidden">
              {/* Summary */}
              <div className="shrink-0 w-full md:w-44 flex flex-col items-center text-center border-b md:border-b-0 md:border-r pb-5 md:pb-0 md:pr-6" style={{ borderColor:'rgba(255,255,255,0.40)' }}>
                <p className="font-heading font-extrabold text-5xl text-slate-900">{p.rating.toFixed(1)}</p>
                <div className="flex items-center gap-0.5 mt-2">
                  {[1,2,3,4,5].map(i=><Star key={i} size={15} className={i<=Math.round(p.rating)?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
                </div>
                <p className="text-xs text-slate-400 mt-1">{reviews.length} reviews</p>
                <div className="w-full max-w-[180px] mt-4 space-y-1.5">
                  {ratingBreakdown.map(({stars,pct,count})=>(
                    <div key={stars} className="flex items-center gap-1.5" title={`${count} reviews`}>
                      <span className="text-[10px] text-slate-500 w-2.5">{stars}</span>
                      <Star size={9} className="text-gold-bright fill-gold-bright shrink-0" aria-hidden="true" />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.06)' }}>
                        <div className="h-full bg-gradient-to-r from-amber-400 to-gold-bright rounded-full" style={{ width:`${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-5 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Review cards */}
              <div className="flex-1 min-w-0">
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth:'none' }}>
                  {reviews.slice(0,8).map(r => (
                    <article key={r.id} className="shrink-0 flex flex-col justify-between p-4 rounded-2xl"
                      style={{ width:220, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-0.5" aria-label={`${r.rating} stars`}>
                            {[1,2,3,4,5].map(i=><Star key={i} size={12} className={i<=r.rating?'fill-gold-bright text-gold-bright':'text-slate-200'} aria-hidden="true" />)}
                          </div>
                          <time className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-NP',{month:'short',day:'numeric'})}</time>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            {r.user.avatar ? (
                              <Image src={r.user.avatar} alt={r.user.name??'User'} width={24} height={24} className="rounded-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-extrabold text-primary">{(r.user.name??'A')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <span className="font-bold text-slate-800 text-xs">{r.user.name ?? 'Anonymous'}</span>
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full shrink-0">
                            <BadgeCheck size={9} /> Verified
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-4">{r.comment ?? 'No comment provided.'}</p>
                      </div>
                      <button
                        onClick={() => { const s=new Set(helpful); s.has(r.id)?s.delete(r.id):s.add(r.id); setHelpful(s) }}
                        className={`mt-3 flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${helpful.has(r.id)?'text-primary':'text-slate-400 hover:text-slate-600'}`}>
                        <ThumbsUp size={11} /> {helpful.has(r.id)?'Helpful':'Mark helpful'}
                      </button>
                    </article>
                  ))}
                </div>
                {reviews.length > 8 && (
                  <button onClick={() => setShowReviewModal(true)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer ml-auto transition-colors">
                    View all {reviews.length} reviews <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Shop's Choice ──────────────────────────────────────────────── */}
        {shopsChoice.length > 0 && (
          <section className="mt-12 animate-fade-in-up" aria-labelledby="shops-choice-heading">
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

        {/* ── Similar Products ────────────────────────────────────────────── */}
        {similar.length > 0 && (
          <section className="mt-12 animate-fade-in-up" aria-labelledby="similar-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="similar-heading" className="font-heading font-bold text-slate-900 text-2xl">Similar Products</h2>
              <Link href={`/products?category=${p.category.slug}`}
                className="text-sm font-semibold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x scroll-smooth" style={{ scrollbarWidth:'none' }}>
              {similar.map(item => (
                <Link key={item.id} href={`/products/${item.slug}`}
                  className="glass-panel p-4 shrink-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200 snap-start"
                  style={{ width:188 }}>
                  <div className="relative h-36 rounded-xl overflow-hidden mb-3">
                    <Image src={item.images[0]??''} alt={item.name} fill className="object-cover" sizes="188px" />
                    {item.salePrice && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-lg">
                        -{discountPercent(item.price, item.salePrice)}%
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-xs line-clamp-2 leading-snug">{item.name}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star size={10} className="fill-gold-bright text-gold-bright" />
                    <span className="text-[11px] font-semibold text-slate-600">{item.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-bold text-slate-900 text-sm">{formatPrice(item.salePrice??item.price)}</span>
                    {item.salePrice && <span className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Reviews Modal ────────────────────────────────────────────────── */}
      {showReviewModal && (
        <>
          <div className="fixed inset-0 z-50 animate-fade-in" style={{ background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)' }}
            onClick={() => setShowReviewModal(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="review-modal-title"
            className="fixed inset-x-4 top-16 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 flex flex-col rounded-3xl overflow-hidden animate-fade-in-up"
            style={{ background:'rgba(255,255,255,0.90)', backdropFilter:'blur(28px) saturate(200%)', border:'1px solid rgba(255,255,255,0.90)', boxShadow:'0 32px 80px rgba(0,0,0,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <h3 id="review-modal-title" className="font-heading font-bold text-slate-900 text-lg">All Reviews ({reviews.length})</h3>
              <button onClick={() => setShowReviewModal(false)} aria-label="Close"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {reviews.map(r => (
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

      {/* ── Sticky buy bar ─────────────────────────────────────────────── */}
      {/* bottom-16 on mobile = sits above the bottom nav bar (h-16); md:bottom-0 on desktop */}
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

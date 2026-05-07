'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingCart, Heart, Star, Shield, Truck,
  RotateCcw, Share2, Minus, Plus, Zap, CheckCircle,
  ChevronRight, Package, Lock, BadgeCheck, ThumbsUp,
  ShoppingBag, Award, ChevronLeft,
  Bluetooth, Battery, Droplets, Volume2,
  Link2, MessageCircle, Copy, X,
  Play, PlayCircle, BookOpen,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice, discountPercent } from '@/lib/utils'

// ── Demo product ───────────────────────────────────────────────────────────
const DEMO = {
  id: '1', name: 'AirPods Pro Max Clone', slug: 'airpods-pro-max',
  brand: 'SoundX', price: 8500, salePrice: 6800, stock: 15,
  rating: 4.5, reviewCount: 234, isNew: false,
  images: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&h=700&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=700&h=700&fit=crop',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&h=700&fit=crop',
  ],
  description: `Premium wireless earbuds with active noise cancellation and crystal-clear sound.

Features:
• 30-hour battery life with charging case
• Active Noise Cancellation (ANC)
• Bluetooth 5.2 with 15m range
• IPX4 water resistance
• Touch controls with gestures
• USB-C fast charging`,
  category: { name: 'Gadgets', slug: 'gadgets' },
  tags: ['wireless', 'earbuds', 'anc', 'bluetooth'],
  taxable: true,
  vatRate: 0.13,   // 13% VAT — Nepal standard rate; prices are VAT-inclusive
  codAvailable: true,  // set false for high-value or fragile items

  // ── Product videos (gallery + how-to) ────────────────────────────────────
  // youtubeId: replace with real product video IDs in production
  videos: [
    { id: 'v1', title: 'Product Overview',    youtubeId: 'ScMzIvxBSi4', thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=480&h=270&fit=crop', duration: '3:22' },
  ],
  howToUse: [
    {
      step: 1, title: 'Pair with your device',
      desc: 'Open the charging case near your phone. A pairing prompt will appear — tap Connect to complete setup in seconds.',
      icon: Bluetooth,
      videoId: 'ScMzIvxBSi4',
      thumb: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=480&h=270&fit=crop',
      duration: '1:15',
    },
    {
      step: 2, title: 'Customize touch controls',
      desc: 'Single tap: play/pause · Double tap: skip · Triple tap: previous · Long press: toggle ANC. Use the app to remap.',
      icon: Volume2,
      videoId: 'ScMzIvxBSi4',
      thumb: 'https://images.unsplash.com/photo-1508614999368-9260051292e5?w=480&h=270&fit=crop',
      duration: '2:48',
    },
    {
      step: 3, title: 'Optimize fit & comfort',
      desc: 'Try different ear tip sizes included in the box. A proper seal improves bass response and ANC effectiveness.',
      icon: Battery,
      videoId: 'ScMzIvxBSi4',
      thumb: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=480&h=270&fit=crop',
      duration: '1:54',
    },
  ],

  // ── Key highlights (shown below image on desktop) ─────────────────────────
  highlights: [
    { icon: Battery,   label: '30-Hour',        sub: 'Battery life'       },
    { icon: Volume2,   label: 'Active ANC',      sub: 'Noise cancellation' },
    { icon: Bluetooth, label: 'Bluetooth 5.2',   sub: '15m wireless range' },
    { icon: Droplets,  label: 'IPX4 Rated',      sub: 'Splash resistant'   },
  ],

  // ── Variants ─────────────────────────────────────────────────────────────
  colors: [
    { name: 'Midnight',    hex: '#1c1c1e', priceMod: 0,   imageIdx: 0 },
    { name: 'Starlight',   hex: '#f5f5f0', priceMod: 0,   imageIdx: 1 },
    { name: 'Sky Blue',    hex: '#87ceeb', priceMod: 300,  imageIdx: 2 },
    { name: 'Rose Gold',   hex: '#e8b4a8', priceMod: 500,  imageIdx: 0 },
  ],
  models: [
    { label: 'Standard', priceMod: 0 },
    { label: 'Pro',       priceMod: 1700 },
  ],

  // ── Frequently bought together ────────────────────────────────────────────
  boughtTogether: [
    { id: 'bt1', name: 'USB-C Fast Charger 65W',    slug: 'usb-c-charger-65w',  price: 1200, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop' },
    { id: 'bt2', name: 'Smart Watch Series X',      slug: 'smart-watch-x',       price: 12000, salePrice: 10500, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop' },
    { id: 'bt3', name: 'Portable Bluetooth Speaker',slug: 'bluetooth-speaker',   price: 3200, salePrice: 2500, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&h=200&fit=crop' },
  ],

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviews: [
    { id: 'r1', author: 'Rohan S.',  avatar: null, rating: 5, title: 'Amazing sound quality!', comment: 'These are hands down the best earbuds I\'ve owned. The ANC works flawlessly in noisy environments.', verified: true,  date: '2026-04-15', helpful: 24 },
    { id: 'r2', author: 'Priya T.',  avatar: null, rating: 4, title: 'Great value for money',  comment: 'Battery life is impressive and the bass is punchy. Build quality feels premium.', verified: true,  date: '2026-04-08', helpful: 17 },
    { id: 'r3', author: 'Aarav P.',  avatar: null, rating: 5, title: 'Exceeded expectations',  comment: 'Fast shipping, well packed. The touch controls took a day to get used to but now it\'s natural.', verified: true,  date: '2026-03-29', helpful: 11 },
    { id: 'r4', author: 'Meera K.',  avatar: null, rating: 3, title: 'Decent but not perfect', comment: 'Sound is good but slightly tight fit after long sessions. Overall solid purchase.', verified: false, date: '2026-03-20', helpful: 4 },
  ],
  ratingBreakdown: [
    { stars: 5, pct: 62 }, { stars: 4, pct: 21 }, { stars: 3, pct: 9 }, { stars: 2, pct: 5 }, { stars: 1, pct: 3 },
  ],

  // ── Similar products ──────────────────────────────────────────────────────
  similar: [
    { id: 's1', name: 'Gaming Earbuds Pro',        slug: 'gaming-earbuds-pro',    price: 6000, salePrice: 3600, rating: 4.3, reviewCount: 89,  image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop' },
    { id: 's2', name: 'Portable Bluetooth Speaker',slug: 'bluetooth-speaker',     price: 3200, salePrice: 2500, rating: 4.2, reviewCount: 143, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop' },
    { id: 's3', name: 'Laptop Stand Aluminum',     slug: 'laptop-stand',          price: 2800, rating: 4.6, reviewCount: 88,  image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&h=300&fit=crop' },
    { id: 's4', name: 'USB-C Fast Charger 65W',    slug: 'usb-c-charger-65w',     price: 1500, salePrice: 1200, rating: 4.3, reviewCount: 167, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop' },
    { id: 's5', name: 'RGB Mechanical Keyboard',   slug: 'rgb-keyboard',          price: 4500, salePrice: 3800, rating: 4.4, reviewCount: 91,  image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=300&fit=crop' },
  ],

  // ── Shop's Choice ─────────────────────────────────────────────────────────
  shopsChoice: [
    { id: 'sc1', name: 'Smart Watch Series X',   slug: 'smart-watch-x',   price: 12000, badge: "Editor's Pick", image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop', reason: 'Best-selling gadget for 3 months running' },
    { id: 'sc2', name: 'Vitamin C Serum 30ml',   slug: 'vitamin-c-serum', price: 1800,  badge: 'Staff Loved',   image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop', reason: 'Highest reorder rate in beauty category' },
  ],
}

// ── Color extraction ────────────────────────────────────────────────────────
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
    const img = new window.Image(); img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = 60; canvas.height = 60
        const ctx = canvas.getContext('2d'); if (!ctx) return reject()
        ctx.drawImage(img, 0, 0, 60, 60)
        const d = ctx.getImageData(0, 0, 60, 60).data; let r = 0, g = 0, b = 0, c = 0
        for (let i = 0; i < d.length; i += 16) { const br = (d[i]+d[i+1]+d[i+2])/3; if (br>35&&br<220){r+=d[i];g+=d[i+1];b+=d[i+2];c++} }
        if (c===0) return reject(); resolve([Math.round(r/c), Math.round(g/c), Math.round(b/c)])
      } catch { reject() }
    }; img.onerror = reject; img.src = src
  })
}
const CATEGORY_THEMES: Record<string, [string,string,string]> = {
  electronics: ['hsl(239,60%,62%)','hsl(279,55%,60%)','hsl(199,65%,58%)'],
  gadgets:     ['hsl(199,65%,58%)','hsl(239,60%,62%)','hsl(159,55%,52%)'],
  beauty:      ['hsl(320,60%,62%)','hsl(279,55%,60%)','hsl(350,60%,64%)'],
  default:     ['hsl(159,55%,52%)','hsl(199,65%,58%)','hsl(239,60%,62%)'],
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { addItem, setBuyNow } = useCart()
  const router    = useRouter()
  const params    = useParams()
  const pageSlug  = (params?.slug as string) ?? ''

  // DB product overrides — fetched on mount by slug
  const [dbProduct, setDbProduct] = useState<Record<string, unknown>>({})
  const product = { ...DEMO, ...dbProduct } as typeof DEMO

  useEffect(() => {
    if (!pageSlug) return
    fetch(`/api/products/slug/${pageSlug}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.id) return
        setDbProduct({
          id:          data.id,
          name:        data.name,
          slug:        data.slug,
          price:       data.price,
          salePrice:   data.salePrice   ?? undefined,
          images:      data.images?.length > 0 ? data.images : product.images,
          description: data.description || DEMO.description,
          brand:       data.brand       || product.brand,
          stock:       typeof data.stock === 'number' ? data.stock : product.stock,
          rating:      data.rating      ?? product.rating,
          reviewCount: data.reviewCount ?? product.reviewCount,
          isNew:       data.isNew       ?? product.isNew,
          category:    data.category    ? { name: data.category.name, slug: data.category.slug } : product.category,
          tags:        data.tags?.length > 0 ? data.tags : product.tags,
          codAvailable: true,
          taxable:      data.isTaxable  ?? product.taxable,
          videoUrl:     data.videoUrl   ?? null,
        })
      })
      .catch(() => {})
  }, [pageSlug])

  const [activeImg,    setActiveImg]    = useState(0)
  const [imgVisible,   setImgVisible]   = useState(true)
  const [mediaMode,    setMediaMode]    = useState<'image' | 'video'>('image')
  const [activeVideo,  setActiveVideo]  = useState<string | null>(null)
  const [playingHowTo, setPlayingHowTo] = useState<number | null>(null)
  const [qty,        setQty]        = useState(1)
  const [wished,     setWished]     = useState(false)
  const [added,      setAdded]      = useState(false)
  const [blobs,      setBlobs]      = useState<[string,string,string]>(CATEGORY_THEMES[product.category.slug]??CATEGORY_THEMES.default)
  const [showSticky, setShowSticky] = useState(false)
  const addToCartRef = useRef<HTMLButtonElement>(null)

  // Smooth crossfade when switching image
  function switchToImage(idx: number) {
    if (idx === activeImg) return
    setImgVisible(false)
    setTimeout(() => { setActiveImg(idx); setImgVisible(true) }, 220)
  }

  // Sticky bar — only shows after user has scrolled past the Add to Cart button.
  // The guard prevents the flash on initial load when IntersectionObserver
  // fires before layout settles (button briefly "not intersecting" → shows bar → hides).
  useEffect(() => {
    const el = addToCartRef.current
    if (!el) return

    let hasScrolled = false

    const obs = new IntersectionObserver(([e]) => {
      // Ignore the initial fire on mount — only react after user scrolls
      if (hasScrolled) setShowSticky(!e.isIntersecting)
    }, { threshold: 0 })

    const onFirstScroll = () => { hasScrolled = true }

    obs.observe(el)
    window.addEventListener('scroll', onFirstScroll, { passive: true, once: true })

    return () => {
      obs.disconnect()
      window.removeEventListener('scroll', onFirstScroll)
    }
  }, [])

  // Variant selections
  const [selColor, setSelColor] = useState(0)
  const [selModel, setSelModel] = useState(0)

  // Bought together selection
  const [btSelected, setBtSelected] = useState<Set<string>>(new Set(product.boughtTogether.map(b=>b.id)))

  // Review form + modal
  const [showReviewForm,  setShowReviewForm]  = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [helpful, setHelpful] = useState<Set<string>>(new Set())

  // Color extraction
  const extractAndApply = useCallback((src: string) => {
    extractDominantColor(src)
      .then(([r,g,b]) => {
        const [h,s] = rgbToHsl(r,g,b); const sat = Math.min(90,Math.max(50,s+15))
        setBlobs([hsl(h,sat,58), hsl((h+50)%360,sat-10,60), hsl((h-50+360)%360,sat-5,56)])
      })
      .catch(() => setBlobs(CATEGORY_THEMES[product.category.slug]??CATEGORY_THEMES.default))
  }, [])
  useEffect(() => { extractAndApply(product.images[activeImg]) }, [activeImg, extractAndApply])

  const colorMod = product.colors[selColor]?.priceMod ?? 0
  const modelMod = product.models[selModel]?.priceMod ?? 0
  const basePrice = product.salePrice ?? product.price
  const effectivePrice = basePrice + colorMod + modelMod
  const discount = product.price > effectivePrice ? discountPercent(product.price + colorMod + modelMod, effectivePrice) : 0

  function handleAdd() {
    addItem({ id: product.id, name: product.name, price: product.price, salePrice: effectivePrice, image: product.images[0], slug: product.slug, codAvailable: product.codAvailable }, qty)
    setAdded(true); setTimeout(() => setAdded(false), 2000)
  }

  const btTotal = product.boughtTogether.filter(b => btSelected.has(b.id)).reduce((s,b) => s + (b.salePrice ?? b.price), 0) + effectivePrice

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 40%, #FFF0F9 70%, #F0FDF4 100%)' }}>

      {/* ── Dynamic blobs ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {[
          { b: blobs[0], w: 540, op: 0.50, delay: '0s', cls: 'animate-blob-float-a', pos: '-top-24 -left-24' },
          { b: blobs[1], w: 420, op: 0.44, delay: '2s', cls: 'animate-blob-float-b', pos: 'top-1/3 -right-20' },
          { b: blobs[2], w: 460, op: 0.42, delay: '1s', cls: 'animate-blob-float-c', pos: 'bottom-0 left-1/3' },
          { b: blobs[1], w: 300, op: 0.32, delay: '3.5s',cls:'animate-blob-float-a', pos: 'top-1/2 left-1/2' },
        ].map(({ b, w, op, delay, cls, pos }, i) => (
          <div key={i}
            className={`blob absolute animate-blob-morph ${cls} ${pos}`}
            style={{ background: b, opacity: op, transition: 'background 1.2s ease', animationDelay: delay, width: w, height: w }} />
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-8 animate-fade-in">
          {[['/', 'Home'], ['/products', 'Products'], [`/products?category=${product.category.slug}`, product.category.name]].map(([href, label]) => (
            <span key={href} className="flex items-center gap-1.5">
              <Link href={href} className="hover:text-primary transition-colors cursor-pointer capitalize">{label}</Link>
              <ChevronRight size={12} className="text-slate-300" />
            </span>
          ))}
          <span className="text-slate-700 font-semibold truncate max-w-[180px]">{product.name}</span>
        </nav>

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8 items-start animate-fade-in-up">

          {/* Left: Images — sticky so it stays aligned with info column on scroll */}
          <div className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="relative overflow-hidden"
              style={{ borderRadius:'2rem', background:'rgba(255,255,255,0.50)', backdropFilter:'blur(24px) saturate(200%)', border:'1px solid rgba(255,255,255,0.78)', boxShadow:'0 24px 64px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
              <div className="relative aspect-square">
                {mediaMode === 'video' && activeVideo ? (
                  <>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Product video"
                    />
                    {/* Back to images */}
                    <button onClick={() => { setMediaMode('image'); setActiveVideo(null) }}
                      className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                      style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)' }}>
                      <X size={12} /> Back to photos
                    </button>
                  </>
                ) : (
                  <Image src={product.images[activeImg]} alt={product.name} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" priority
                    style={{ opacity: imgVisible ? 1 : 0, transition: 'opacity 0.22s ease' }} />
                )}
                <div className="absolute inset-x-0 bottom-0 h-20" style={{ background:'linear-gradient(to top, rgba(255,255,255,0.25), transparent)' }} />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {discount > 0 && <span className="px-3 py-1 text-white text-sm font-extrabold rounded-xl shadow-lg bg-accent">-{discount}% OFF</span>}
                  {product.isNew && <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-primary text-white text-sm font-extrabold rounded-xl shadow-lg">New</span>}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button onClick={() => setWished(w => !w)} aria-label="Wishlist"
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all cursor-pointer ${wished?'bg-red-500 text-white':'text-slate-400 hover:text-red-500'}`}
                    style={!wished ? { background:'rgba(255,255,255,0.52)', backdropFilter:'blur(12px) saturate(180%)' } : {}}>
                    <Heart size={17} className={wished?'fill-white':''} />
                  </button>
                  <button aria-label="Share"
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                    style={{ background:'rgba(255,255,255,0.52)', backdropFilter:'blur(12px) saturate(180%)' }}>
                    <Share2 size={17} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {/* Image thumbnails */}
              {product.images.map((img, i) => (
                <button key={i} onClick={() => { switchToImage(i); setMediaMode('image'); setActiveVideo(null) }}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                    mediaMode === 'image' && activeImg===i
                      ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-lg'
                      : 'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'
                  }`}>
                  <Image src={img} alt={`view ${i+1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}

              {/* Video thumbnails — shown alongside image thumbnails */}
              {product.videos.map(v => (
                <button key={v.id}
                  onClick={() => { setMediaMode('video'); setActiveVideo(v.youtubeId) }}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                    mediaMode === 'video' && activeVideo === v.youtubeId
                      ? 'ring-2 ring-accent ring-offset-2 scale-105 shadow-lg'
                      : 'ring-1 ring-slate-200 hover:ring-slate-400 opacity-70 hover:opacity-100'
                  }`}>
                  <Image src={v.thumbnail} alt={v.title} fill className="object-cover" sizes="80px" />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                      <Play size={12} className="text-slate-800 fill-slate-800 ml-0.5" />
                    </div>
                  </div>
                  {/* Duration badge */}
                  <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 text-[9px] font-bold text-white rounded bg-black/60">
                    {v.duration}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Key Highlights ─────────────────────────────────── */}
            <div className="glass-panel p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Key Highlights</p>
              <div className="grid grid-cols-2 gap-3 items-stretch">
                {product.highlights.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-2xl h-full"
                    style={{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.72)' }}>
                    <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs leading-none">{label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Share strip + Guarantee chips ──────────────────── */}
            <div className="glass-panel p-5">
              {/* Share row */}
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Share</p>
                <div className="flex items-center gap-2 ml-1">
                  {[
                    { icon: Link2,         label: 'Copy Link', action: () => navigator.clipboard?.writeText(window.location.href) },
                    { icon: MessageCircle, label: 'WhatsApp',  action: () => window.open(`https://wa.me/?text=${encodeURIComponent(product.name + ' ' + window.location.href)}`) },
                    { icon: Copy,          label: 'Copy',      action: () => navigator.clipboard?.writeText(product.name) },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} title={label}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:scale-110 transition-all cursor-pointer"
                      style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.78)' }}>
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 ml-auto">{product.reviewCount} love this</p>
              </div>

              {/* COD availability badge */}
              <div className="mt-4 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,0.40)' }}>
                {product.codAvailable ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100 mb-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                    </div>
                    <p className="text-xs font-bold text-green-700">COD Available — Pay when delivered</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 mb-3">
                    <div className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 10 10" className="w-3 h-3 fill-white"><path d="M2 2l6 6M8 2l-6 6" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                    </div>
                    <p className="text-xs font-bold text-red-600">COD Not Available — Prepayment required</p>
                  </div>
                )}
              </div>

              {/* Guarantee chips */}
              <div className="grid grid-cols-3 gap-3 items-stretch">
                {[{icon:Shield,label:'Warranty',sub:'6 months'},{icon:Truck,label:'Delivery',sub:'Same day'},{icon:RotateCcw,label:'Returns',sub:'7 days'}].map(({icon:Icon,label,sub}) => (
                  <div key={label} className="flex flex-col items-center text-center p-3 rounded-2xl h-full"
                    style={{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.72)' }}>
                    <div className="w-8 h-8 rounded-xl mb-1.5 flex items-center justify-center bg-primary-bg">
                      <Icon size={15} className="text-primary" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-4">

            {/* ── Top 3 panels — matches image height on desktop via aspect-square ── */}
            {/* Both columns are equal width; aspect-square gives same height as the image */}
            <div className="lg:aspect-square flex flex-col gap-4">

            {/* Brand + title + rating */}
            <div className="glass-panel p-4 animate-fade-in-up delay-100">
              {product.brand && <p className="text-xs font-extrabold uppercase tracking-widest mb-2 text-primary">{product.brand}</p>}
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={15} className={i<=Math.round(product.rating)?'fill-amber-400 text-amber-400':'text-slate-200'} />)}
                </div>
                <span className="font-bold text-slate-800 text-sm">{product.rating}</span>
                <a href="#reviews" className="text-sm text-slate-400 hover:text-primary cursor-pointer transition-colors">{product.reviewCount} reviews</a>
              </div>

              {/* Stock urgency + social proof */}
              <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                {product.stock > 0 && product.stock <= 20 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-accent">Only {product.stock} left!</span>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.08)' }}>
                      <div className="h-full bg-gradient-to-r from-accent to-red-400 rounded-full" style={{ width:`${Math.round((product.stock/30)*100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-green-600">{product.stock > 0 ? 'In stock' : 'Out of stock'}</span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  24 people viewing now
                </span>
              </div>
            </div>

            {/* Variants */}
            <div className="glass-panel p-4 animate-fade-in-up delay-150">
              {/* Color */}
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Color — <span className="text-primary normal-case font-semibold">{product.colors[selColor].name}</span>
                </p>
                <div className="flex items-center gap-3">
                  {product.colors.map((c, i) => (
                    <button key={c.name} onClick={() => { setSelColor(i); switchToImage(c.imageIdx) }}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer ${selColor===i?'border-primary scale-110 shadow-md':'border-transparent hover:scale-105'}`}
                      style={{ background: c.hex }}
                      title={c.name}
                    >
                      {selColor===i && (
                        <span className="block w-full h-full rounded-full border-2 border-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {/* Model */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Model</p>
                <div className="flex items-center gap-2">
                  {product.models.map((m, i) => (
                    <button key={m.label} onClick={() => setSelModel(i)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        selModel===i
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'text-slate-600 hover:bg-white/70'
                      }`}
                      style={selModel===i?{}:{ background:'rgba(255,255,255,0.50)', border:'1px solid rgba(255,255,255,0.75)' }}
                    >
                      {m.label} {m.priceMod>0 && <span className="text-[10px] opacity-70">+{formatPrice(m.priceMod)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price + CTA — flex-1 expands to fill remaining height inside the aspect-square wrapper */}
            <div className="glass-panel p-4 animate-fade-in-up delay-200 flex-1 flex flex-col justify-between">
              <div className="flex items-baseline gap-3 mb-5">
                <span className="font-heading font-extrabold text-4xl text-slate-900">{formatPrice(effectivePrice)}</span>
                {(product.price + colorMod + modelMod) > effectivePrice && (
                  <span className="text-xl text-slate-400 line-through font-medium">{formatPrice(product.price + colorMod + modelMod)}</span>
                )}
                {discount > 0 && (
                  <span className="px-2.5 py-1 text-sm font-bold rounded-xl text-white bg-primary">Save {formatPrice(product.price - effectivePrice)}</span>
                )}
              </div>
              {/* VAT note — shown only for taxable products, prices are inclusive */}
              {product.taxable && product.vatRate > 0 && (() => {
                const vatAmt = Math.round(effectivePrice - effectivePrice / (1 + product.vatRate))
                return (
                  <p className="text-xs text-slate-400 -mt-3 mb-5">
                    Incl. {Math.round(product.vatRate * 100)}% VAT
                    <span className="ml-1">({formatPrice(vatAmt)})</span>
                  </p>
                )
              })()}
              <div className="flex items-center gap-4 mb-5">
                <span className="text-sm font-bold text-slate-700">Quantity</span>
                <div className="flex items-center gap-2 rounded-2xl p-1" style={{ background:'rgba(255,255,255,0.40)' }}>
                  <button onClick={() => setQty(q => Math.max(1,q-1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer" style={{ background:'rgba(255,255,255,0.50)' }}>
                    <Minus size={15} className="text-slate-600" />
                  </button>
                  <span className="w-10 text-center font-bold text-lg tabular-nums text-slate-900">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock,q+1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer" style={{ background:'rgba(255,255,255,0.50)' }}>
                    <Plus size={15} className="text-slate-600" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button ref={addToCartRef} onClick={handleAdd} disabled={product.stock===0}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base cursor-pointer text-white shadow-lg transition-all duration-200"
                  style={{ background: added?'#15803D':product.stock===0?'#e2e8f0':'#16A34A', boxShadow: product.stock>0?'0 8px 24px rgba(22,163,74,0.30)':'none', color: product.stock===0?'#94a3b8':'white' }}>
                  {added ? <><CheckCircle size={19} /> Added!</> : <><ShoppingCart size={19} /> Add to Cart</>}
                </button>
                <button
                  onClick={() => {
                    // Buy Now: isolated session — never touches the regular cart
                    setBuyNow({
                      id: product.id, name: product.name,
                      price: product.price, salePrice: effectivePrice,
                      image: product.images[0], slug: product.slug,
                      codAvailable: product.codAvailable,
                    }, qty)
                    router.push('/checkout')
                  }}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-slate-800 hover:bg-white/80 transition-all duration-200 cursor-pointer"
                  style={{ background:'rgba(255,255,255,0.42)', border:'1px solid rgba(255,255,255,0.72)', backdropFilter:'blur(8px)' }}>
                  <Zap size={17} className="text-gold-bright" /> Buy Now
                </button>
              </div>
            </div>

            </div> {/* end aspect-square wrapper */}

            {/* Description */}
            <div className="glass-panel p-6 animate-fade-in-up delay-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-primary" />
                <h3 className="font-heading font-bold text-slate-900">Description</h3>
              </div>
              <div
                className="text-slate-600 text-sm leading-relaxed rte-render"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/30">
                  {product.tags.map(t => (
                    <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-primary-bg text-primary">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="glass-panel animate-fade-in-up delay-500 flex items-center gap-3 px-4 py-3" style={{ borderRadius:'1rem' }}>
              <Package size={15} className="text-slate-400" />
              <span className="text-sm text-slate-500">Category:</span>
              <Link href={`/products?category=${product.category.slug}`} className="text-sm font-bold capitalize text-primary hover:text-primary-dark transition-colors cursor-pointer">{product.category.name}</Link>
              <ChevronRight size={13} className="text-slate-300 ml-auto" />
            </div>
          </div>
        </div>

        {/* ── How to Use / Watch & Learn ──────────────────────────────── */}
        <div className="mt-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-slate-900 text-2xl flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> Watch &amp; Learn
            </h2>
          </div>

          {product.howToUse.length === 1 ? (
            // ── Featured single-video layout ──────────────────────────
            (() => {
              const step = product.howToUse[0]
              return (
                <div className="glass-panel overflow-hidden animate-fade-in-up">
                  <div className="grid md:grid-cols-2 items-stretch">
                    {/* Video — left, 16:9 */}
                    <div className="relative" style={{ paddingBottom: 'min(56.25%, 340px)' }}>
                      {playingHowTo === step.step ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${step.videoId}?autoplay=1&rel=0&modestbranding=1`}
                          className="absolute inset-0 w-full h-full"
                          allow="autoplay; fullscreen"
                          allowFullScreen title={step.title}
                        />
                      ) : (
                        <>
                          <Image src={step.thumb} alt={step.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                          <div className="absolute inset-0 bg-black/30" />
                          <div className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                            <span className="text-white text-xs font-extrabold">{step.step}</span>
                          </div>
                          <span className="absolute bottom-4 right-4 px-2 py-1 text-[10px] font-bold text-white rounded-lg bg-black/60">{step.duration}</span>
                          <button onClick={() => setPlayingHowTo(step.step)}
                            className="absolute inset-0 flex items-center justify-center cursor-pointer group" aria-label={`Play: ${step.title}`}>
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:bg-white">
                              <PlayCircle size={32} className="text-primary fill-primary" />
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                    {/* Description — right */}
                    <div className="p-7 flex flex-col justify-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center">
                        <step.icon size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-heading font-bold text-slate-900 text-xl">{step.title}</p>
                        <p className="text-slate-500 leading-relaxed mt-2 text-sm">{step.desc}</p>
                      </div>
                      <button onClick={() => setPlayingHowTo(step.step)}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold rounded-2xl cursor-pointer hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 self-start text-sm">
                        <Play size={14} /> Watch Tutorial ({step.duration})
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            // ── Multi-video grid (2 → 2-col, 3+ → 3-col) ─────────────
            <div className={`grid gap-5 ${product.howToUse.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {product.howToUse.map((step, idx) => (
                <div key={step.step} className="glass-panel overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}>

                  <div className="relative" style={{ paddingBottom:'56.25%' }}>
                    {playingHowTo === step.step ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${step.videoId}?autoplay=1&rel=0&modestbranding=1`}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; fullscreen"
                        allowFullScreen title={step.title}
                      />
                    ) : (
                      <>
                        <Image src={step.thumb} alt={step.title} fill className="object-cover"
                          sizes={`(max-width:768px) 100vw, ${product.howToUse.length === 2 ? '50vw' : '33vw'}`} />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute top-3 left-3 w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
                          <span className="text-white text-xs font-extrabold">{step.step}</span>
                        </div>
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[10px] font-bold text-white rounded-lg bg-black/60">{step.duration}</span>
                        <button onClick={() => setPlayingHowTo(step.step)}
                          className="absolute inset-0 flex items-center justify-center cursor-pointer group" aria-label={`Play: ${step.title}`}>
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:bg-white">
                            <PlayCircle size={28} className="text-primary fill-primary" />
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center shrink-0 mt-0.5">
                        <step.icon size={15} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{step.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Frequently Bought Together ───────────────────────────────── */}
        <div className="mt-12 glass-panel p-6 animate-fade-in-up">
          <h2 className="font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" /> Frequently Bought Together
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            {/* Current product */}
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}>
              <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-xs line-clamp-1 max-w-[120px]">{product.name}</p>
                <p className="text-primary font-bold text-sm">{formatPrice(effectivePrice)}</p>
              </div>
            </div>

            {product.boughtTogether.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-lg shrink-0">+</span>
                <label
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${btSelected.has(item.id)?'ring-2 ring-primary':''}`}
                  style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}>
                  <input type="checkbox" checked={btSelected.has(item.id)}
                    onChange={() => {
                      const s = new Set(btSelected)
                      s.has(item.id) ? s.delete(item.id) : s.add(item.id)
                      setBtSelected(s)
                    }}
                    className="accent-primary w-4 h-4" />
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
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
              <p className="text-xs text-slate-500">{btSelected.size + 1} item{btSelected.size > 0 ? 's' : ''} total</p>
              <p className="font-heading font-extrabold text-xl text-slate-900">
                {formatPrice(btTotal)}
                <span className="text-sm text-slate-400 font-normal ml-2">for all selected</span>
              </p>
            </div>
            <button
              onClick={() => {
                product.boughtTogether.filter(b => btSelected.has(b.id)).forEach(b =>
                  addItem({ id: b.id, name: b.name, price: b.price, salePrice: b.salePrice, image: b.image, slug: b.slug })
                )
                handleAdd()
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-primary/20">
              <ShoppingCart size={16} /> Add Bundle to Cart
            </button>
          </div>
        </div>

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        <div id="reviews" className="mt-12 animate-fade-in-up">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-slate-900 text-2xl flex items-center gap-2">
              <Star size={20} className="text-gold-bright fill-gold-bright" /> Customer Reviews
            </h2>
            <button onClick={() => setShowReviewForm(s => !s)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20">
              + Write Review
            </button>
          </div>

          {/* Write review form */}
          {showReviewForm && (
            <div className="glass-panel p-5 space-y-3 mb-5 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <Lock size={14} className="text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500">Only customers whose order has been delivered can submit a review.</p>
              </div>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setMyRating(i)} className="cursor-pointer">
                    <Star size={22} className={i<=myRating?'fill-gold-bright text-gold-bright':'text-slate-200 hover:text-amber-300'} />
                  </button>
                ))}
              </div>
              <textarea value={myReview} onChange={e => setMyReview(e.target.value)}
                placeholder="Share your experience…" rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none text-slate-800"
                style={{ background:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.80)', backdropFilter:'blur(8px)' }} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReviewForm(false)} className="px-4 py-2 text-sm text-slate-500 cursor-pointer">Cancel</button>
                <button className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-primary-dark">Submit</button>
              </div>
            </div>
          )}

          {/* ── Main reviews panel: summary left + horizontal cards right ── */}
          <div className="glass-panel p-6 flex gap-6 items-start overflow-hidden">

            {/* Left: Rating summary (fixed) */}
            <div className="shrink-0 w-44 flex flex-col items-center text-center border-r pr-6" style={{ borderColor: 'rgba(255,255,255,0.40)' }}>
              <p className="font-heading font-extrabold text-5xl text-slate-900">{product.rating}</p>
              <div className="flex items-center gap-0.5 mt-2">
                {[1,2,3,4,5].map(i => <Star key={i} size={15} className={i<=Math.round(product.rating)?'fill-gold-bright text-gold-bright':'text-slate-200'} />)}
              </div>
              <p className="text-xs text-slate-400 mt-1">{product.reviewCount} reviews</p>

              <div className="w-full mt-4 space-y-1.5">
                {product.ratingBreakdown.map(({ stars, pct }) => (
                  <div key={stars} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 w-2.5">{stars}</span>
                    <Star size={9} className="text-gold-bright fill-gold-bright shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.06)' }}>
                      <div className="h-full bg-gradient-to-r from-amber-400 to-gold-bright rounded-full" style={{ width:`${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-5 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Horizontal scrollable review cards */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth:'none' }}>
                {product.reviews.map(r => (
                  <div key={r.id}
                    className="shrink-0 flex flex-col justify-between p-4 rounded-2xl"
                    style={{ width: 220, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.80)' }}
                  >
                    {/* Top: stars + date */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={12} className={i<=r.rating?'fill-gold-bright text-gold-bright':'text-slate-200'} />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{r.date.slice(5)}</span>
                      </div>

                      {/* Author + verified */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-extrabold text-primary">{r.author[0]}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-xs">{r.author}</span>
                        {r.verified && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full shrink-0">
                            <BadgeCheck size={9} /> Verified
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="font-semibold text-slate-800 text-xs mb-1 line-clamp-1">{r.title}</p>

                      {/* Comment */}
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">{r.comment}</p>
                    </div>

                    {/* Bottom: helpful */}
                    <button
                      onClick={() => { const s = new Set(helpful); s.has(r.id) ? s.delete(r.id) : s.add(r.id); setHelpful(s) }}
                      className={`mt-3 flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${helpful.has(r.id)?'text-primary':'text-slate-400 hover:text-slate-600'}`}>
                      <ThumbsUp size={11} /> {r.helpful + (helpful.has(r.id) ? 1 : 0)} helpful
                    </button>
                  </div>
                ))}
              </div>

              {/* View all button */}
              <button onClick={() => setShowReviewModal(true)}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer ml-auto transition-colors">
                View all {product.reviewCount} reviews <ChevronRight size={13} />
              </button>
            </div>

          </div>
        </div>

        {/* ── Shop's Choice ──────────────────────────────────────────────── */}
        <div className="mt-12 animate-fade-in-up">
          <h2 className="font-heading font-bold text-slate-900 text-2xl mb-6 flex items-center gap-2">
            <Award size={20} className="text-gold-bright" /> Shop&apos;s Choice
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {product.shopsChoice.map(item => (
              <Link key={item.id} href={`/products/${item.slug}`}
                className="glass-panel p-4 flex gap-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-white text-[10px] font-extrabold rounded-lg"
                    style={{ background:'linear-gradient(135deg,#CA8A04,#EAB308)' }}>{item.badge}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-slate-900 text-sm leading-snug">{item.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{item.reason}</p>
                  <p className="font-extrabold text-primary text-base mt-2">{formatPrice(item.price)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 self-center shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Similar Products ────────────────────────────────────────────── */}
        <div className="mt-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-slate-900 text-2xl">Similar Products</h2>
            <Link href={`/products?category=${product.category.slug}`}
              className="text-sm font-semibold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x scroll-smooth" style={{ scrollbarWidth:'none' }}>
            {product.similar.map(item => {
              const ep = (item as { salePrice?: number } & typeof item).salePrice ?? item.price
              return (
                <Link key={item.id} href={`/products/${item.slug}`}
                  className="glass-panel p-4 shrink-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200 snap-start"
                  style={{ width: 188 }}>
                  <div className="relative h-36 rounded-xl overflow-hidden mb-3">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="188px" />
                    {(item as { salePrice?: number } & typeof item).salePrice && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-lg">
                        -{discountPercent(item.price, (item as { salePrice?: number } & typeof item).salePrice!)}%
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-xs line-clamp-2 leading-snug">{item.name}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star size={10} className="fill-gold-bright text-gold-bright" />
                    <span className="text-[11px] font-semibold text-slate-600">{item.rating}</span>
                    <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-bold text-slate-900 text-sm">{formatPrice(ep)}</span>
                    {(item as { salePrice?: number } & typeof item).salePrice && (
                      <span className="text-[10px] text-slate-400 line-through">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Reviews Modal ────────────────────────────────────────────── */}
      {showReviewModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 animate-fade-in"
            style={{ background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)' }}
            onClick={() => setShowReviewModal(false)}
          />

          {/* Modal panel */}
          <div
            className="fixed inset-x-4 top-16 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 flex flex-col rounded-3xl overflow-hidden animate-fade-in-up"
            style={{ background:'rgba(255,255,255,0.90)', backdropFilter:'blur(28px) saturate(200%)', border:'1px solid rgba(255,255,255,0.90)', boxShadow:'0 32px 80px rgba(0,0,0,0.18)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">Customer Reviews</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} size={13} className={i<=Math.round(product.rating)?'fill-gold-bright text-gold-bright':'text-slate-200'} />)}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{product.rating}</span>
                  <span className="text-xs text-slate-400">· {product.reviewCount} reviews</span>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable review list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {product.reviews.map(r => (
                <div key={r.id} className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.70)', border:'1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-extrabold text-primary">{r.author[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{r.author}</span>
                          {r.verified && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                              <BadgeCheck size={10} /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1,2,3,4,5].map(i => <Star key={i} size={11} className={i<=r.rating?'fill-gold-bright text-gold-bright':'text-slate-200'} />)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{r.date}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1.5">{r.title}</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{r.comment}</p>
                  <button
                    onClick={() => { const s = new Set(helpful); s.has(r.id) ? s.delete(r.id) : s.add(r.id); setHelpful(s) }}
                    className={`mt-3 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${helpful.has(r.id)?'text-primary':'text-slate-400 hover:text-slate-600'}`}>
                    <ThumbsUp size={12} /> {r.helpful + (helpful.has(r.id) ? 1 : 0)} helpful
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t" style={{ borderColor:'rgba(0,0,0,0.06)' }}>
              <button onClick={() => { setShowReviewModal(false); setShowReviewForm(true) }}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl cursor-pointer transition-colors shadow-lg shadow-primary/20">
                + Write a Review
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Sticky buy bar ─────────────────────────────────────────── */}
      {showSticky && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 animate-fade-in-up"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0"
              style={{ background:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.80)' }}>
              <Image src={product.images[activeImg]} alt={product.name} fill className="object-cover" sizes="48px" />
            </div>
            {/* Product info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-primary font-extrabold">{formatPrice(effectivePrice)}</span>
                {product.colors[selColor]?.name && (
                  <span className="text-xs text-slate-400">· {product.colors[selColor].name} · {product.models[selModel]?.label}</span>
                )}
              </div>
            </div>
            {/* CTA */}
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl text-sm cursor-pointer transition-colors shadow-lg shadow-primary/20 shrink-0"
            >
              <ShoppingCart size={16} />
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

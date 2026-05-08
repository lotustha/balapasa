'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import {
  Phone, User, Truck, CreditCard, Loader2, CheckCircle,
  AlertCircle, Clock, Zap, Package, Store, MapPin, Info,
  ChevronDown, ChevronRight, ArrowRight, Banknote, Tag,
  X as XIcon, Check, Globe, Building2, Home, Mail,
} from 'lucide-react'
import NepalAddressSelector, { type NepalAddress } from '@/components/checkout/NepalAddressSelector'
import WeatherWidget, { type WeatherData } from '@/components/checkout/WeatherWidget'
import type { CoverageOption } from '@/app/api/shipping/coverage/route'

type PaymentMethod = 'COD' | 'PARTIAL_COD' | 'ESEWA' | 'KHALTI'

const EMPTY_ADDRESS: NepalAddress = {
  province: '', district: '', municipality: '', ward: '', street: '', tole: '',
}

const PAYMENT_OPTS: { value: PaymentMethod; label: string; sub: string; borderCls: string; bgCls: string }[] = [
  { value: 'COD',    label: 'Cash on Delivery', sub: 'Pay when delivered',      borderCls: 'border-slate-300',   bgCls: 'bg-slate-50'   },
  { value: 'ESEWA',  label: 'eSewa',            sub: 'Instant digital wallet',  borderCls: 'border-green-400',  bgCls: 'bg-green-50'  },
  { value: 'KHALTI', label: 'Khalti',           sub: 'Fast & secure wallet',    borderCls: 'border-purple-400', bgCls: 'bg-purple-50' },
]

const PROVIDER_META: Record<string, {
  icon: React.ReactNode; badge: string; badgeCls: string; logo?: string
}> = {
  PATHAO:       { icon: <Zap size={14} />,      badge: 'Pathao',         badgeCls: 'bg-orange-100 text-orange-700', logo: '/pathao.webp'      },
  PICKNDROP:    { icon: <Package size={14} />,   badge: 'Pick & Drop',    badgeCls: 'bg-blue-100 text-blue-700',    logo: '/pick_n_drop.webp' },
  STORE_PICKUP: { icon: <Store size={14} />,     badge: 'Self Pickup',    badgeCls: 'bg-slate-100 text-slate-700'  },
  COURIER:      { icon: <Truck size={14} />,     badge: 'Courier',        badgeCls: 'bg-amber-100 text-amber-700'  },
}

// ── Nepal-aware ETA — starts AFTER store confirms ─────────────────────────
// Chain: Confirm → Pack (~20 min) → Rider transit + Nepal-specific delays

const PACK_SECS = 20 * 60

type WeatherD = import('@/components/checkout/WeatherWidget').WeatherData | null

function weatherDelaySecs(w: WeatherD): number {
  if (!w) return 0
  const id    = w.weather[0]?.id ?? 800
  const wind  = w.wind?.speed ?? 0            // m/s — KTM valley gets strong winds
  let delay = 0
  if (id >= 200 && id < 300) delay = 60 * 60  // thunderstorm — significant
  else if (id >= 300 && id < 400) delay = 5 * 60   // drizzle
  else if (id >= 500 && id < 600) delay = 30 * 60  // rain — roads flood in KTM
  else if (id >= 600 && id < 700) delay = 90 * 60  // snow / hail
  else if (id >= 700 && id < 800) delay = 20 * 60  // fog / mist — common in winter KTM
  if (wind > 8) delay += 10 * 60              // strong wind slows riders
  return delay
}

function nepalTrafficDelaySecs(): number {
  const now   = new Date()
  const hour  = now.getHours()
  const month = now.getMonth()   // 0-indexed

  // KTM valley rush hours (worse than generic "rush hour")
  if (hour >= 8  && hour < 10)  return 25 * 60  // morning office rush
  if (hour >= 12 && hour < 13)  return 10 * 60  // lunch hour — many close briefly
  if (hour >= 17 && hour < 20)  return 30 * 60  // evening peak — worst in KTM

  // Monsoon season (Jun–Sep): flooding, road damage, slower riders
  const isMonsoon = month >= 5 && month <= 8
  if (isMonsoon) return 15 * 60

  // Festival pre-season surge: pre-Dashain (Sep–Oct) & pre-Tihar (Oct–Nov)
  const isFestivalRush = month === 8 || month === 9 || month === 10
  if (isFestivalRush) return 10 * 60

  return 0
}

function lateNightNote(): string | null {
  const h = new Date().getHours()
  if (h >= 21 || h < 7) return 'Limited riders after 9 PM — confirm availability'
  return null
}

function etaAfterConfirm(
  transitSecs: number,
  destWeather: WeatherD,
): {
  secs:         number
  packMins:     number
  weatherMins:  number
  trafficMins:  number
  lateNote:     string | null
} {
  const packMins    = PACK_SECS / 60
  const weatherMins = Math.round(weatherDelaySecs(destWeather) / 60)
  const trafficMins = Math.round(nepalTrafficDelaySecs() / 60)
  const secs        = transitSecs + PACK_SECS + weatherDelaySecs(destWeather) + nepalTrafficDelaySecs()
  return { secs, packMins, weatherMins, trafficMins, lateNote: lateNightNote() }
}

function etaRangeLabel(secs: number): string {
  if (secs === 0) return 'Anytime'
  const mins = Math.round(secs / 60)
  const lo   = Math.max(mins - 5, 15)
  const hi   = mins + 20           // wider range — Nepal traffic unpredictable
  if (secs < 3600) return `${lo}–${hi} min`
  return `${Math.floor(secs / 3600)}–${Math.ceil(secs / 3600) + 1} hr`
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items: cartItems, subtotal: cartSubtotal, clearCart, buyNowItem, clearBuyNow } = useCart()

  // Buy Now session — user can toggle between "just this item" or "all cart items"
  const isBuyNow      = buyNowItem !== null
  const hasCartItems  = cartItems.length > 0
  const [checkoutMode, setCheckoutMode] = useState<'buyNow' | 'allCart'>('buyNow')

  // Resolve the effective items list based on mode
  const items = (() => {
    if (!isBuyNow) return cartItems
    if (checkoutMode === 'buyNow') return [buyNowItem!]
    // allCart: merge buyNow item into cart (if same id, bump qty; otherwise prepend)
    const existing = cartItems.find(i => i.id === buyNowItem!.id)
    if (existing) {
      return [
        { ...existing, quantity: existing.quantity + buyNowItem!.quantity },
        ...cartItems.filter(i => i.id !== buyNowItem!.id),
      ]
    }
    return [buyNowItem!, ...cartItems]
  })()

  const subtotal = items.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0)

  const [recipientName,  setName]  = useState('')
  const [recipientPhone, setPhone] = useState('')
  const [recipientEmail, setEmail] = useState('')
  const [address, setAddress] = useState<NepalAddress>(EMPTY_ADDRESS)

  const [options, setOptions]           = useState<CoverageOption[]>([])
  const [selectedOption, setSelected]   = useState<CoverageOption | null>(null)
  const [shippingLoading, setLoading]   = useState(false)
  const [shippingError, setShipErr]     = useState('')
  const abortRef          = useRef<AbortController | null>(null)
  // Tracks the last province:district:municipality for which coverage was fetched.
  // Prevents re-fetching when only street/tole/ward changes.
  const lastCoverageKey   = useRef('')

  // Weather
  const [weatherData,    setWeatherData]    = useState<{ store: WeatherData | null; destination: WeatherData | null } | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const lastWeatherKey = useRef('')

  async function fetchWeather(municipality: string, district: string) {
    const key = `${municipality}:${district}`
    if (key === lastWeatherKey.current) return
    lastWeatherKey.current = key
    setWeatherLoading(true)
    try {
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ municipality, district }),
      })
      if (!res.ok) return
      setWeatherData(await res.json())
    } catch { /* weather is non-critical — silently ignore */ } finally {
      setWeatherLoading(false)
    }
  }

  const [payment, setPayment]         = useState<PaymentMethod>('COD')
  const [partialCod, setPartialCod]   = useState(false)
  const [advancePct, setAdvancePct]   = useState(30)   // % to pay now
  const [advanceMethod, setAdvanceMethod] = useState<'ESEWA'|'KHALTI'>('ESEWA')
  const [placing, setPlacing]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const errorDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(msg: string) {
    setCheckoutError(msg)
    if (errorDismissRef.current) clearTimeout(errorDismissRef.current)
    errorDismissRef.current = setTimeout(() => setCheckoutError(''), 9000)
  }
  useEffect(() => () => { if (errorDismissRef.current) clearTimeout(errorDismissRef.current) }, [])

  // Coupon
  const [coupon,         setCoupon]         = useState('')
  const [couponApplied,  setCouponApplied]  = useState(false)
  const [couponError,    setCouponError]    = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)

  const VALID_COUPONS: Record<string, { pct: number; label: string }> = {
    BALAPASA10: { pct: 10, label: '10% off' },
    WELCOME:    { pct:  5, label: '5% off'  },
  }
  function applyCoupon() {
    const code = coupon.trim().toUpperCase()
    if (!code) { setCouponError('Enter a promo code'); return }
    const c = VALID_COUPONS[code]
    if (!c) { setCouponError('Invalid or expired code'); setCouponDiscount(0); setCouponApplied(false); return }
    setCouponDiscount(Math.round(subtotal * c.pct / 100))
    setCouponApplied(true)
    setCouponError('')
  }
  function removeCoupon() { setCoupon(''); setCouponApplied(false); setCouponDiscount(0); setCouponError('') }

  const [freeThreshold, setFreeThreshold] = useState(5000)
  useEffect(() => {
    fetch('/api/store-config').then(r => r.json())
      .then(d => setFreeThreshold(d.FREE_DELIVERY_THRESHOLD ?? 5000))
      .catch(() => {})
  }, [])
  const FREE_DELIVERY_THRESHOLD = freeThreshold
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD
  // If order qualifies for free delivery, store absorbs the delivery cost
  const deliveryCharge = freeDelivery ? 0 : (selectedOption?.charge ?? 0)
  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount)

  const fetchCoverage = useCallback(async (addr: NepalAddress) => {
    if (!addr.province || !addr.district || !addr.municipality) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true); setShipErr(''); setOptions([]); setSelected(null)

    try {
      const res = await fetch('/api/shipping/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({ ...addr, subtotal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Coverage check failed')

      const opts: CoverageOption[] = data.options ?? []
      setOptions(opts)
      // Auto-select cheapest non-pickup option, or cheapest overall
      const delivery = opts.find(o => o.provider !== 'STORE_PICKUP')
      setSelected(delivery ?? opts[0] ?? null)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setShipErr('Could not load shipping options. Please check your address.')
    } finally {
      setLoading(false)
    }
  }, [subtotal])

  /** Only fetch if the coverage-relevant combo (province:district:municipality) changed */
  function maybeFetchCoverage(addr: NepalAddress) {
    if (!addr.province || !addr.district || !addr.municipality) return
    const key = `${addr.province}:${addr.district}:${addr.municipality}`
    if (key === lastCoverageKey.current) return   // street/tole changed — skip
    lastCoverageKey.current = key
    fetchCoverage(addr)
  }

  function handleAddressComplete(addr: NepalAddress) {
    setAddress(addr)
    maybeFetchCoverage(addr)
    if (addr.municipality) fetchWeather(addr.municipality, addr.district)
  }

  function handleAddressChange(addr: NepalAddress) {
    setAddress(addr)
    // Reset shipping UI when coverage-relevant fields change
    const keyChanged =
      addr.province !== address.province ||
      addr.district !== address.district ||
      addr.municipality !== address.municipality
    if (keyChanged) {
      setOptions([]); setSelected(null)
      maybeFetchCoverage(addr)  // key tracking handled inside
      if (!addr.municipality) { setWeatherData(null); lastWeatherKey.current = '' }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.street.trim() || !address.tole.trim()) {
      showError('Please fill in Street / Road and Tole / Locality before placing your order.')
      return
    }
    if (!selectedOption) return
    setPlacing(true)
    try {
      const fullAddress = [
        address.tole, address.street,
        address.ward ? `Ward ${address.ward}` : '',
        address.municipality, address.district, address.province,
      ].filter(Boolean).join(', ')

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items, subtotal, deliveryCharge, total,
          paymentMethod: (payment === 'COD' && partialCod) ? 'PARTIAL_COD' : payment,
          advancePaid:   (payment === 'COD' && partialCod) ? Math.round(total * advancePct / 100) : undefined,
          codAmount:     (payment === 'COD' && partialCod) ? Math.round(total * (100 - advancePct) / 100) : undefined,
          advanceMethod: (payment === 'COD' && partialCod) ? advanceMethod : undefined,
          shippingOption: selectedOption.name,
          shippingProvider: selectedOption.provider,
          shippingMeta: selectedOption.meta,
          name: recipientName, phone: recipientPhone, email: recipientEmail || undefined,
          address: fullAddress, city: address.municipality,
          house: address.ward ? `Ward ${address.ward}` : '',
          road: address.street,
          lat: typeof (selectedOption?.meta as Record<string,unknown>)?.receiverLat === 'number'
            ? (selectedOption!.meta as Record<string,unknown>).receiverLat : undefined,
          lng: typeof (selectedOption?.meta as Record<string,unknown>)?.receiverLng === 'number'
            ? (selectedOption!.meta as Record<string,unknown>).receiverLng : undefined,
        }),
      })
      const data = await res.json()

      // Stop immediately on API error — never show "Order placed" for a failed request
      if (!res.ok) {
        showError(data.error ?? 'Order could not be created. Please try again.')
        setPlacing(false)
        return
      }

      if (payment === 'ESEWA' && data.esewaData) {
        const f = document.createElement('form')
        f.method = 'POST'; f.action = data.esewaUrl
        Object.entries(data.esewaData).forEach(([k, v]) => {
          const i = document.createElement('input')
          i.type = 'hidden'; i.name = k; i.value = v as string
          f.appendChild(i)
        })
        document.body.appendChild(f); f.submit(); return
      }
      if (payment === 'KHALTI' && data.paymentUrl) {
        window.location.href = data.paymentUrl; return
      }

      // If we're here for eSewa/Khalti but no redirect data → unexpected API response
      if (payment === 'ESEWA' || payment === 'KHALTI') {
        showError('Payment gateway error. Please try again or choose a different payment method.')
        setPlacing(false)
        return
      }

      // Clear the right sessions based on what was purchased
      if (isBuyNow) {
        clearBuyNow()
        if (checkoutMode === 'allCart') clearCart()
      } else {
        clearCart()
      }
      setSuccess(true)
    } catch {}
    setPlacing(false)
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg,#EEF2FF,#F0FDF4)' }}>
        <div className="text-center max-w-md w-full animate-bounce-in glass-card p-12">
          <div className="w-20 h-20 bg-primary-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-primary" />
          </div>
          <h2 className="font-heading font-extrabold text-3xl text-slate-900 mb-3">Order Placed!</h2>
          <p className="text-slate-500 mb-8">Thank you! We&apos;ll confirm your order shortly.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer">
            Continue Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-6 pb-8 relative"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 35%, #FFF0F9 65%, #F0FDF4 100%)' }}>

      {/* ── Colorful blobs — same as homepage ─────────────────────── */}
      {/* ── Error toast ───────────────────────────────────── */}
      <div
        className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 transition-all duration-300"
        style={{
          opacity:    checkoutError ? 1 : 0,
          transform:  checkoutError ? 'translate(-50%, 0)' : 'translate(-50%, -16px)',
          pointerEvents: checkoutError ? 'auto' : 'none',
        }}
      >
        <div
          className="flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border border-red-200/80"
          style={{
            background:     'rgba(255,240,240,0.97)',
            backdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700 leading-snug">Something went wrong</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed break-words">{checkoutError}</p>
          </div>
          <button
            type="button"
            onClick={() => setCheckoutError('')}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <XIcon size={13} />
          </button>
        </div>
        {/* Progress bar — shrinks over 9s */}
        {checkoutError && (
          <div className="h-0.5 mx-2 rounded-full bg-red-200 overflow-hidden -mt-0.5">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ animation: 'shrink-bar 9s linear forwards' }}
            />
          </div>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 -left-20 w-[400px] h-[400px]"
          style={{ background: '#8B5CF6', opacity: 0.22, animationDelay: '0s' }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute top-1/4 -right-10 w-[320px] h-[320px]"
          style={{ background: '#06B6D4', opacity: 0.18, animationDelay: '2s' }} />
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-20 left-1/3 w-[360px] h-[360px]"
          style={{ background: '#EC4899', opacity: 0.16, animationDelay: '1s' }} />
        <div className="blob animate-blob-morph animate-blob-float-a absolute top-1/2 right-1/4 w-[260px] h-[260px]"
          style={{ background: '#10B981', opacity: 0.15, animationDelay: '3.5s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Buy Now session — only show toggle when cart also has items */}
        {isBuyNow && hasCartItems && (
          <div className="mt-4 mb-5 glass-panel p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-gold shrink-0" />
              <p className="text-sm font-bold text-slate-800">Quick Checkout</p>
              <button type="button" onClick={() => { clearBuyNow(); router.push('/cart') }}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 cursor-pointer underline">
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Buy this item only */}
              <button
                type="button"
                onClick={() => setCheckoutMode('buyNow')}
                className={`flex flex-col gap-1 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  checkoutMode === 'buyNow'
                    ? 'border-primary bg-primary-bg'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">This item only</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checkoutMode === 'buyNow' ? 'border-primary' : 'border-slate-300'}`}>
                    {checkoutMode === 'buyNow' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{buyNowItem!.name}</p>
                <p className="text-xs font-bold text-primary">{formatPrice(buyNowItem!.salePrice ?? buyNowItem!.price)}</p>
              </button>

              {/* Include all cart items */}
              <button
                type="button"
                onClick={() => setCheckoutMode('allCart')}
                disabled={!hasCartItems}
                className={`flex flex-col gap-1 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  !hasCartItems
                    ? 'border-slate-100 opacity-40 cursor-not-allowed'
                    : checkoutMode === 'allCart'
                    ? 'border-primary bg-primary-bg'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {hasCartItems ? `+ ${cartItems.length} cart item${cartItems.length > 1 ? 's' : ''}` : 'Cart is empty'}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checkoutMode === 'allCart' ? 'border-primary' : 'border-slate-300'}`}>
                    {checkoutMode === 'allCart' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {hasCartItems ? 'Checkout everything together' : 'Add items to cart first'}
                </p>
                {hasCartItems && (
                  <p className="text-xs font-bold text-primary">
                    {formatPrice(cartItems.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0) + (buyNowItem!.salePrice ?? buyNowItem!.price) * buyNowItem!.quantity)}
                  </p>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Page header — mt-4 ensures it sits below the floating navbar */}
        <div className={`${isBuyNow ? 'mt-0' : 'mt-4'} mb-8 animate-fade-in-up`}>
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-1">Order</p>
          <h1 className="font-heading font-extrabold text-3xl text-slate-900">Checkout</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-7">

            {/* ── Left column ─────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* ── Recipient ─────────────────────────────────────── */}
              <div className="glass-card p-6 animate-fade-in-up">
                <h2 className="font-heading font-bold text-slate-900 mb-5 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center shrink-0">1</span>
                  <User size={16} className="text-primary" /> Recipient Details
                </h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={recipientName} onChange={e => setName(e.target.value)}
                          placeholder="Your full name" required
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Phone Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="tel" value={recipientPhone} onChange={e => setPhone(e.target.value)}
                          placeholder="98XXXXXXXX" required
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Email — full width, optional but recommended */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                      Email Address
                      <span className="text-[10px] text-slate-400 font-normal normal-case tracking-normal">
                        for order confirmation &amp; receipt
                      </span>
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border border-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Nepal Address ──────────────────────────────────── */}
              <div className="glass-card p-6 animate-fade-in-up delay-100">
                <h2 className="font-heading font-bold text-slate-900 mb-5 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center shrink-0">2</span>
                  <MapPin size={16} className="text-primary" /> Delivery Address
                </h2>
                <NepalAddressSelector
                  value={address}
                  onChange={handleAddressChange}
                  onComplete={handleAddressComplete}
                />
              </div>

              {/* ── Shipping Options ───────────────────────────────── */}
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <h2 className="font-heading font-bold text-slate-900 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center shrink-0">3</span>
                    <Truck size={16} className="text-primary" /> Shipping Options
                  </h2>
                  {shippingLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 size={13} className="animate-spin" /> Checking coverage…
                    </span>
                  )}
                  {!shippingLoading && options.length > 0 && (
                    <span className="text-xs text-slate-400">{options.length} options found</span>
                  )}
                </div>

                <div className="px-6 pb-6 pt-4">
                  {/* Placeholder — step-by-step address guide */}
                  {!shippingLoading && options.length === 0 && !shippingError && (() => {
                    const steps = [
                      { n: 1, label: 'Province',     icon: Globe,      done: !!address.province,     value: address.province     },
                      { n: 2, label: 'District',     icon: Building2,  done: !!address.district,     value: address.district     },
                      { n: 3, label: 'Municipality', icon: Home,       done: !!address.municipality, value: address.municipality },
                    ]
                    const nextStep = steps.find(s => !s.done)
                    return (
                      <div className="space-y-5">
                        {/* Step pills */}
                        <div className="flex items-center gap-1">
                          {steps.map((s, i) => {
                            const Icon = s.icon
                            const isNext = nextStep?.n === s.n
                            return (
                              <div key={s.n} className="flex items-center flex-1 min-w-0">
                                <div className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl text-center border transition-all duration-300
                                  ${s.done
                                    ? 'bg-primary-bg border-primary/25 shadow-sm'
                                    : isNext
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200/60'
                                    : 'bg-slate-50 border-slate-100'
                                  }`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                    ${s.done ? 'bg-primary text-white' : isNext ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-300'}`}>
                                    {s.done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                                  </div>
                                  <p className={`text-[9px] font-extrabold uppercase tracking-widest leading-none
                                    ${s.done ? 'text-primary' : isNext ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {s.label}
                                  </p>
                                  {s.done && s.value && (
                                    <p className="text-[10px] text-slate-600 font-semibold truncate w-full px-1 leading-none">{s.value}</p>
                                  )}
                                  {isNext && !s.done && (
                                    <p className="text-[9px] text-indigo-400 font-bold leading-none">← Select</p>
                                  )}
                                </div>
                                {i < steps.length - 1 && (
                                  <ChevronRight size={13} className={`shrink-0 mx-0.5 ${steps[i + 1].done || s.done ? 'text-primary' : 'text-slate-200'}`} />
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Delivery partners preview */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                            <Truck size={11} /> Partners we&apos;ll check
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                              <div className="relative w-[46px] h-[14px]">
                                <Image src="/pathao.webp" alt="Pathao" fill className="object-contain object-left" sizes="46px" />
                              </div>
                              <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-full">Fast</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                              <div className="relative w-[52px] h-[14px]">
                                <Image src="/pick_n_drop.webp" alt="Pick & Drop" fill className="object-contain object-left" sizes="52px" />
                              </div>
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">Reliable</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                              <Banknote size={13} className="text-slate-500" />
                              <span className="text-[10px] text-slate-600 font-semibold">COD</span>
                              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full">Most areas</span>
                            </div>
                          </div>
                        </div>

                        {/* Context-sensitive hint */}
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                          <Info size={13} className="text-indigo-400 shrink-0" />
                          <p className="text-xs text-indigo-600">
                            {!address.province && 'Start by selecting your Province in the address form above.'}
                            {address.province && !address.district && <>Province set. Now select your <strong>District</strong> to continue.</>}
                            {address.province && address.district && !address.municipality && <>Almost there! Select your <strong>Municipality</strong> to unlock delivery options.</>}
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Skeleton */}
                  {shippingLoading && (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-[72px] rounded-2xl skeleton" />
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {shippingError && !shippingLoading && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                      <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-red-600 font-semibold">{shippingError}</p>
                        <button type="button" onClick={() => fetchCoverage(address)}
                          className="text-xs text-red-400 underline mt-1 cursor-pointer hover:text-red-600">
                          Try again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Free delivery banner inside shipping section */}
                  {!shippingLoading && options.length > 0 && freeDelivery && (
                    <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-2xl bg-green-50 border border-green-200">
                      <Truck size={14} className="text-green-600 shrink-0" />
                      <p className="text-xs font-bold text-green-700">
                        Free delivery unlocked — orders over {formatPrice(FREE_DELIVERY_THRESHOLD)} ship free!
                      </p>
                    </div>
                  )}

                  {/* Options */}
                  {!shippingLoading && options.length > 0 && (
                    <div className="space-y-2.5">
                      {options.map((opt, i) => {
                        const isSelected    = selectedOption?.id === opt.id
                        const meta          = PROVIDER_META[opt.provider] ?? PROVIDER_META.COURIER
                        const deliveryOpts  = options.filter(o => o.provider !== 'STORE_PICKUP' && o.dropoff_eta > 0)
                        const isCheapest    = i === 0
                        const isFastest     = deliveryOpts.length > 0 && opt.dropoff_eta === Math.min(...deliveryOpts.map(o => o.dropoff_eta))
                        const isRecommended = (() => {
                          if (isCheapest || isFastest || opt.provider === 'STORE_PICKUP') return false
                          const maxC = Math.max(...deliveryOpts.map(o => o.charge))
                          const maxE = Math.max(...deliveryOpts.map(o => o.dropoff_eta))
                          const score = (o: typeof opt) =>
                            (1 - o.charge / (maxC || 1)) * 50 + (1 - o.dropoff_eta / (maxE || 1)) * 50
                          const best = [...deliveryOpts].sort((a, b) => score(b) - score(a))[0]
                          return best?.id === opt.id
                        })()
                        const badges = [
                          isCheapest    && { label: 'Best Price', cls: 'bg-primary text-white' },
                          isFastest     && opt.provider !== 'STORE_PICKUP' && { label: 'Fastest', cls: 'bg-accent text-white' },
                          isRecommended && { label: 'Best Value', cls: 'bg-blue-500 text-white' },
                        ].filter(Boolean) as { label: string; cls: string }[]

                        return (
                          <label
                            key={opt.id}
                            className="relative flex items-center gap-4 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden"
                            style={{
                              background: isSelected ? 'rgba(22,163,74,0.04)' : 'rgba(255,255,255,0.80)',
                              borderColor: isSelected ? '#16A34A' : 'rgba(0,0,0,0.08)',
                              boxShadow: isSelected ? '0 0 0 1px #16A34A' : '0 1px 4px rgba(0,0,0,0.04)',
                            }}
                            onClick={() => setSelected(opt)}
                          >
                            {/* Left accent strip when selected */}
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                            )}

                            {/* Provider logo / icon */}
                            <div className="shrink-0 w-[100px] h-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                              {meta.logo ? (
                                <div className="relative w-full h-full p-2">
                                  <Image src={meta.logo} alt={meta.badge} fill className="object-contain" sizes="100px" />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-slate-500 scale-150">{meta.icon}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{meta.badge}</span>
                                </div>
                              )}
                            </div>

                            {/* Service info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-slate-900">{opt.name}</p>
                                {badges.map(b => (
                                  <span key={b.label} className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${b.cls}`}>
                                    {b.label}
                                  </span>
                                ))}
                              </div>
                              {opt.dropoff_eta > 0 && (() => {
                                const { secs, packMins, weatherMins, trafficMins, lateNote } = etaAfterConfirm(opt.dropoff_eta, weatherData?.destination ?? null)
                                const extras = [
                                  packMins    > 0 ? `${packMins} min packing` : '',
                                  trafficMins > 0 ? `${trafficMins} min traffic` : '',
                                  weatherMins > 0 ? `${weatherMins} min weather` : '',
                                ].filter(Boolean).join(' · ')
                                return (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                                      <Clock size={10} />
                                      <span>{etaRangeLabel(secs)}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">after store confirms</span>
                                    </span>
                                    {extras && (
                                      <span className="text-[10px] text-slate-400">incl. {extras}</span>
                                    )}
                                    {lateNote && (
                                      <span className="text-[10px] text-amber-600 font-semibold">{lateNote}</span>
                                    )}
                                  </div>
                                )
                              })()}
                              </div>
                            </div>

                            {/* Price + custom radio */}
                            <div className="flex items-center gap-3 shrink-0">
                              {freeDelivery && opt.charge > 0 && opt.provider !== 'STORE_PICKUP' ? (
                                <div className="text-right">
                                  <p className="font-extrabold text-base text-green-600">FREE</p>
                                  <p className="text-[10px] text-slate-400 line-through leading-none">{formatPrice(opt.charge)}</p>
                                </div>
                              ) : (
                                <p className={`font-extrabold text-base ${opt.charge === 0 ? 'text-green-600' : isSelected ? 'text-primary' : 'text-slate-800'}`}>
                                  {opt.charge === 0 ? 'FREE' : formatPrice(opt.charge)}
                                </p>
                              )}
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'border-primary' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                              </div>
                            </div>
                          </label>
                        )
                      })}

                      <p className="text-xs text-slate-400 pt-1 flex items-center gap-1.5">
                        <Info size={11} />
                        Prices include all applicable charges. Select store pickup for free collection.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Weather ───────────────────────────────────────── */}
              {weatherLoading && (
                <div className="glass-card p-5 flex items-center gap-3 animate-fade-in">
                  <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Checking weather conditions…</p>
                    <p className="text-xs text-slate-400">Fetching live data for your delivery area</p>
                  </div>
                </div>
              )}
              {!weatherLoading && weatherData && (
                <WeatherWidget store={weatherData.store} destination={weatherData.destination} />
              )}

              {/* ── Payment ───────────────────────────────────────── */}
              <div className="glass-card p-6">
                <h2 className="font-heading font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" /> Payment Method
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {PAYMENT_OPTS.map(opt => (
                    <label key={opt.value}
                      className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        payment === opt.value ? `${opt.borderCls} ${opt.bgCls}` : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <input type="radio" name="payment" value={opt.value}
                        checked={payment === opt.value} onChange={() => setPayment(opt.value)} className="sr-only" />

                      {/* Payment logo / icon */}
                      <div className="w-full flex items-center justify-center" style={{ height: 40 }}>
                        {opt.value === 'ESEWA' && (
                          <div className="relative w-[90px] h-9">
                            <Image src="/esewa.png" alt="eSewa" fill className="object-contain" sizes="90px" />
                          </div>
                        )}
                        {opt.value === 'KHALTI' && (
                          <div className="relative w-[80px] h-9">
                            <Image src="/khalti.png" alt="Khalti" fill className="object-contain" sizes="80px" />
                          </div>
                        )}
                        {opt.value === 'COD' && (
                          <Banknote size={34} className="text-slate-500" />
                        )}
                      </div>

                      <span className="font-bold text-xs text-slate-700 text-center leading-tight">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 text-center">{opt.sub}</span>
                      {payment === opt.value && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {payment === 'ESEWA'  && <p className="mt-3 text-xs text-slate-500 bg-green-50 rounded-xl px-4 py-2.5">You&apos;ll be redirected to eSewa after placing your order.</p>}
                {payment === 'KHALTI' && <p className="mt-3 text-xs text-slate-500 bg-purple-50 rounded-xl px-4 py-2.5">You&apos;ll be redirected to Khalti after placing your order.</p>}
                {payment === 'COD' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5">Pay in cash when your delivery arrives at your door.</p>

                    {/* Partial payment toggle */}
                    <label className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-bold text-amber-800">Pay advance now</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">Secure your order with a partial payment, rest on delivery</p>
                      </div>
                      <button type="button" onClick={() => setPartialCod(p => !p)}
                        className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 ml-3 cursor-pointer ${partialCod ? 'bg-amber-500' : 'bg-slate-200'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${partialCod ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </label>

                    {partialCod && (
                      <div className="px-4 py-4 bg-white border border-amber-200 rounded-xl space-y-4">
                        {/* Advance percentage selector */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-600">Advance amount</label>
                            <span className="text-sm font-extrabold text-amber-700">NPR {Math.round(total * advancePct / 100).toLocaleString()}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {[20, 30, 50].map(pct => (
                              <button key={pct} type="button" onClick={() => setAdvancePct(pct)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${advancePct === pct ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                                {pct}% — NPR {Math.round(total * pct / 100).toLocaleString()}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">
                            Pay <strong>NPR {Math.round(total * advancePct / 100).toLocaleString()}</strong> now +{' '}
                            <strong>NPR {Math.round(total * (100 - advancePct) / 100).toLocaleString()}</strong> on delivery
                          </p>
                        </div>

                        {/* Advance payment method */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-2 block">Pay advance via</label>
                          <div className="flex gap-2">
                            {(['ESEWA', 'KHALTI'] as const).map(m => (
                              <label key={m} className={`flex-1 flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${advanceMethod === m ? (m==='ESEWA'?'border-green-400 bg-green-50':'border-purple-400 bg-purple-50') : 'border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="advanceMethod" value={m} checked={advanceMethod === m} onChange={() => setAdvanceMethod(m)} className="sr-only" />
                                <div className="relative" style={{ width: m==='ESEWA'?70:60, height:28 }}>
                                  <Image src={m==='ESEWA'?'/esewa.png':'/khalti.png'} alt={m} fill className="object-contain" sizes="70px" />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-500 shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                          <p className="text-[11px] text-amber-800">You&apos;ll be redirected to {advanceMethod === 'ESEWA' ? 'eSewa' : 'Khalti'} to complete the advance payment.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Summary ─────────────────────────────────── */}
            <div>
              <div className="glass-card p-6 sticky top-20">
                <h2 className="font-heading font-bold text-slate-900 mb-5">Order Summary</h2>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                        <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">× {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-900 shrink-0">
                        {formatPrice((item.salePrice ?? item.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coupon input */}
                <div className="mb-4">
                  {couponApplied ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-green-50 border border-green-200">
                      <Tag size={13} className="text-green-600 shrink-0" />
                      <span className="flex-1 text-sm font-bold text-green-700">{coupon.toUpperCase()} applied!</span>
                      <button type="button" onClick={removeCoupon}
                        className="text-green-500 hover:text-green-700 transition-colors cursor-pointer">
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={coupon}
                            onChange={e => { setCoupon(e.target.value); setCouponError('') }}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                            placeholder="Promo code"
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={applyCoupon}
                          className="px-4 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-red-500 font-medium px-1">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-start justify-between text-slate-500">
                    <div className="flex flex-col gap-1">
                      <span>Delivery</span>
                      {selectedOption && (() => {
                        const m = PROVIDER_META[selectedOption.provider]
                        return m?.logo ? (
                          <div className="relative" style={{ width: selectedOption.provider === 'PATHAO' ? 46 : 52, height: 14 }}>
                            <Image src={m.logo} alt={m.badge} fill className="object-contain object-left" sizes="60px" />
                          </div>
                        ) : m?.badge ? (
                          <span className="text-[10px] text-slate-400">via {m.badge}</span>
                        ) : null
                      })()}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${freeDelivery ? 'text-green-600' : selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
                        {freeDelivery
                          ? 'FREE'
                          : selectedOption
                          ? selectedOption.charge === 0 ? 'FREE' : formatPrice(selectedOption.charge)
                          : '—'}
                      </span>
                      {freeDelivery && selectedOption && selectedOption.charge > 0 && (
                        <p className="text-[10px] text-slate-400 line-through">{formatPrice(selectedOption.charge)}</p>
                      )}
                    </div>
                  </div>
                  {/* Coupon discount */}
                  {couponApplied && couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1.5"><Tag size={12} /> Promo discount</span>
                      <span className="font-semibold">− {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {/* Free delivery badge */}
                  {freeDelivery && selectedOption && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                      <Truck size={12} className="text-green-600 shrink-0" />
                      <p className="text-[11px] font-bold text-green-700">Free delivery applied on orders over {formatPrice(FREE_DELIVERY_THRESHOLD)}</p>
                    </div>
                  )}
                  {/* VAT — shown only when a delivery option is selected */}
                  {selectedOption && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>VAT (13%) incl.</span>
                      <span>{formatPrice(Math.round(total - total / 1.13))}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-3 flex justify-between">
                    <span className="font-heading font-bold text-slate-900">Total</span>
                    <span className="font-heading font-extrabold text-xl text-primary">
                      {selectedOption ? formatPrice(total) : '—'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={placing || items.length === 0 || !selectedOption || !recipientName || !recipientPhone}
                  className="w-full mt-5 flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/20"
                >
                  {placing ? (
                    <><Loader2 size={18} className="animate-spin" /> Processing…</>
                  ) : !selectedOption ? (
                    'Select delivery option'
                  ) : (
                    `Place Order — ${formatPrice(total)}`
                  )}
                </button>

                {!address.municipality && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    Select your address to unlock delivery options
                  </p>
                )}
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

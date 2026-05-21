'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, Clock, ArrowRight, Flame } from 'lucide-react'
import { formatPrice, discountPercent } from '@/lib/utils'
import { getClaimedPercent } from '@/lib/sale-status'

interface Deal {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  salePriceExpiresAt: string | null
  stock: number
  saleInitialStock: number | null
  maxPerCustomerOnSale: number | null
  images: string[]
  brand: string | null
}

function useCountdown(iso: string | null) {
  const [t, setT] = useState({ h: '00', m: '00', s: '00', done: !iso })
  useEffect(() => {
    if (!iso) { setT({ h: '00', m: '00', s: '00', done: true }); return }
    const target = new Date(iso).getTime()
    const tick = () => {
      const d = target - Date.now()
      if (d <= 0) {
        setT({ h: '00', m: '00', s: '00', done: true })
        return
      }
      setT({
        h: String(Math.floor(d / 3600000)).padStart(2, '0'),
        m: String(Math.floor((d % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((d % 60000) / 1000)).padStart(2, '0'),
        done: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [iso])
  return t
}

export default function HeroDealOfTheDay() {
  const [deal, setDeal] = useState<Deal | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/deals', { cache: 'no-store' })
      const d = await res.json()
      setDeal(d.deal ?? null)
    } catch { /* swallow — card just stays hidden */ }
  }

  useEffect(() => { load() }, [])

  const { h, m, s, done } = useCountdown(deal?.salePriceExpiresAt ?? null)

  // Sale just expired in front of the user — refetch so the next DOTD (if any)
  // appears, or this card disappears cleanly.
  useEffect(() => {
    if (deal?.salePriceExpiresAt && done) load()
  }, [done, deal?.salePriceExpiresAt])

  if (!deal || deal.salePrice == null) return null
  // Hide the card the moment the countdown reaches zero — the refetch above
  // will surface the next live DOTD (or null) on the next render.
  if (deal.salePriceExpiresAt && done) return null

  const claimed = getClaimedPercent({ stock: deal.stock, saleInitialStock: deal.saleInitialStock })
  const pct = discountPercent(deal.price, deal.salePrice)

  return (
    <section className="relative py-12 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 left-1/4 w-[28rem] h-[28rem]"
          style={{ background: '#F59E0B', opacity: 0.20 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute -bottom-20 right-1/4 w-80 h-80"
          style={{ background: '#EC4899', opacity: 0.15, animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <Link
          href={`/products/${deal.slug}`}
          className="group block glass-card rounded-3xl overflow-hidden animate-fade-in-up shadow-xl shadow-amber-500/10"
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image side */}
            <div className="relative aspect-square md:aspect-auto md:min-h-[420px] bg-slate-50">
              {deal.images?.[0] ? (
                <Image
                  src={deal.images[0]}
                  alt={deal.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width:768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-pink-100">
                  <Zap size={64} className="text-amber-400" />
                </div>
              )}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#EC4899)' }}>
                <Flame size={13} className="fill-white" /> Deal of the Day
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur text-amber-700 text-xs font-extrabold shadow">
                -{pct}%
              </div>
            </div>

            {/* Copy side */}
            <div className="p-7 sm:p-10 flex flex-col justify-center gap-5">
              {deal.brand && (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{deal.brand}</p>
              )}
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-tight line-clamp-3">
                {deal.name}
              </h2>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl text-primary">
                  {formatPrice(deal.salePrice)}
                </span>
                <span className="text-slate-400 line-through text-sm sm:text-base md:text-lg">{formatPrice(deal.price)}</span>
                <span className="text-emerald-600 font-bold text-xs sm:text-sm">Save {formatPrice(deal.price - deal.salePrice)}</span>
              </div>

              {/* Countdown */}
              {deal.salePriceExpiresAt && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock size={13} /> Ends in
                  </span>
                  <div className="flex items-center gap-1 font-extrabold tabular-nums">
                    <span className="px-2 py-1 rounded-lg glass-md text-slate-900 text-sm">{h}h</span>
                    <span className="px-2 py-1 rounded-lg glass-md text-slate-900 text-sm">{m}m</span>
                    <span className="px-2 py-1 rounded-lg glass-md text-slate-900 text-sm">{s}s</span>
                  </div>
                </div>
              )}

              {/* Real claimed bar — only when we have a baseline */}
              {claimed != null && (
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="font-semibold text-amber-700">{claimed}% claimed</span>
                    <span className="text-slate-400">{deal.stock} left at this price</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${claimed}%`,
                        background: 'linear-gradient(90deg,#F59E0B,#EC4899)',
                      }}
                    />
                  </div>
                </div>
              )}

              {deal.maxPerCustomerOnSale != null && (
                <p className="text-[11px] font-semibold text-amber-700">
                  Limit {deal.maxPerCustomerOnSale} per customer
                </p>
              )}

              <div className="flex items-center gap-2 text-sm font-bold text-primary mt-2 group-hover:gap-3 transition-all">
                Grab this deal <ArrowRight size={15} />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}

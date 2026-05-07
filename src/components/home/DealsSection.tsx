'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, ArrowRight, Clock, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const DEAL_END = new Date(Date.now() + 24 * 60 * 60 * 1000)

// Colour pairs for each deal card (cycles if more than 3 deals)
const BLOBS = [
  { a: '#8B5CF6', b: '#EC4899' },
  { a: '#EC4899', b: '#F472B6' },
  { a: '#06B6D4', b: '#6366F1' },
  { a: '#10B981', b: '#06B6D4' },
]

interface DealProduct {
  id: string; name: string; slug: string
  price: number; salePrice: number; images: string[]; stock: number
}

function useCountdown(target: Date) {
  const [t, setT] = useState({ h: '00', m: '00', s: '00' })
  useEffect(() => {
    const tick = () => {
      const d = Math.max(0, target.getTime() - Date.now())
      setT({
        h: String(Math.floor(d / 3600000)).padStart(2, '0'),
        m: String(Math.floor((d % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((d % 60000) / 1000)).padStart(2, '0'),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return t
}

function Digit({ val, label }: { val: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 glass-md rounded-2xl flex items-center justify-center font-heading font-extrabold text-2xl text-slate-900 tabular-nums shadow-sm">
        {val}
      </div>
      <span className="text-[10px] text-slate-400 uppercase mt-1.5 tracking-wider">{label}</span>
    </div>
  )
}

export default function DealsSection() {
  const { h, m, s } = useCountdown(DEAL_END)
  const [deals, setDeals] = useState<DealProduct[]>([])

  useEffect(() => {
    // Fetch products that have a sale price, sorted by biggest discount
    fetch('/api/products?sort=newest&limit=20')
      .then(r => r.json())
      .then(data => {
        const products = (data.products ?? data ?? []) as DealProduct[]
        // Filter to only products with salePrice and pick top 3 by discount %
        const withSale = products
          .filter((p: DealProduct) => p.salePrice && p.salePrice < p.price)
          .sort((a, b) => {
            const discA = (a.price - a.salePrice) / a.price
            const discB = (b.price - b.salePrice) / b.price
            return discB - discA
          })
          .slice(0, 3)
        setDeals(withSale)
      })
      .catch(() => {})
  }, [])

  if (deals.length === 0) return null

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFF0FC 0%, #EEF2FF 50%, #F0FDF4 100%)' }}>
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 left-1/4 w-96 h-96" style={{ background: '#EC4899', opacity: 0.18, animationDelay: '0s' }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute bottom-0 right-1/4 w-80 h-80" style={{ background: '#8B5CF6', opacity: 0.15, animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full mb-3 shadow-sm">
              <Zap size={13} className="fill-gold-bright text-gold-bright" />
              <span className="text-xs font-bold text-slate-700">Flash Deals</span>
            </div>
            <h2 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900">
              Deals of the <span className="gradient-text">Day</span>
            </h2>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-400 text-sm mr-2">
              <Clock size={14} /> Ends in
            </div>
            <div className="flex items-center gap-1.5">
              <Digit val={h} label="hrs" />
              <span className="font-extrabold text-slate-300 text-2xl -mt-5">:</span>
              <Digit val={m} label="min" />
              <span className="font-extrabold text-slate-300 text-2xl -mt-5">:</span>
              <Digit val={s} label="sec" />
            </div>
          </div>
        </div>

        {/* Deal cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {deals.map((deal, i) => {
            const blob = BLOBS[i % BLOBS.length]
            const pct  = Math.round(((deal.price - deal.salePrice) / deal.price) * 100)
            const img  = deal.images?.[0]

            return (
              <Link
                key={deal.id}
                href={`/products/${deal.slug}`}
                className="group relative block rounded-3xl overflow-hidden glass glass-hover glass-shine cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Internal blobs */}
                <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl opacity-35 pointer-events-none" style={{ background: blob.a }} />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-2xl opacity-25 pointer-events-none" style={{ background: blob.b }} />

                {/* Badges */}
                <div className="absolute top-4 left-4 z-10 px-3 py-1 glass-md rounded-xl text-slate-700 text-xs font-bold shadow-sm">Flash Sale</div>
                <div className="absolute top-4 right-4 z-10 px-3 py-1 text-white text-xs font-extrabold rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${blob.a}, ${blob.b})` }}>
                  -{pct}%
                </div>

                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  {img ? (
                    <Image src={img} alt={deal.name} fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width:640px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${blob.a}20, ${blob.b}30)` }}>
                      <ShoppingBag size={40} className="text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-white/10" />
                </div>

                <div className="p-5">
                  <h3 className="font-heading font-bold text-slate-900 text-lg line-clamp-1">{deal.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-heading font-extrabold text-2xl text-primary">{formatPrice(deal.salePrice)}</span>
                    <span className="text-slate-400 line-through text-sm">{formatPrice(deal.price)}</span>
                  </div>

                  {/* Stock progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>Selling fast</span>
                      <span>{deal.stock} left</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(90, Math.max(20, 100 - (deal.stock / 50) * 100))}%`,
                          background: `linear-gradient(90deg, ${blob.a}, ${blob.b})`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4 text-sm font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                    Grab deal <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

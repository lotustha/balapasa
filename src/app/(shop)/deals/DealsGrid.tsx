'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import ProductCard, { type Product } from '@/components/ui/ProductCard'

interface Deal extends Product {
  salePriceExpiresAt: string | null
}

function useCountdown(iso: string | null) {
  const [t, setT] = useState({ h: '00', m: '00', s: '00', done: !iso })
  useEffect(() => {
    if (!iso) { setT({ h: '00', m: '00', s: '00', done: true }); return }
    const target = new Date(iso).getTime()
    const tick = () => {
      const d = target - Date.now()
      if (d <= 0) { setT({ h: '00', m: '00', s: '00', done: true }); return }
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

function DealTimer({ iso }: { iso: string | null }) {
  const { h, m, s, done } = useCountdown(iso)
  if (!iso || done) return null
  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg shadow-md text-white text-[10px] font-extrabold tabular-nums"
      style={{ background: 'linear-gradient(135deg,#F59E0B,#EC4899)' }}>
      <Clock size={10} className="shrink-0" />
      <span>{h}:{m}:{s}</span>
    </div>
  )
}

export default function DealsGrid({ deals }: { deals: Deal[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {deals.map(p => (
        <div key={p.id} className="relative">
          <DealTimer iso={p.salePriceExpiresAt} />
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  )
}

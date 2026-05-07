import type { Metadata } from 'next'
import Hero from '@/components/home/Hero'
import CategorySection from '@/components/home/CategorySection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import DealsSection from '@/components/home/DealsSection'
import Newsletter from '@/components/home/Newsletter'
import { ShieldCheck, Truck, RefreshCcw, Headphones } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Balapasa — Tech & Beauty Hub',
  description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
}

const TRUST = [
  { icon: Truck,       title: 'Fast Delivery',  desc: 'Same-day delivery via Pathao in Kathmandu' },
  { icon: ShieldCheck, title: '100% Authentic', desc: 'All products are verified and genuine' },
  { icon: RefreshCcw,  title: 'Easy Returns',   desc: '7-day hassle-free return policy' },
  { icon: Headphones,  title: '24/7 Support',   desc: "We're here whenever you need us" },
]

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategorySection />
      <FeaturedProducts />
      <DealsSection />

      {/* Trust bar */}
      <section
        className="relative py-14 overflow-hidden glass-section"
        style={{ background: 'rgba(255,255,255,0.55)' }}
      >
        {/* Soft blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: '#10B981' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 glass-md rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <Icon size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-slate-800 text-sm">{title}</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  )
}

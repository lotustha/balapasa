import type { Metadata } from 'next'
import { STORE_URL } from '@/lib/config'
import Hero from '@/components/home/Hero'
import CategorySection from '@/components/home/CategorySection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import DealsSection from '@/components/home/DealsSection'
import Newsletter from '@/components/home/Newsletter'
import { ShieldCheck, Truck, RefreshCcw, Headphones } from 'lucide-react'
import { getSiteSettings } from '@/lib/site-settings'

export const metadata: Metadata = {
  title: 'Balapasa — Tech & Beauty Hub Nepal',
  description: 'Shop electronics, gadgets, skincare & beauty at the best prices in Nepal. Fast same-day delivery in Kathmandu via Pathao. 100% authentic products.',
  keywords: ['online shopping Nepal', 'buy electronics Nepal', 'beauty products Nepal', 'fast delivery Kathmandu', 'gadgets Nepal', 'Balapasa'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Balapasa — Tech & Beauty Hub Nepal',
    description: 'Shop electronics, gadgets, skincare & beauty at the best prices in Nepal. Fast same-day delivery across Kathmandu.',
    url: '/',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Balapasa Nepal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balapasa — Tech & Beauty Hub Nepal',
    description: 'Best prices on electronics, gadgets & beauty in Nepal. Fast delivery.',
    images: ['/logo.png'],
  },
}

const TRUST = [
  { icon: Truck,       title: 'Fast Delivery',  desc: 'Same-day delivery via Pathao in Kathmandu' },
  { icon: ShieldCheck, title: '100% Authentic', desc: 'All products are verified and genuine' },
  { icon: RefreshCcw,  title: 'Easy Returns',   desc: '7-day hassle-free return policy' },
  { icon: Headphones,  title: '24/7 Support',   desc: "We're here whenever you need us" },
]

export default async function HomePage() {
  const settings = await getSiteSettings()
  const logoAbsolute = settings.logoUrl.startsWith('http') ? settings.logoUrl : `${STORE_URL}${settings.logoUrl}`
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        name: settings.siteName,
        description: 'Premium electronics, gadgets & beauty products. Fast delivery across Nepal.',
        url: STORE_URL,
        logo: logoAbsolute,
        areaServed: { '@type': 'Country', name: 'Nepal' },
        priceRange: '$$',
        currenciesAccepted: 'NPR',
        paymentAccepted: 'Cash, Esewa, Khalti',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Electronics, Gadgets & Beauty',
        },
      }) }} />
      <Hero hero={settings.hero} />
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

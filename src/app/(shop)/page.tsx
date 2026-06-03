import type { Metadata } from 'next'
import Hero from '@/components/home/Hero'

// ISR: re-generate the home shell every 5 minutes. Hero trending data is
// fetched client-side so storefront edits show up quickly while keeping
// TTFB low and DB load down.
export const revalidate = 300
import CategorySection from '@/components/home/CategorySection'
import NewlyAddedProducts from '@/components/home/NewlyAddedProducts'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import DealsSection from '@/components/home/DealsSection'
import HeroDealOfTheDay from '@/components/home/HeroDealOfTheDay'
import Newsletter from '@/components/home/Newsletter'
import { ShieldCheck, Truck, RefreshCcw, Headphones } from 'lucide-react'
import { getSiteSettings } from '@/lib/site-settings'

// Dynamic — title + OG content come from the DB so a freshly-renamed
// store (or a multi-tenant deploy) gets the right SEO immediately.
//
// `title.absolute` bypasses the root layout's `%s | ${siteName}` template so
// the homepage shows its own crafted SEO title once (e.g. "Balapasa — Tech &
// Beauty Hub Nepal") rather than "Balapasa — Tech & Beauty Hub Nepal | Balapasa".
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const title    = s.seo.title       || `${s.siteName} — Online Shopping`
  const desc     = s.seo.description || `Shop online with ${s.siteName} — fast delivery, authentic products, easy returns.`
  const keywords = s.seo.keywords    || `${s.siteName}, online shopping`
  const ogImage  = s.logoUrl         || '/logo.png'

  return {
    title: { absolute: title },
    description: desc,
    keywords,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description: desc,
      url:         '/',
      siteName:    s.siteName,
      type:        'website',
      images: [{ url: ogImage, width: 512, height: 512, alt: s.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

const TRUST = [
  { icon: Truck,       title: 'Fast Delivery',  desc: 'Same-day delivery via Pathao in Kathmandu' },
  { icon: ShieldCheck, title: '100% Authentic', desc: 'All products are verified and genuine' },
  { icon: RefreshCcw,  title: 'Easy Returns',   desc: '7-day hassle-free return policy' },
  { icon: Headphones,  title: '24/7 Support',   desc: "We're here whenever you need us" },
]

export default async function HomePage() {
  const settings = await getSiteSettings()
  const logoAbsolute = settings.logoUrl.startsWith('http') ? settings.logoUrl : `${settings.storeUrl}${settings.logoUrl}`
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        name: settings.siteName,
        description: settings.seo.description,
        url: settings.storeUrl,
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
      <HeroDealOfTheDay />
      <CategorySection />
      <NewlyAddedProducts />
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

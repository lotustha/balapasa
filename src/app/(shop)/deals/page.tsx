import type { Metadata } from 'next'
import { Flame, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import DealsGrid from './DealsGrid'

export const revalidate = 60   // refresh every minute so live deals stay fresh

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Flash deals — ${siteName}`
  const description = `Today's flash sales and limited-time offers at ${siteName}. Discounts on electronics, beauty, and more.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/deals` },
    openGraph: { title, description, url: `${storeUrl}/deals`, siteName, type: 'website' },
  }
}

export default async function DealsPage() {
  const now = new Date()

  const deals = await prisma.product.findMany({
    where: {
      isActive:  true,
      salePrice: { not: null },
      AND: [
        { OR: [{ salePriceExpiresAt: null }, { salePriceExpiresAt: { gt:  now } }] },
        { OR: [{ salePriceStartsAt:  null }, { salePriceStartsAt:  { lte: now } }] },
      ],
    },
    orderBy: [
      { salePriceExpiresAt: { sort: 'asc',  nulls: 'last' } },  // ending soonest first
      { updatedAt:          'desc' },
    ],
    select: {
      id: true, name: true, slug: true, price: true, salePrice: true,
      salePriceExpiresAt: true,
      images: true, brand: true, stock: true, rating: true, reviewCount: true,
      isNew: true, isFeatured: true,
    },
    take: 60,
  }).catch(() => [])

  // Serialise dates for the client grid.
  const serialised = deals.map(p => ({
    ...p,
    salePriceExpiresAt: p.salePriceExpiresAt ? p.salePriceExpiresAt.toISOString() : null,
  }))

  return (
    <section
      className="relative min-h-screen pt-10 pb-24 overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#FFF0FC 0%,#FFF5E8 35%,#F0FDF4 70%,#EFF6FF 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-24 w-[28rem] h-[28rem]"
          style={{ background: '#F59E0B', opacity: 0.18 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute -bottom-32 -right-24 w-80 h-80"
          style={{ background: '#EC4899', opacity: 0.14, animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <header className="mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full mb-4">
            <Flame size={13} className="text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-700">Flash deals</span>
          </div>
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900 leading-tight">
            Limited-time <span className="gradient-text-warm">deals</span>
          </h1>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl leading-relaxed">
            Sale prices on real products, ending soonest first.
            <span className="inline-flex items-center gap-1 ml-1 text-amber-600 font-semibold">
              <Clock size={13} /> grab them before they're gone.
            </span>
          </p>
        </header>

        {/* Grid */}
        {deals.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center animate-fade-in-up">
            <Flame size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">No live deals right now</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
              Check back soon — new flash sales drop throughout the week.
            </p>
          </div>
        ) : (
          <DealsGrid deals={serialised} />
        )}
      </div>
    </section>
  )
}

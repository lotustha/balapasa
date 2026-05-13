import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import ProductCard from '@/components/ui/ProductCard'
import { prisma } from '@/lib/prisma'

async function getNewProducts() {
  try {
    return await prisma.product.findMany({
      where:   { isActive: true },
      orderBy: [{ isNew: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    })
  } catch { return [] }
}

export default async function NewlyAddedProducts() {
  const products = await getNewProducts()
  if (!products.length) return null

  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FFF7ED 0%, #FEF3C7 50%, #FAF5FF 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-20 -left-16 w-[440px] h-[440px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#F59E0B', opacity: 0.10, animationDelay: '0s' }} />
        <div className="blob absolute -bottom-20 -right-16 w-[380px] h-[380px] animate-blob-morph animate-blob-float-b"
          style={{ background: '#EC4899', opacity: 0.09, animationDelay: '2s' }} />
        <div className="blob absolute top-1/2 right-1/3 w-[300px] h-[300px] animate-blob-morph animate-blob-float-c"
          style={{ background: '#8B5CF6', opacity: 0.07, animationDelay: '1.5s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-3 shadow-sm"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.85)',
              }}>
              <Sparkles size={13} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-700 tracking-wide">Just Arrived</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900">
              Newly <span className="gradient-text-warm">Added</span>
            </h2>
            <p className="text-slate-500 mt-2 text-sm">Fresh stock — be the first to grab them</p>
          </div>
          <Link
            href="/products?sort=newest"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer group"
          >
            See all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p, i) => (
            <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
              <ProductCard product={{
                id:          p.id,
                name:        p.name,
                slug:        p.slug,
                price:       p.price,
                salePrice:   p.salePrice  ?? undefined,
                images:      p.images,
                rating:      p.rating,
                reviewCount: p.reviewCount,
                brand:       p.brand      ?? undefined,
                stock:       p.stock,
                isNew:       p.isNew,
              }} />
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link href="/products?sort=newest"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:text-primary transition-colors cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.85)',
            }}>
            View all new arrivals <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

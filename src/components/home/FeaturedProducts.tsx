import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import ProductCard from '@/components/ui/ProductCard'
import { prisma } from '@/lib/prisma'

async function getProducts() {
  try {
    const featured = await prisma.product.findMany({
      where:   { isActive: true, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    if (featured.length >= 4) return featured

    return await prisma.product.findMany({
      where:   { isActive: true },
      orderBy: [{ isNew: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    })
  } catch { return [] }
}

export default async function FeaturedProducts() {
  const products = await getProducts()
  if (!products.length) return null

  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F0F9FF 0%, #FAF5FF 50%, #FFF0F9 100%)' }}
    >
      {/* Animated blobs — matches hero/products page style */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-24 -right-16 w-[480px] h-[480px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#8B5CF6', opacity: 0.10, animationDelay: '0s' }} />
        <div className="blob absolute -bottom-16 -left-16 w-[400px] h-[400px] animate-blob-morph animate-blob-float-b"
          style={{ background: '#06B6D4', opacity: 0.09, animationDelay: '2s' }} />
        <div className="blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] animate-blob-morph animate-blob-float-c"
          style={{ background: '#EC4899', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">

        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-3 shadow-sm"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.85)',
              }}>
              <Sparkles size={13} className="text-primary" />
              <span className="text-xs font-bold text-slate-700 tracking-wide">Handpicked for You</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900">
              Featured <span className="gradient-text-warm">Products</span>
            </h2>
          </div>
          <Link
            href="/products?featured=true"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer group"
          >
            See all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Product grid */}
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
                isFeatured:  true,
              }} />
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="text-center mt-8 sm:hidden">
          <Link href="/products?featured=true"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:text-primary transition-colors cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.85)',
            }}>
            View all featured <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

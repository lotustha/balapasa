import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/ui/ProductCard'
import { prisma } from '@/lib/prisma'

async function getProducts() {
  try {
    // Try featured products first
    const featured = await prisma.product.findMany({
      where:   { isActive: true, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    if (featured.length >= 4) return featured

    // Fall back to newest / sale products
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
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #F0F9FF 100%)' }}
    >
      {/* Soft blobs */}
      <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-3xl opacity-12 pointer-events-none" style={{ background: '#8B5CF6' }} />
      <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full blur-3xl opacity-12 pointer-events-none" style={{ background: '#06B6D4' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Handpicked for You</p>
            <h2 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900">
              Featured <span className="gradient-text-warm">Products</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors cursor-pointer group"
          >
            See all <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((p, i) => (
            <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
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

        <div className="text-center mt-10 sm:hidden">
          <Link href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 glass-card text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-2xl cursor-pointer transition-colors">
            View all products <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}

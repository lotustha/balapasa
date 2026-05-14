import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/ui/ProductCard'
import type { Product } from '@/components/ui/ProductCard'
import ProductSidebar from '@/components/ui/ProductSidebar'
import { prisma } from '@/lib/prisma'
import { PackageOpen, ChevronLeft, ChevronRight, X } from 'lucide-react'

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams
  const title = params.search
    ? `Results for "${params.search}"`
    : params.category
    ? params.category.charAt(0).toUpperCase() + params.category.slice(1)
    : 'All Products'

  const description = params.search
    ? `Shop ${params.search} products in Nepal — best prices, fast delivery.`
    : params.category
    ? `Buy ${title} online in Nepal. Best prices & fast delivery across Kathmandu.`
    : 'Browse all electronics, gadgets, skincare & beauty products. Best prices in Nepal with fast delivery.'

  const canonical = params.category ? `/products?category=${params.category}` : '/products'

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Balapasa`,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Balapasa Products' }],
    },
    twitter: { card: 'summary', title: `${title} | Balapasa`, description },
  }
}

const PAGE_SIZE = 24

// ── Mock data (used when DB not connected) ──────────────────────────────────
const ALL_MOCK: Product[] = [
  { id: '1',  name: 'AirPods Pro Max Clone',     slug: 'airpods-pro-max',   price: 8500,  salePrice: 6800, images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'],  rating: 4.5, reviewCount: 234, isNew: false, brand: 'SoundX',     stock: 15, category: { name: 'Gadgets'     } },
  { id: '2',  name: 'Smart Watch Series X',       slug: 'smart-watch-x',    price: 12000, salePrice: null, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],  rating: 4.7, reviewCount: 189, isNew: true,  brand: 'WearTech',   stock: 8,  category: { name: 'Electronics' } },
  { id: '3',  name: 'CeraVe Foaming Cleanser',   slug: 'cerave-cleanser',   price: 1200,  salePrice: 980,  images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop'],  rating: 4.9, reviewCount: 512, isNew: false, brand: 'CeraVe',     stock: 42, category: { name: 'Beauty'      } },
  { id: '4',  name: 'Matte Liquid Lipstick Set', slug: 'matte-lipstick-set', price: 850,  salePrice: 650,  images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop'],  rating: 4.6, reviewCount: 328, isNew: true,  brand: 'GlowCo',     stock: 30, category: { name: 'Beauty'      } },
  { id: '5',  name: 'RGB Mechanical Keyboard',   slug: 'rgb-keyboard',      price: 4500,  salePrice: 3800, images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop'],  rating: 4.4, reviewCount: 91,  isNew: false, brand: 'KeyMaster',  stock: 12, category: { name: 'Electronics' } },
  { id: '6',  name: 'Vitamin C Serum 30ml',      slug: 'vitamin-c-serum',   price: 1800,  salePrice: null, images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop'],  rating: 4.8, reviewCount: 445, isNew: true,  brand: 'GlowLab',    stock: 25, category: { name: 'Beauty'      } },
  { id: '7',  name: 'USB-C Fast Charger 65W',    slug: 'usb-c-charger-65w', price: 1500,  salePrice: 1200, images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],  rating: 4.3, reviewCount: 167, isNew: false, brand: 'PowerBoost', stock: 50, category: { name: 'Gadgets'     } },
  { id: '8',  name: 'Niacinamide 10% Serum',     slug: 'niacinamide-serum', price: 1600,  salePrice: 1100, images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop'],  rating: 4.7, reviewCount: 389, isNew: false, brand: 'The INKEY',  stock: 35, category: { name: 'Beauty'      } },
  { id: '9',  name: 'Bluetooth Speaker Pro',     slug: 'bluetooth-speaker', price: 3200,  salePrice: 2500, images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop'],  rating: 4.2, reviewCount: 143, isNew: false, brand: 'SoundBlast', stock: 20, category: { name: 'Gadgets'     } },
  { id: '10', name: 'Foundation Stick SPF30',    slug: 'foundation-stick',  price: 1100,  salePrice: 880,  images: ['https://images.unsplash.com/photo-1631214499778-b49a5391a9b7?w=400&h=400&fit=crop'],  rating: 4.4, reviewCount: 201, isNew: false, brand: 'Fenty',      stock: 18, category: { name: 'Beauty'      } },
  { id: '11', name: 'Laptop Stand Aluminum',     slug: 'laptop-stand',      price: 2800,  salePrice: null, images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop'],  rating: 4.6, reviewCount: 88,  isNew: true,  brand: 'DeskPro',    stock: 30, category: { name: 'Gadgets'     } },
  { id: '12', name: 'Retinol Night Cream',       slug: 'retinol-cream',     price: 2200,  salePrice: 1650, images: ['https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop'],  rating: 4.7, reviewCount: 334, isNew: false, brand: 'SkinFix',    stock: 22, category: { name: 'Beauty'      } },
  { id: '13', name: 'Wireless Gaming Mouse',     slug: 'gaming-mouse',      price: 5500,  salePrice: 4200, images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop'],  rating: 4.5, reviewCount: 112, isNew: true,  brand: 'GamerTech',  stock: 18, category: { name: 'Electronics' } },
  { id: '14', name: 'Rose Water Toner 200ml',    slug: 'rose-water-toner',  price: 680,   salePrice: 520,  images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop'],  rating: 4.6, reviewCount: 267, isNew: false, brand: 'Plum',       stock: 55, category: { name: 'Beauty'      } },
  { id: '15', name: '4K Action Camera',          slug: '4k-action-camera',  price: 18500, salePrice: null, images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop'],  rating: 4.8, reviewCount: 76,  isNew: true,  brand: 'ActionPro',  stock: 10, category: { name: 'Electronics' } },
  { id: '16', name: 'Smart LED Desk Lamp',       slug: 'smart-desk-lamp',   price: 2200,  salePrice: 1800, images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop'],  rating: 4.3, reviewCount: 95,  isNew: false, brand: 'BrightLife', stock: 27, category: { name: 'Gadgets'     } },
]

// ── Types ────────────────────────────────────────────────────────────────────
interface Params {
  category?: string; search?: string; sort?: string; featured?: string
  minPrice?: string; maxPrice?: string; onSale?: string; isNew?: string
  page?: string
}

interface SidebarCategory { slug: string; name: string; color: string }

// ── Data fetching ────────────────────────────────────────────────────────────
async function getProducts(params: Params): Promise<{ products: Product[]; total: number }> {
  const minP = Number(params.minPrice ?? 0)
  const maxP = Number(params.maxPrice ?? 50000)
  const page = Math.max(1, Number(params.page ?? 1))
  const skip = (page - 1) * PAGE_SIZE

  try {
    const where: Record<string, unknown> = { isActive: true }
    if (params.category)          where.category  = { slug: params.category }
    if (params.featured === 'true') where.isFeatured = true
    if (params.isNew    === 'true') where.isNew     = true
    if (params.onSale   === 'true') where.salePrice = { not: null }
    if (params.search) {
      where.OR = [
        { name:        { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { brand:       { contains: params.search, mode: 'insensitive' } },
      ]
    }
    where.price = { gte: minP, lte: maxP }

    const orderBy: Record<string, string> =
      params.sort === 'price-asc'  ? { price:     'asc'  } :
      params.sort === 'price-desc' ? { price:     'desc' } :
      params.sort === 'rating'     ? { rating:    'desc' } :
      params.sort === 'popular'    ? { viewCount: 'desc' } :
      // 'newest' (explicit) + any unknown value falls through to createdAt desc
                                     { createdAt: 'desc' }

    const include = { category: { select: { name: true } } }

    const [rows, total] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy, include, skip, take: PAGE_SIZE }),
      prisma.product.count({ where }),
    ])

    return { products: rows as unknown as Product[], total }
  } catch {
    let list = [...ALL_MOCK]
    if (params.category) list = list.filter(p => p.category?.name.toLowerCase() === params.category?.toLowerCase())
    if (params.search) {
      const q = params.search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
    }
    if (params.isNew  === 'true') list = list.filter(p => p.isNew)
    if (params.onSale === 'true') list = list.filter(p => p.salePrice != null)
    if (minP > 0)     list = list.filter(p => (p.salePrice ?? p.price) >= minP)
    if (maxP < 50000) list = list.filter(p => (p.salePrice ?? p.price) <= maxP)
    if (params.sort === 'price-asc')  list = list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price))
    if (params.sort === 'price-desc') list = list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price))
    if (params.sort === 'rating')     list = list.sort((a, b) => b.rating - a.rating)
    return { products: list.slice(skip, skip + PAGE_SIZE), total: list.length }
  }
}

async function getCategories(): Promise<SidebarCategory[]> {
  try {
    return await prisma.category.findMany({
      select: { name: true, slug: true, color: true },
      orderBy: { name: 'asc' },
    })
  } catch {
    return []
  }
}

// ── Active filter chips ──────────────────────────────────────────────────────
function ActiveFilters({ params }: { params: Params }) {
  const chips: { label: string; key: string }[] = []
  if (params.search)              chips.push({ label: `"${params.search}"`,                           key: 'search'   })
  if (params.category)            chips.push({ label: params.category,                                key: 'category' })
  if (params.isNew   === 'true')  chips.push({ label: 'New Arrivals',                                 key: 'isNew'    })
  if (params.onSale  === 'true')  chips.push({ label: 'On Sale',                                      key: 'onSale'   })
  if (Number(params.minPrice) > 0)       chips.push({ label: `From NPR ${Number(params.minPrice).toLocaleString()}`, key: 'minPrice' })
  if (Number(params.maxPrice) < 50000)   chips.push({ label: `To NPR ${Number(params.maxPrice).toLocaleString()}`,   key: 'maxPrice' })

  if (chips.length === 0) return null

  function removeUrl(key: string) {
    const sp = new URLSearchParams()
    const keys = ['category','search','sort','featured','minPrice','maxPrice','onSale','isNew'] as const
    for (const k of keys) {
      if (k !== key && params[k]) sp.set(k, params[k]!)
    }
    const q = sp.toString()
    return `/products${q ? `?${q}` : ''}`
  }

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {chips.map(({ label, key }) => (
        <Link key={key} href={removeUrl(key)} scroll={false}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer min-h-[36px]">
          {label} <X size={11} />
        </Link>
      ))}
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Params }) {
  if (totalPages <= 1) return null

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (params.category) sp.set('category', params.category)
    if (params.search)   sp.set('search',   params.search)
    if (params.sort)     sp.set('sort',     params.sort)
    if (params.featured) sp.set('featured', params.featured)
    if (params.minPrice) sp.set('minPrice', params.minPrice)
    if (params.maxPrice) sp.set('maxPrice', params.maxPrice)
    if (params.onSale)   sp.set('onSale',   params.onSale)
    if (params.isNew)    sp.set('isNew',    params.isNew)
    if (p > 1)           sp.set('page',     String(p))
    const q = sp.toString()
    return `/products${q ? `?${q}` : ''}`
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis-start')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('ellipsis-end')
    pages.push(totalPages)
  }

  const btnBase = 'flex items-center justify-center font-semibold text-sm transition-all duration-200 cursor-pointer'

  return (
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      {page > 1 && (
        <Link href={pageUrl(page - 1)} scroll={false}
          className={`${btnBase} gap-1.5 px-4 py-2.5 glass-card rounded-2xl text-slate-600 hover:bg-white/90`}>
          <ChevronLeft size={14} /> Prev
        </Link>
      )}

      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={p} className="text-slate-400 px-1 select-none">…</span>
        ) : (
          <Link key={p} href={pageUrl(p)} scroll={false}
            className={`${btnBase} w-10 h-10 rounded-2xl ${
              p === page
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'glass-card text-slate-600 hover:bg-white/90'
            }`}>
            {p}
          </Link>
        )
      )}

      {page < totalPages && (
        <Link href={pageUrl(page + 1)} scroll={false}
          className={`${btnBase} gap-1.5 px-4 py-2.5 glass-card rounded-2xl text-slate-600 hover:bg-white/90`}>
          Next <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const [{ products, total }, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ])

  const page       = Math.max(1, Number(params.page ?? 1))
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const pageTitle = params.search
    ? `Results for "${params.search}"`
    : params.category
    ? params.category.charAt(0).toUpperCase() + params.category.slice(1)
    : 'All Products'

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 40%, #FFF0F9 70%, #F0FDF4 100%)', overflowX: 'clip' }}
    >
      {/* Blob accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="blob absolute -top-20 -left-20 w-[420px] h-[420px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#8B5CF6', opacity: 0.08, animationDelay: '0s' }} />
        <div className="blob absolute top-1/3 -right-10 w-[360px] h-[360px] animate-blob-morph animate-blob-float-b"
          style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '2s' }} />
        <div className="blob absolute bottom-20 left-1/4 w-[380px] h-[380px] animate-blob-morph animate-blob-float-c"
          style={{ background: '#EC4899', opacity: 0.07, animationDelay: '1s' }} />
        <div className="blob absolute top-1/2 left-1/2 w-[280px] h-[280px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#10B981', opacity: 0.06, animationDelay: '3s' }} />
      </div>

      {/* Page header */}
      <div className="relative z-10 glass-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-[0.2em] mb-1">Shop</p>
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 truncate">{pageTitle}</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5 sm:hidden">
                {total} product{total !== 1 ? 's' : ''}
                {totalPages > 1 && <span className="ml-1.5 text-slate-300">· p.{page}/{totalPages}</span>}
              </p>
            </div>
            <p className="text-sm text-slate-400 font-medium hidden sm:block shrink-0">
              {total} product{total !== 1 ? 's' : ''}
              {totalPages > 1 && <span className="ml-2 text-slate-300">· page {page} of {totalPages}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex gap-7 items-stretch">

          {/* Sidebar */}
          <Suspense fallback={
            <div className="hidden lg:block w-72 shrink-0">
              <div className="glass-card p-5 h-96 skeleton-light rounded-3xl" />
            </div>
          }>
            <ProductSidebar totalCount={total} categories={categories} />
          </Suspense>

          {/* Grid area */}
          <div className="flex-1 min-w-0">
            <ActiveFilters params={params} />

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 glass-card rounded-3xl animate-fade-in-up">
                <PackageOpen size={56} className="text-slate-200 mb-4" />
                <p className="font-heading font-bold text-xl text-slate-500 mb-2">No products found</p>
                <p className="text-slate-400 text-sm mb-6">Try adjusting your filters or search term</p>
                <Link href="/products"
                  className="px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer">
                  Clear all filters
                </Link>
              </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {products.map((product, i) => (
                    <div key={product.id} className="animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(i * 0.04, 0.32)}s` }}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
            )}
          </div>

        </div>

        {/* Pagination outside flex — sidebar stops at product grid bottom */}
        <Pagination page={page} totalPages={totalPages} params={params} />
      </div>
    </div>
  )
}

import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'
import type { ClientProduct, ClientReview, ClientSlimProduct } from './types'

type PageProps = { params: Promise<{ slug: string }> }

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const getProduct = cache(async (slug: string) => {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: { category: true, options: { orderBy: { position: 'asc' } }, variants: { where: { isActive: true } } },
    })
  } catch { return null }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  const { STORE_NAME, STORE_URL: appUrl } = await import('@/lib/config')
  if (!product) return { title: `Product Not Found | ${STORE_NAME}`, description: 'The product you are looking for does not exist.' }

  const desc   = stripHtml(product.description).slice(0, 160)
  const image  = product.images[0] ?? null
  const title  = `${product.name} | ${STORE_NAME} Nepal`
  const url    = `${appUrl}/products/${slug}`

  return {
    title,
    description: desc,
    keywords: [...product.tags, product.brand ?? '', product.category.name, 'Nepal', 'buy online', STORE_NAME, 'online shopping Nepal'].filter(Boolean).join(', '),
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, siteName: STORE_NAME, type: 'website', images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [], locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description: desc, images: image ? [image] : [] },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const product  = await getProduct(slug)
  const { STORE_URL: appUrl } = await import('@/lib/config')

  const [similar, shopsChoice, boughtTogether, rawReviews] = await Promise.all([
    product ? prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      select: { id: true, name: true, slug: true, price: true, salePrice: true, rating: true, reviewCount: true, images: true },
      orderBy: { reviewCount: 'desc' }, take: 6,
    }).catch(() => []) : Promise.resolve([]),

    prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      select: { id: true, name: true, slug: true, price: true, salePrice: true, rating: true, reviewCount: true, images: true },
      take: 2,
    }).catch(() => []),

    product?.boughtTogetherIds?.length
      ? prisma.product.findMany({
          where: { id: { in: product.boughtTogetherIds }, isActive: true },
          select: { id: true, name: true, slug: true, price: true, salePrice: true, images: true, rating: true, reviewCount: true },
        }).catch(() => [])
      : Promise.resolve([]),

    product ? prisma.review.findMany({
      where: { productId: product.id },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }, take: 20,
    }).catch(() => []) : Promise.resolve([]),
  ])

  // Serialize — no Date objects to client components
  const clientProduct: ClientProduct | null = product ? {
    id: product.id, name: product.name, slug: product.slug,
    description: product.description, price: product.price,
    salePrice: product.salePrice, stock: product.stock,
    images: product.images, brand: product.brand, sku: product.sku,
    rating: product.rating, reviewCount: product.reviewCount,
    isNew: product.isNew, isTaxable: product.isTaxable,
    videoUrl: product.videoUrl,
    salePriceExpiresAt: product.salePriceExpiresAt ? product.salePriceExpiresAt.toISOString() : null,
    tags: product.tags,
    category: { id: product.category.id, name: product.category.name, slug: product.category.slug, color: product.category.color, icon: product.category.icon, image: product.category.image },
    options: product.options.map(o => ({ id: o.id, name: o.name, values: o.values, position: o.position })),
    variants: product.variants.map(v => ({ id: v.id, title: v.title, price: v.price, stock: v.stock, image: v.image, options: v.options as Record<string, string>, sku: v.sku })),
  } : null

  const reviews: ClientReview[] = rawReviews.map(r => ({
    id: r.id, rating: r.rating, comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    user: { name: r.user.name, avatar: r.user.avatar },
  }))

  const jsonLd = product ? {
    '@context': 'https://schema.org/', '@type': 'Product',
    name: product.name, description: stripHtml(product.description),
    image: product.images, sku: product.sku ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category.name, url: `${appUrl}/products/${slug}`,
    offers: {
      '@type': 'Offer', priceCurrency: 'NPR',
      price: product.salePrice ?? product.price,
      highPrice: product.price, lowPrice: product.salePrice ?? product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${appUrl}/products/${slug}`,
      seller: { '@type': 'Organization', name: STORE_NAME, url: appUrl },
    },
    ...(product.reviewCount > 0 && { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount, bestRating: 5, worstRating: 1 } }),
  } : null

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <ProductDetailClient
        initialProduct={clientProduct}
        similar={similar as ClientSlimProduct[]}
        shopsChoice={shopsChoice as ClientSlimProduct[]}
        boughtTogether={boughtTogether as ClientSlimProduct[]}
        reviews={reviews}
      />
    </>
  )
}

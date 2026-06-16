import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'
import type { ClientProduct, ClientReview, ClientSlimProduct } from './types'

// ISR: cache product pages for 1 hour. Stock + price-sensitive content is
// re-fetched on revalidation; admin updates show within an hour. Add
// revalidatePath(`/products/${slug}`) in the product PATCH route for instant
// propagation if needed.
export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const getProduct = cache(async (slug: string) => {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: { category: true, options: { orderBy: { position: 'asc' } }, variants: { where: { isActive: true } }, plan: true },
    })
  } catch { return null }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  const { getSiteSettings } = await import('@/lib/site-settings')
  const { siteName, storeUrl: appUrl } = await getSiteSettings()
  if (!product) return { title: 'Product Not Found', description: 'The product you are looking for does not exist.' }

  const desc  = stripHtml(product.description).slice(0, 160)
  const image = product.images[0] ?? null
  const url   = `${appUrl}/products/${slug}`
  // Title is just the product name — root layout template appends "| {siteName}"
  const ogTitle = `${product.name} | ${siteName}`

  return {
    title: product.name,
    description: desc,
    keywords: [...product.tags.filter(t => !t.startsWith('_')), product.brand ?? '', product.category.name, 'buy online', siteName, 'online shopping'].filter(Boolean).join(', '),
    alternates: { canonical: url },
    openGraph: { title: ogTitle, description: desc, url, siteName, type: 'website', images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [], locale: 'en_US' },
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc, images: image ? [image] : [] },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const product  = await getProduct(slug)
  const { STORE_URL: appUrl, STORE_NAME } = await import('@/lib/config')

  // Bundle products derive their availability + contents from their components.
  const { getBundleComponents, bundleAvailability } = await import('@/lib/bundle')
  const bundleComps = product?.kind === 'BUNDLE' ? await getBundleComponents(product.id) : []
  const bundleStock = product?.kind === 'BUNDLE' ? bundleAvailability(bundleComps) : 0

  const [similar, shopsChoice, boughtTogether, rawReviews] = await Promise.all([
    product ? prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      select: { id: true, name: true, slug: true, price: true, salePrice: true, rating: true, reviewCount: true, images: true, brand: true },
      orderBy: { reviewCount: 'desc' }, take: 6,
    }).catch(() => []) : Promise.resolve([]),

    prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      select: { id: true, name: true, slug: true, price: true, salePrice: true, rating: true, reviewCount: true, images: true, brand: true },
      take: 2,
    }).catch(() => []),

    product?.boughtTogetherIds?.length
      ? prisma.product.findMany({
          where: { id: { in: product.boughtTogetherIds }, isActive: true },
          select: { id: true, name: true, slug: true, price: true, salePrice: true, images: true, rating: true, reviewCount: true, brand: true },
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
    // For a bundle, `stock` is the derived availability so the existing
    // out-of-stock / add-to-cart gating works unchanged.
    salePrice: product.salePrice, stock: product.kind === 'BUNDLE' ? bundleStock : product.stock,
    images: product.images, brand: product.brand, sku: product.sku,
    rating: product.rating, reviewCount: product.reviewCount,
    isNew: product.isNew, isTaxable: product.isTaxable,
    videoUrl: product.videoUrl, weight: product.weight,
    length: product.length, width: product.width, height: product.height,
    faqs: Array.isArray(product.aiFaqJson)
      ? (product.aiFaqJson as unknown as Array<{ q: string; a: string }>)
          .filter(f => f && typeof f.q === 'string' && typeof f.a === 'string')
      : null,
    salePriceStartsAt:  product.salePriceStartsAt  ? product.salePriceStartsAt.toISOString()  : null,
    salePriceExpiresAt: product.salePriceExpiresAt ? product.salePriceExpiresAt.toISOString() : null,
    saleInitialStock:     product.saleInitialStock,
    maxPerCustomerOnSale: product.maxPerCustomerOnSale,
    isDealOfTheDay:       product.isDealOfTheDay,
    // Internal tags (prefixed with "_", e.g. the import-provenance marker) are
    // for ops/rollback only — never expose them to the client or SEO.
    tags: product.tags.filter(t => !t.startsWith('_')),
    kind:   product.kind,
    planId: product.planId,
    plan: product.plan ? {
      id: product.plan.id, name: product.plan.name, description: product.plan.description,
      image: product.plan.image, amount: product.plan.amount, interval: product.plan.interval,
      intervalCount: product.plan.intervalCount, trialDays: product.plan.trialDays,
    } : null,
    category: { id: product.category.id, name: product.category.name, slug: product.category.slug, color: product.category.color, icon: product.category.icon, image: product.category.image },
    options: product.options.map(o => ({ id: o.id, name: o.name, values: o.values, position: o.position })),
    variants: product.variants.map(v => ({ id: v.id, title: v.title, price: v.price, stock: v.stock, image: v.image, options: v.options as Record<string, string>, sku: v.sku })),
    bundleComponents: product.kind === 'BUNDLE'
      ? bundleComps.map(c => ({
          id: c.componentProductId, name: c.name, slug: c.slug,
          price: c.price, salePrice: c.salePrice, image: c.image, quantity: c.quantity,
          inStock: !c.missing && c.isActive && (!c.trackInventory || c.stock >= c.quantity),
        }))
      : null,
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

  // FAQPage JSON-LD — eligible for Google rich snippets if 2+ Q&A pairs exist.
  const faqs = Array.isArray(product?.aiFaqJson)
    ? (product.aiFaqJson as unknown as Array<{ q: string; a: string }>)
        .filter(f => f && typeof f.q === 'string' && typeof f.a === 'string')
    : []
  const faqLd = faqs.length >= 2 ? {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type':          'Question',
      name:             f.q,
      acceptedAnswer:   { '@type': 'Answer', text: f.a },
    })),
  } : null

  // BreadcrumbList helps Google show breadcrumb trails directly in search
  // results instead of the raw URL.
  const breadcrumbLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: appUrl },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${appUrl}/products` },
      { '@type': 'ListItem', position: 3, name: product.category.name, item: `${appUrl}/products?category=${product.category.slug}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: `${appUrl}/products/${slug}` },
    ],
  } : null

  return (
    <>
      {jsonLd       && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {breadcrumbLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />}
      {faqLd        && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
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

import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { STORE_URL as BASE } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []),
    prisma.category.findMany({
      select: { slug: true },
    }).catch(() => []),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                   lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/products`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/track-order`,  lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(c => ({
    url: `${BASE}/products?category=${c.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map(p => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}

import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

// Force fresh resolution every request — sitemap must reflect the current
// public URL from app_settings, not a build-time captured value.
export const dynamic  = 'force-dynamic'
export const revalidate = 0

// Resolve the public site URL with hard guards:
// - read from app_settings.STORE_URL (DB) via getSiteSettings
// - fall back to env, then a hard production default
// - reject localhost so a stale dev env on the VPS doesn't poison the sitemap
//   (Google rejects sitemaps where URLs don't match the hosting domain).
async function getBaseUrl(): Promise<string> {
  let url: string
  try {
    const settings = await getSiteSettings()
    url = settings.storeUrl
  } catch {
    url = process.env.NEXT_PUBLIC_APP_URL ?? 'https://balapasa.com.np'
  }
  if (!url || !/^https?:\/\//i.test(url) || /localhost|127\.0\.0\.1/i.test(url)) {
    url = 'https://balapasa.com.np'
  }
  return url.replace(/\/+$/, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = await getBaseUrl()

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

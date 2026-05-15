import type { MetadataRoute } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE = await getBaseUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin, account, checkout, API, and one-shot transactional pages
        // should not be indexed.
        disallow: [
          '/admin/',
          '/account/',
          '/api/',
          '/checkout/',
          '/login',
          '/register',
          '/track-order',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host:    BASE,
  }
}

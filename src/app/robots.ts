import type { MetadataRoute } from 'next'
import { STORE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
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
    sitemap: `${STORE_URL}/sitemap.xml`,
    host: STORE_URL,
  }
}

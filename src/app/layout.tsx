import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { prisma } from '@/lib/prisma'
import { getThemeScript } from '@/lib/themes'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const { siteName, storeUrl, faviconUrl, seo } = settings
  const keywordsArr = seo.keywords.split(',').map(k => k.trim()).filter(Boolean)

  // metadataBase requires a valid absolute URL. Fall back to a known-good URL
  // if admin saved something malformed.
  let metadataBase: URL
  try { metadataBase = new URL(storeUrl) }
  catch { metadataBase = new URL('https://balapasa.com') }

  return {
    metadataBase,
    title: { default: seo.title, template: `%s | ${siteName}` },
    description: seo.description,
    keywords: keywordsArr,
    authors: [{ name: siteName }],
    creator: siteName,
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : { icon: '/favicon.ico' },
    openGraph: {
      siteName,
      type: 'website',
      locale: 'en_US',
      url: storeUrl,
      title: seo.title,
      description: seo.description,
      images: [{ url: '/logo.png', width: 512, height: 512, alt: siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/logo.png'],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch theme server-side so CSS vars are injected before first paint — no flash
  let themeScript = ''
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'STORE_THEME' } })
    if (row?.value) themeScript = getThemeScript(row.value)
  } catch { /* DB unavailable — defaults from globals.css apply */ }

  // Reuse cached getSiteSettings — same call from generateMetadata() returns memoized.
  const settings = await getSiteSettings()

  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-body antialiased" style={{ background: '#F4F6FF' }}>
        {/* Blocking script sets CSS vars before first paint — no hydration mismatch */}
        {themeScript && (
          <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        )}
        {/* Organization schema feeds Google's "Site Name" + brand chip in search results.
            WebSite schema lets Google identify this as the canonical site for the brand. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: settings.siteName,
          alternateName: settings.siteName,
          url: settings.storeUrl,
          logo: `${settings.storeUrl}/logo.png`,
          description: settings.seo.description,
          areaServed: 'NP',
          sameAs: [],
        }) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: settings.siteName,
          url: settings.storeUrl,
          description: settings.seo.description,
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${settings.storeUrl}/products?search={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }) }} />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}

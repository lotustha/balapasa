import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'

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

import { STORE_NAME, STORE_URL } from '@/lib/config'

export const metadata: Metadata = {
  metadataBase: new URL(STORE_URL),
  title: { default: `${STORE_NAME} — Tech & Beauty`, template: `%s | ${STORE_NAME}` },
  description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
  keywords: ['online shopping Nepal', 'electronics Nepal', 'gadgets', 'beauty products', STORE_NAME, 'buy online Nepal'],
  authors: [{ name: STORE_NAME }],
  creator: STORE_NAME,
  openGraph: {
    siteName: STORE_NAME,
    type: 'website',
    locale: 'en_US',
    url: STORE_URL,
    title: `${STORE_NAME} — Tech & Beauty Hub Nepal`,
    description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: STORE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${STORE_NAME} — Tech & Beauty Hub Nepal`,
    description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col font-body antialiased" style={{ background: '#F4F6FF' }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: STORE_NAME,
          url: STORE_URL,
          logo: `${STORE_URL}/logo.png`,
          description: 'Premium electronics, gadgets & beauty. Fast delivery across Nepal.',
          areaServed: 'NP',
          sameAs: [],
        }) }} />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}

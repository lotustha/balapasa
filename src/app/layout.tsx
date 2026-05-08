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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://balapasa.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Balapasa — Tech & Beauty', template: '%s | Balapasa' },
  description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
  keywords: ['online shopping Nepal', 'electronics Nepal', 'gadgets', 'beauty products', 'Balapasa', 'buy online Nepal'],
  authors: [{ name: 'Balapasa' }],
  creator: 'Balapasa',
  openGraph: {
    siteName: 'Balapasa',
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'Balapasa — Tech & Beauty Hub Nepal',
    description: 'Shop electronics, gadgets, skincare & beauty at the best prices. Fast delivery across Nepal.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Balapasa' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@balapasa',
    title: 'Balapasa — Tech & Beauty Hub Nepal',
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
          name: 'Balapasa',
          url: APP_URL,
          logo: `${APP_URL}/logo.png`,
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

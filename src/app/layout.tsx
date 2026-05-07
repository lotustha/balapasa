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

export const metadata: Metadata = {
  title: { default: 'Balapasa — Tech & Beauty', template: '%s | Balapasa' },
  description: 'Premium electronics, gadgets & beauty. Fast delivery across Nepal.',
  openGraph: { siteName: 'Balapasa', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col font-body antialiased" style={{ background: '#F4F6FF' }}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}

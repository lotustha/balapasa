import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: 'Checkout',
    description: `Secure checkout at ${s.siteName}.`,
    robots: { index: false, follow: false },
  }
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: 'Sign In',
    description: `Sign in to your ${s.siteName} account to track orders, manage wishlist and more.`,
    robots: { index: false, follow: false },
  }
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

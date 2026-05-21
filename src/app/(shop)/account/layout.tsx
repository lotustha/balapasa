import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: 'My Account',
    description: `Manage your ${s.siteName} account, orders, and profile.`,
    robots: { index: false, follow: false },
  }
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

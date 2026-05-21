import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: 'Create Account',
    description: `Create a ${s.siteName} account for faster checkout and order tracking.`,
    robots: { index: false, follow: false },
  }
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

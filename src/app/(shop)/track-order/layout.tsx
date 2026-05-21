import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: 'Track Order',
    description: `Track your ${s.siteName} order status in real time. Enter your order ID to get live updates.`,
    // Belt-and-braces with robots.txt: tracking lookup surfaces personal data
    // by order code, so we don't want it in any index.
    robots: { index: false, follow: false },
  }
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

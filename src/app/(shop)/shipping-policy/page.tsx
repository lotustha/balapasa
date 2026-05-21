import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Shipping Policy — ${siteName}`
  const description = `Delivery zones, fees, and timelines across Nepal.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/shipping-policy` },
    openGraph: { title, description, url: `${storeUrl}/shipping-policy`, siteName, type: 'article' },
  }
}

export default async function ShippingPolicyPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Help" title="Shipping Policy" intro="Where we deliver, how long it takes, and what it costs.">
      <MarkdownBody source={content.legal.shipping} />
    </PageShell>
  )
}

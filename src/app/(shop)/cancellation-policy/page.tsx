import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Cancellation Policy — ${siteName}`
  const description = `How to cancel an order at ${siteName}, when self-serve cancellation is available, and what happens after dispatch.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/cancellation-policy` },
    openGraph: { title, description, url: `${storeUrl}/cancellation-policy`, siteName, type: 'article' },
  }
}

export default async function CancellationPolicyPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Legal" title="Cancellation Policy" intro="When and how you can cancel an order.">
      <MarkdownBody source={content.legal.cancellation} />
    </PageShell>
  )
}

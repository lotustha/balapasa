import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Refund & Return Policy — ${siteName}`
  const description = `Return window, refund timeline, and how to request a return at ${siteName}.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/refund-policy` },
    openGraph: { title, description, url: `${storeUrl}/refund-policy`, siteName, type: 'article' },
  }
}

export default async function RefundPolicyPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Legal" title="Refund & Return Policy" intro="How returns and refunds work.">
      <MarkdownBody source={content.legal.refund} />
    </PageShell>
  )
}

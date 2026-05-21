import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Terms of Service — ${siteName}`
  const description = `Terms and conditions for shopping at ${siteName}.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/terms` },
    openGraph: { title, description, url: `${storeUrl}/terms`, siteName, type: 'article' },
  }
}

export default async function TermsPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" intro="The agreement between you and our store.">
      <MarkdownBody source={content.legal.terms} />
    </PageShell>
  )
}

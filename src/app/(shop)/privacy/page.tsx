import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Privacy Policy — ${siteName}`
  const description = `How ${siteName} collects, uses, and protects your personal data.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/privacy` },
    openGraph: { title, description, url: `${storeUrl}/privacy`, siteName, type: 'article' },
  }
}

export default async function PrivacyPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" intro="How we handle your personal data.">
      <MarkdownBody source={content.legal.privacy} />
    </PageShell>
  )
}

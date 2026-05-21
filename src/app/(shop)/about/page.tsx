import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'
import MarkdownBody from '@/components/ui/MarkdownBody'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl, content } = await getSiteSettings()
  const title = `${content.about.title} — ${siteName}`
  const description = content.about.body.replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 155)
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/about` },
    openGraph: { title, description, url: `${storeUrl}/about`, siteName, type: 'website' },
  }
}

export default async function AboutPage() {
  const { content } = await getSiteSettings()
  return (
    <PageShell eyebrow="Our story" title={content.about.title}>
      <MarkdownBody source={content.about.body} />
    </PageShell>
  )
}

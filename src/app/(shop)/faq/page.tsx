import type { Metadata } from 'next'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl, content } = await getSiteSettings()
  const title = `Frequently Asked Questions — ${siteName}`
  const description = content.faq[0]?.answer.slice(0, 155) ??
    `Answers to common questions about shopping at ${siteName}.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/faq` },
    openGraph: { title, description, url: `${storeUrl}/faq`, siteName, type: 'website' },
  }
}

export default async function FaqPage() {
  const { content } = await getSiteSettings()

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: content.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name:    question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageShell
        eyebrow="Help centre"
        title="Frequently asked questions"
        intro="Quick answers to the things customers most often ask."
      >
        <ul className="space-y-3">
          {content.faq.map((item, i) => (
            <li key={i}>
              <details className="group glass rounded-2xl overflow-hidden transition-shadow open:shadow-md">
                <summary className="
                  flex items-center gap-3 cursor-pointer list-none
                  px-5 py-4 select-none
                  font-heading font-bold text-slate-800
                ">
                  <HelpCircle size={18} className="text-primary shrink-0" />
                  <span className="flex-1">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className="text-slate-400 transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <div className="px-5 pb-5 pl-12 text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </PageShell>
    </>
  )
}

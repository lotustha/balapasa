import Link from 'next/link'
import { Mail, ArrowRight, CheckCircle2, Users, Building2 } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmailConfig } from '@/lib/email'
import { listEventSummaries, getActiveVariantId, getEvent, type EventId } from '@/lib/emails/registry'
import EmailConnectionForm from './EmailConnectionForm'

export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) redirect('/login?next=/admin/emails')

  const config   = await getEmailConfig()
  const events   = listEventSummaries()
  const enriched = await Promise.all(events.map(async (e) => {
    const activeId      = await getActiveVariantId(e.id as EventId)
    const eventDef      = getEvent(e.id as EventId)
    const activeVariant = eventDef.variants.find(v => v.id === activeId)
    return {
      ...e,
      activeId,
      activeName:   activeVariant?.name   ?? activeId,
      activeAccent: activeVariant?.accent ?? '#16A34A',
    }
  }))

  // We never ship the raw key to the page — surface only "configured / not".
  const apiKeyConfigured = !!config.apiKey
  const maskedKey        = config.apiKey
    ? '••••' + config.apiKey.slice(-4)
    : ''

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#16A34A,#0EA5E9)' }}>
          <Mail size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">Emails</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect Resend, then pick a design for each email your store sends.
          </p>
        </div>
        <span className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
          apiKeyConfigured ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${apiKeyConfigured ? 'bg-green-500' : 'bg-amber-500'}`} />
          {apiKeyConfigured ? 'Resend connected' : 'Not connected'}
        </span>
      </header>

      <EmailConnectionForm
        initial={{
          apiKeyConfigured,
          apiKeyMasked: maskedKey,
          from:         config.from,
          replyTo:      config.replyTo ?? '',
        }}
        events={enriched.map(e => ({ id: e.id, label: e.label }))}
      />

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Templates</h2>
            <p className="text-sm text-slate-500 mt-0.5">Each event has multiple designs. Pick the one your customers see.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{enriched.length} events</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enriched.map(e => (
            <Link
              key={e.id}
              href={`/admin/emails/${e.id}`}
              className="group block rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
            >
              <div className="h-1.5" style={{ background: e.activeAccent }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-slate-900 text-base">{e.label}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{e.description}</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold ring-1 ring-slate-200">
                    <CheckCircle2 size={12} className="text-green-600" />
                    Active: {e.activeName}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    {e.variantCount} {e.variantCount === 1 ? 'variant' : 'variants'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
                    e.customerFacing ? 'bg-cyan-50 text-cyan-700' : 'bg-violet-50 text-violet-700'
                  }`}>
                    {e.customerFacing ? <Users size={11} /> : <Building2 size={11} />}
                    {e.customerFacing ? 'Customer' : 'Internal'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

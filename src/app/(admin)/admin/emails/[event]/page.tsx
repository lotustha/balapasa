import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import {
  isEventId,
  getEvent,
  getActiveVariantId,
  type EventId,
} from '@/lib/emails/registry'
import VariantGallery from './VariantGallery'

export const dynamic = 'force-dynamic'

export default async function EmailEventPage({ params }: { params: Promise<{ event: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) redirect('/login?next=/admin/emails')

  const { event: eventId } = await params
  if (!isEventId(eventId)) notFound()

  const eventDef = getEvent(eventId as EventId)
  const activeId = await getActiveVariantId(eventId as EventId)

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <Link
          href="/admin/emails"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition mb-3 cursor-pointer"
        >
          <ArrowLeft size={14} />
          All emails
        </Link>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">{eventDef.label}</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">{eventDef.description}</p>
      </div>

      <VariantGallery
        eventId={eventDef.id}
        initialActiveId={activeId}
        variants={eventDef.variants.map(v => ({
          id:          v.id,
          name:        v.name,
          description: v.description,
          accent:      v.accent,
        }))}
        hasStatusVariants={eventDef.id === 'shipment-update'}
      />
    </div>
  )
}

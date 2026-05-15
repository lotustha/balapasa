import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  isEventId,
  getEvent,
  renderWithVariant,
  type EventId,
} from '@/lib/emails/registry'

// GET /api/admin/emails/preview?event=order-confirmed&variant=branded&status=SHIPPED
// Returns the rendered HTML body as text/html so the admin gallery can stuff it
// into an <iframe srcdoc>. The `status` param only matters for shipment-update;
// the admin gallery uses it to flip between SHIPPED/DELIVERED/CANCELLED.
export async function GET(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const url       = new URL(req.url)
  const eventId   = url.searchParams.get('event')   ?? ''
  const variantId = url.searchParams.get('variant') ?? ''
  const status    = url.searchParams.get('status')  ?? ''
  const subjectOnly = url.searchParams.get('subjectOnly') === '1'

  if (!isEventId(eventId)) {
    return Response.json({ error: 'Unknown event' }, { status: 404 })
  }

  const event  = getEvent(eventId as EventId)
  const chosen = variantId || event.variants[0].id

  // Shallow-clone the sampleData so per-request tweaks (e.g. status flips)
  // don't leak into the shared registry sample.
  const data: Record<string, unknown> = { ...(event.sampleData as object) }
  if (eventId === 'shipment-update' && (status === 'SHIPPED' || status === 'DELIVERED' || status === 'CANCELLED')) {
    data.status = status
  }

  const rendered = renderWithVariant(eventId as EventId, chosen, data)
  if (!rendered) {
    return Response.json({ error: `Variant "${chosen}" not found` }, { status: 404 })
  }

  if (subjectOnly) {
    return Response.json({ subject: rendered.subject })
  }

  return new Response(rendered.html, {
    headers: {
      'Content-Type':           'text/html; charset=utf-8',
      // Local iframe srcdoc + sandbox already isolates this, but be defensive.
      'Content-Security-Policy': "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; font-src *; base-uri 'none'",
      'X-Content-Type-Options':  'nosniff',
    },
  })
}

import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sendEmail, getEmailConfig } from '@/lib/email'
import { getEvent, renderWithVariant, isEventId, type EventId } from '@/lib/emails/registry'

// POST { to: string, event?: EventId, variant?: string }
// Sends a sample render to `to`. If event/variant are omitted, sends a generic
// "Resend test" so the admin can verify connectivity even before picking
// templates.
export async function POST(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  let body: { to?: unknown; event?: unknown; variant?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const to = typeof body.to === 'string' ? body.to.trim() : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return Response.json({ error: 'Recipient email is required' }, { status: 400 })
  }

  const cfg = await getEmailConfig()
  if (!cfg.apiKey) {
    return Response.json({ error: 'Resend API key not configured. Save it under Connection first.' }, { status: 400 })
  }

  let subject = `Test email from ${cfg.from.replace(/<.*>/, '').trim() || 'Balapasa'}`
  let html    = `<p>This is a test email confirming your Resend connection works.</p><p>Sent at ${new Date().toISOString()}.</p>`

  if (typeof body.event === 'string' && isEventId(body.event)) {
    const event     = getEvent(body.event as EventId)
    const variantId = typeof body.variant === 'string' && body.variant
      ? body.variant
      : event.variants[0].id
    const rendered  = renderWithVariant(
      body.event as EventId,
      variantId,
      event.sampleData,
    )
    if (!rendered) {
      return Response.json({ error: `Variant "${variantId}" not found for event "${body.event}"` }, { status: 400 })
    }
    subject = `[TEST] ${rendered.subject}`
    html    = rendered.html
  }

  const res = await sendEmail({ to, subject, html })
  if (res.error) {
    return Response.json({ error: res.error }, { status: 502 })
  }
  return Response.json({ success: true, id: res.id })
}

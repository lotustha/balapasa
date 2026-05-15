import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  isEventId,
  getEvent,
  getActiveVariantId,
  setActiveVariant,
  type EventId,
} from '@/lib/emails/registry'

// GET /api/admin/emails/templates/[event]
// Returns the event's variants and which one is currently active.
export async function GET(_: NextRequest, ctx: { params: Promise<{ event: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const { event } = await ctx.params
  if (!isEventId(event)) {
    return Response.json({ error: 'Unknown event' }, { status: 404 })
  }
  const eventDef = getEvent(event as EventId)
  const activeId = await getActiveVariantId(event as EventId)

  return Response.json({
    event:    { id: eventDef.id, label: eventDef.label, description: eventDef.description },
    activeId,
    variants: eventDef.variants.map(v => ({
      id:          v.id,
      name:        v.name,
      description: v.description,
      accent:      v.accent,
    })),
  })
}

// POST /api/admin/emails/templates/[event] { variantId: string }
// Persists the admin's variant choice.
export async function POST(req: NextRequest, ctx: { params: Promise<{ event: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const { event } = await ctx.params
  if (!isEventId(event)) {
    return Response.json({ error: 'Unknown event' }, { status: 404 })
  }

  let body: { variantId?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const variantId = typeof body.variantId === 'string' ? body.variantId : ''
  if (!variantId) {
    return Response.json({ error: 'variantId is required' }, { status: 400 })
  }

  try {
    await setActiveVariant(event as EventId, variantId)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
  return Response.json({ success: true, activeId: variantId })
}

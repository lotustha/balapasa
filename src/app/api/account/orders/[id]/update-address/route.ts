import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Customer-authed: edit the delivery address of one of YOUR OWN orders, but
// only while it's still editable. Once the order is SHIPPED or terminal we
// can't change the destination without coordinating with the carrier — that's
// an admin / support flow, not self-serve.

const EDITABLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await ctx.params

  const order = await prisma.order.findUnique({
    where:  { id },
    select: { id: true, userId: true, status: true },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.userId !== user.sub) return Response.json({ error: 'Not your order' }, { status: 403 })
  if (!EDITABLE_STATUSES.has(order.status)) {
    return Response.json(
      { error: `Sorry — this order is already ${order.status.toLowerCase()}. Contact us to change the address.` },
      { status: 409 },
    )
  }

  let body: {
    province?: string; district?: string; municipality?: string; ward?: string
    street?: string; tole?: string; landmark?: string
    lat?: number | null; lng?: number | null
  }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Minimum address validity — same checks NepalAddressSelector enforces.
  const required: Array<keyof typeof body> = ['province', 'district', 'municipality', 'street', 'tole']
  for (const k of required) {
    if (!body[k] || typeof body[k] !== 'string' || !(body[k] as string).trim()) {
      return Response.json({ error: `Missing required field: ${k}` }, { status: 400 })
    }
  }

  // Recompose the flat `address` string the carrier APIs use so the next
  // tracking/dispatch attempt picks up the new address.
  const fullAddress = [
    body.tole, body.street,
    body.ward ? `Ward ${body.ward}` : '',
    body.landmark ? `near ${body.landmark}` : '',
    body.municipality, body.district, body.province,
  ].filter(Boolean).join(', ')

  const updated = await prisma.order.update({
    where: { id },
    data: {
      address:      fullAddress,
      city:         body.municipality!,
      house:        body.ward     ? `Ward ${body.ward}` : null,
      road:         body.street   ?? null,
      lat:          typeof body.lat === 'number' ? body.lat : null,
      lng:          typeof body.lng === 'number' ? body.lng : null,
    },
    select: { id: true, address: true, city: true },
  })

  // Audit trail row so admin can see the customer self-edited.
  try {
    await prisma.orderStatusLog.create({
      data: {
        orderId:   order.id,
        source:    'SYSTEM',
        rawStatus: 'address_edited_by_customer',
        comment:   `Customer updated delivery address to: ${fullAddress}`,
      },
    })
  } catch { /* non-fatal */ }

  return Response.json({ ok: true, order: updated })
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import type { InvoiceStatus } from '@prisma/client'

const ALLOWED: InvoiceStatus[] = ['OPEN', 'PAID', 'OVERDUE', 'VOID']

/**
 * PATCH supports:
 *   { action: 'mark_paid', paymentMethod?, transactionId? } -> PAID + paidAt
 *   { action: 'void' }                                      -> VOID
 *   { status: '<one of ALLOWED>' }                          -> raw set
 *   { notes: '...' }
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const body = await req.json() as Partial<{
      action:        'mark_paid' | 'void'
      status:        InvoiceStatus
      paymentMethod: string
      transactionId: string
      notes:         string
    }>

    const data: Record<string, unknown> = {}

    if (body.action === 'mark_paid') {
      data.status = 'PAID'
      data.paidAt = new Date()
      if (body.paymentMethod) data.paymentMethod = String(body.paymentMethod).trim().toUpperCase()
      if (body.transactionId) data.transactionId = String(body.transactionId).trim()
    } else if (body.action === 'void') {
      data.status = 'VOID'
    }

    if (body.status && ALLOWED.includes(body.status)) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null
    if (body.paymentMethod !== undefined && body.action !== 'mark_paid') {
      data.paymentMethod = body.paymentMethod ? String(body.paymentMethod).trim().toUpperCase() : null
    }
    if (body.transactionId !== undefined && body.action !== 'mark_paid') {
      data.transactionId = body.transactionId ? String(body.transactionId).trim() : null
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: 'no updatable fields' }, { status: 400 })
    }

    const invoice = await prisma.invoice.update({ where: { id }, data })
    return Response.json({ invoice })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { status: true } })
    if (!invoice) return Response.json({ error: 'Not found' }, { status: 404 })
    if (invoice.status === 'PAID') {
      return Response.json(
        { error: 'Cannot delete a paid invoice. Void it instead.' },
        { status: 409 },
      )
    }
    await prisma.invoice.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('STAFF')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params

  try {
    const card = await prisma.giftCard.findUnique({
      where: { id },
      include: { redemptions: { orderBy: { redeemedAt: 'desc' } } },
    })
    if (!card) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ card })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params

  try {
    const body = await req.json() as Partial<{
      isActive:      boolean
      expiresInDays: number | null
      note:          string
    }>

    const data: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (body.note !== undefined) data.note = body.note.trim() || null
    if (body.expiresInDays !== undefined) {
      data.expiresAt = body.expiresInDays && body.expiresInDays > 0
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : null
    }

    const card = await prisma.giftCard.update({ where: { id }, data })
    return Response.json({ card })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params

  try {
    // Check if there are redemptions — if so, block deletion (data integrity)
    const count = await prisma.giftCardRedemption.count({ where: { giftCardId: id } })
    if (count > 0) {
      return Response.json(
        { error: 'Cannot delete a gift card that has been redeemed. Deactivate it instead.' },
        { status: 409 },
      )
    }
    await prisma.giftCard.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

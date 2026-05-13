import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateGiftCardCode } from '@/lib/gift-cards'

export async function GET() {
  const guard = await requireRole('STAFF')
  if ('error' in guard) return guard.error

  try {
    const cards = await prisma.giftCard.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    })
    return Response.json({ cards })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  try {
    const body = await req.json() as Partial<{
      initialValue:   number
      expiresInDays:  number | null
      issuedToEmail:  string
      note:           string
      customCode:     string
    }>

    const initialValue = Number(body.initialValue)
    if (!Number.isFinite(initialValue) || initialValue <= 0) {
      return Response.json({ error: 'initialValue must be a positive number' }, { status: 400 })
    }
    if (initialValue > 1_000_000) {
      return Response.json({ error: 'initialValue is unreasonably large' }, { status: 400 })
    }

    const code = body.customCode?.trim().toUpperCase() || generateGiftCardCode()

    const expiresAt = body.expiresInDays && body.expiresInDays > 0
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const card = await prisma.giftCard.create({
      data: {
        code,
        initialValue,
        balance:       initialValue,
        expiresAt,
        isActive:      true,
        issuedToEmail: body.issuedToEmail?.trim().toLowerCase() || null,
        note:          body.note?.trim() || null,
      },
    })

    return Response.json({ card }, { status: 201 })
  } catch (e) {
    // Unique-code collision
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return Response.json({ error: 'That code is already in use. Pick a different one or leave blank to auto-generate.' }, { status: 409 })
    }
    return Response.json({ error: msg }, { status: 500 })
  }
}

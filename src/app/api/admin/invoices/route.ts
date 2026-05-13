import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateInvoiceNumber } from '@/lib/billing'
import type { InvoiceStatus } from '@prisma/client'

const STATUSES: InvoiceStatus[] = ['OPEN', 'PAID', 'OVERDUE', 'VOID']

export async function GET(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const status = req.nextUrl.searchParams.get('status') as InvoiceStatus | null
  const where = status && STATUSES.includes(status) ? { status } : undefined

  try {
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { select: { id: true, plan: { select: { name: true } } } },
      },
    })

    const userIds = Array.from(new Set(invoices.map(i => i.userId)))
    const users = userIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    return Response.json({
      invoices: invoices.map(i => ({ ...i, user: userMap.get(i.userId) ?? null })),
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

/**
 * POST creates a one-off invoice (no subscription).
 * Body: { userId, amount, dueDate?, notes? }
 */
export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  try {
    const body = await req.json() as Partial<{
      userId: string; amount: number; dueDate: string; notes: string
    }>
    if (!body.userId) return Response.json({ error: 'userId required' }, { status: 400 })
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: 'amount must be > 0' }, { status: 400 })
    }

    const number = await generateInvoiceNumber()
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 7 * 86_400_000)

    const invoice = await prisma.invoice.create({
      data: {
        userId:        body.userId,
        number,
        amount,
        dueDate,
        notes:         body.notes?.trim() || null,
      },
    })
    return Response.json({ invoice }, { status: 201 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const VALID_STATUS = new Set(['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CANCELLED_BY_CUSTOMER'])

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const statusParam = req.nextUrl.searchParams.get('status')
  const where = statusParam && VALID_STATUS.has(statusParam) ? { status: statusParam as never } : {}

  const [items, counts] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: {
        items: { select: { id: true, quantity: true, lineRefundAmount: true } },
      },
    }),
    prisma.returnRequest.groupBy({
      by:     ['status'],
      _count: { _all: true },
    }),
  ])

  // Hydrate order + customer info in one go (no Prisma relation on
  // ReturnRequest.orderId yet, so we join in app code).
  const orderIds = [...new Set(items.map(r => r.orderId))]
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where:  { id: { in: orderIds } },
        select: { id: true, orderCode: true, name: true, total: true, paymentMethod: true, paymentStatus: true, createdAt: true },
      })
    : []
  const byId = new Map(orders.map(o => [o.id, o]))

  const enriched = items.map(r => ({
    ...r,
    createdAt:  r.createdAt.toISOString(),
    updatedAt:  r.updatedAt.toISOString(),
    refundedAt: r.refundedAt?.toISOString() ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    receivedAt: r.receivedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    order:      byId.get(r.orderId) ? {
      ...byId.get(r.orderId)!,
      createdAt: byId.get(r.orderId)!.createdAt.toISOString(),
    } : null,
  }))

  const countByStatus: Record<string, number> = {}
  for (const c of counts) countByStatus[c.status] = c._count._all

  return Response.json({ items: enriched, countByStatus })
}

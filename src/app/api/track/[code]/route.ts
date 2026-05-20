import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { projectOrderDetail } from '../route'

// /api/track/<code> — single order detail by orderCode (or cuid prefix
// fallback). Used by the polling client on the /track-order detail view.

export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const upper = code.toUpperCase()

  const byCode = await prisma.order.findFirst({ where: { orderCode: upper } })
  const order  = byCode
    ?? await prisma.order.findFirst({ where: { id: { startsWith: code.toLowerCase() } } })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  const detail = await projectOrderDetail(order.id)
  if (!detail) return Response.json({ error: 'Order not found' }, { status: 404 })

  // Always-fresh: webhook events may have advanced state seconds ago.
  return Response.json(detail, { headers: { 'Cache-Control': 'no-store' } })
}

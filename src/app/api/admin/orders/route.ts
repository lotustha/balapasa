import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit  = parseInt(searchParams.get('limit') ?? '200', 10)
  const status = searchParams.get('status')
  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return Response.json({ orders: orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })) })
  } catch {
    return Response.json({ orders: [] })
  }
}

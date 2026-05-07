import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) return Response.json({ error: 'Order ID required' }, { status: 400 })

  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: { contains: id, mode: 'insensitive' } },
          // Also allow partial match on pathao order ID
          { pathaoOrderId: { contains: id, mode: 'insensitive' } },
        ],
      },
      include: { items: true },
    })
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
    return Response.json({ order })
  } catch {
    return Response.json({ error: 'DB unavailable' }, { status: 503 })
  }
}

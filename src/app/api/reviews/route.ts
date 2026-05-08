import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return Response.json({ error: 'You must be logged in to review' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return Response.json({ error: 'Invalid session' }, { status: 401 })

  try {
    const { productId, rating, comment } = await req.json()
    if (!productId || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'productId and rating (1-5) are required' }, { status: 400 })
    }

    const review = await prisma.review.upsert({
      where: { userId_productId: { userId: payload.sub, productId } },
      update: { rating, comment: comment || null },
      create: { userId: payload.sub, productId, rating, comment: comment || null },
    })

    // Recalculate product rating
    const agg = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating:      Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })

    return Response.json({ review })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) return Response.json({ error: 'You already reviewed this product' }, { status: 409 })
    return Response.json({ error: msg }, { status: 500 })
  }
}

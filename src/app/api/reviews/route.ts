import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasDeliveredPurchase } from '@/lib/review-eligibility'

// GET /api/reviews?productId=… → the product's reviews + whether the current
// user is allowed to write one (logged in AND has had an order for it delivered).
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) {
    return Response.json({ error: 'productId is required' }, { status: 400 })
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true } } },
    })

    const payload = await getCurrentUser()
    const canReview = payload ? await hasDeliveredPurchase(payload.sub, productId) : false

    return Response.json({
      canReview,
      reviews: reviews.map(r => ({
        id:        r.id,
        rating:    r.rating,
        comment:   r.comment,
        createdAt: r.createdAt,
        name:      r.user?.name ?? 'Customer',
        mine:      payload ? r.userId === payload.sub : false,
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) return Response.json({ error: 'You must be logged in to review' }, { status: 401 })

  try {
    const { productId, rating, comment } = await req.json()
    if (!productId || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'productId and rating (1-5) are required' }, { status: 400 })
    }

    // Verified-delivery gate: only customers whose order for this product has
    // been delivered may review it.
    if (!(await hasDeliveredPurchase(payload.sub, productId))) {
      return Response.json(
        { error: 'You can review a product only after your order for it has been delivered' },
        { status: 403 },
      )
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

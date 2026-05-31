import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Recompute a product's denormalised rating + reviewCount from its reviews.
// Called after any edit/delete so the product card and detail page stay in sync.
async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where:  { productId },
    _avg:   { rating: true },
    _count: true,
  })
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating:      Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  })
}

// PATCH /api/reviews/[id] — edit your own review (rating and/or comment).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'You must be logged in' }, { status: 401 })

  const { id } = await params
  try {
    const { rating, comment } = await req.json()
    if (rating != null && (rating < 1 || rating > 5)) {
      return Response.json({ error: 'rating must be 1-5' }, { status: 400 })
    }

    const existing = await prisma.review.findUnique({ where: { id }, select: { userId: true, productId: true } })
    if (!existing || existing.userId !== user.sub) {
      return Response.json({ error: 'Review not found' }, { status: 404 })
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(rating != null ? { rating } : {}),
        ...(comment !== undefined ? { comment: comment || null } : {}),
      },
    })
    await recomputeProductRating(existing.productId)
    return Response.json({ review })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// DELETE /api/reviews/[id] — remove your own review.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'You must be logged in' }, { status: 401 })

  const { id } = await params
  try {
    const existing = await prisma.review.findUnique({ where: { id }, select: { userId: true, productId: true } })
    if (!existing || existing.userId !== user.sub) {
      return Response.json({ error: 'Review not found' }, { status: 404 })
    }

    await prisma.review.delete({ where: { id } })
    await recomputeProductRating(existing.productId)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

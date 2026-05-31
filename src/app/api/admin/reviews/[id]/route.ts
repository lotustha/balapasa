import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/admin/reviews/[id] — remove a review (spam/abuse) and recompute
// the product's aggregate rating + reviewCount, mirroring the POST /api/reviews
// recalculation so the storefront stays consistent.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } })
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 })

    await prisma.review.delete({ where: { id } })

    const agg = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })

    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

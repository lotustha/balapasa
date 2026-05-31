import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// GET /api/admin/reviews?productId=&rating=&search=
// Moderation list: reviews across all products, newest first, joined with the
// reviewer and the product. Review has real FK relations to both Profile and
// Product, so they're included directly. Secured + mobile-ready via requireRole.
export async function GET(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const sp = req.nextUrl.searchParams
  const productId = sp.get('productId')?.trim() || undefined
  const ratingRaw = sp.get('rating')
  const rating = ratingRaw ? Number(ratingRaw) : undefined
  const search = sp.get('search')?.trim() || ''

  try {
    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    if (rating && rating >= 1 && rating <= 5) where.rating = rating
    if (search) where.comment = { contains: search, mode: 'insensitive' }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { id: true, name: true, slug: true, images: true } },
      },
    })

    const result = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      author: r.user?.name ?? r.user?.email?.split('@')[0] ?? 'Customer',
      product: r.product,
    }))

    return Response.json({ reviews: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, reviews: [] }, { status: 500 })
  }
}

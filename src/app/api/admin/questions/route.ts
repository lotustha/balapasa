import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// GET /api/admin/questions?filter=unanswered|hidden|all&search=
// Staff moderation queue: every product question (approved or hidden), newest
// first, with its answers and the product it belongs to. ProductQuestion has no
// Prisma relation to Product (productId is a bare column), so products are
// joined manually below. Secured + mobile-ready via requireRole (bearer/cookie).
export async function GET(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''

  try {
    const where: Record<string, unknown> = {}
    if (filter === 'hidden') where.isApproved = false
    if (filter === 'unanswered') where.answers = { none: {} }
    if (search) where.body = { contains: search, mode: 'insensitive' }

    const questions = await prisma.productQuestion.findMany({
      where,
      include: { answers: { orderBy: [{ isOfficial: 'desc' }, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Manual product join (no FK relation on ProductQuestion.productId).
    const productIds = [...new Set(questions.map(q => q.productId))]
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, slug: true, images: true },
        })
      : []
    const byId = new Map(products.map(p => [p.id, p]))

    const result = questions.map(q => ({
      ...q,
      product: byId.get(q.productId) ?? null,
    }))

    const counts = {
      all: await prisma.productQuestion.count(),
      unanswered: await prisma.productQuestion.count({ where: { answers: { none: {} } } }),
      hidden: await prisma.productQuestion.count({ where: { isApproved: false } }),
    }

    return Response.json({ questions: result, counts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, questions: [], counts: { all: 0, unanswered: 0, hidden: 0 } }, { status: 500 })
  }
}

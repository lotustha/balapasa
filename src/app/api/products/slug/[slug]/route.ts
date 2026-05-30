import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasDeliveredPurchase } from '@/lib/review-eligibility'

export async function GET(_: NextRequest, ctx: RouteContext<'/api/products/slug/[slug]'>) {
  const { slug } = await ctx.params
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        supplier: true,
        options:  true,
        variants: true,
        plan:     true,
      },
    })
    if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
    const me = await getCurrentUser().catch(() => null)
    const canReview = me ? await hasDeliveredPurchase(me.sub, product.id) : false
    return Response.json({ ...product, canReview })
  } catch {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

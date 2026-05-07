import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      },
    })
    if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(product)
  } catch {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

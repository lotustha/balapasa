import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { subscribeBackInStock } from '@/lib/back-in-stock'

// POST /api/products/[id]/notify-restock  { email? }
// Subscribe to a back-in-stock alert. Signed-in customers are subscribed with
// their account email automatically; guests pass an email in the body. The
// back-in-stock cron sends the alert once the product is restocked.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user   = await getCurrentUser()
  const body   = (await req.json().catch(() => ({}))) as { email?: string }

  // A typed email wins (lets a signed-in user alert a different address); fall
  // back to the account email so signed-in users can subscribe with one tap.
  const email = (body.email || user?.email || '').trim()
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })

  const res = await subscribeBackInStock({ productId: id, email, userId: user?.sub ?? null })
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 })

  return Response.json({ ok: true })
}

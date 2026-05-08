import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

async function getUserId(req: NextRequest): Promise<string | null> {
  const raw = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? req.cookies.get(AUTH_COOKIE)?.value
  if (!raw) return null
  const p = await verifyToken(raw).catch(() => null)
  return p?.sub ?? null
}

// GET /api/wishlist — list user's wishlist with product details
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      // We can't use Prisma relation without defining it — do a manual join
    },
  }).catch(() => [])

  // Fetch products for the wishlist items
  const productIds = items.map(i => i.productId)
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: { category: { select: { name: true, slug: true } } },
      })
    : []

  return NextResponse.json({ wishlist: products })
}

// POST /api/wishlist — toggle (add if missing, remove if exists)
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  })

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } })
    return NextResponse.json({ wishlisted: false })
  }

  await prisma.wishlistItem.create({ data: { userId, productId } })
  return NextResponse.json({ wishlisted: true })
}

// DELETE /api/wishlist?productId=xxx — explicit remove
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  await prisma.wishlistItem.deleteMany({ where: { userId, productId } })
  return NextResponse.json({ removed: true })
}

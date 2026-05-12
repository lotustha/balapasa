import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'No product ids provided' }, { status: 400 })
    }
    const where = { productId: { in: ids } }
    // Cascade child rows that have RESTRICT FKs (Review, InventoryLog) and
    // wishlist orphans (no FK) before deleting the products themselves.
    await prisma.$transaction([
      prisma.review.deleteMany({         where }),
      prisma.wishlistItem.deleteMany({   where }),
      prisma.inventoryLog.deleteMany({   where }),
      prisma.productVariant.deleteMany({ where }),
      prisma.productOption.deleteMany({  where }),
      prisma.product.deleteMany({ where: { id: { in: ids } } }),
    ])
    return Response.json({ success: true, deleted: ids.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

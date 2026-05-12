import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    // Delete in FK dependency order. Review and WishlistItem must go before Product
    // because Review.productId is RESTRICT and WishlistItem has a productId column
    // (no FK but still cleaned to avoid orphans).
    await prisma.$transaction([
      prisma.review.deleteMany(),
      prisma.wishlistItem.deleteMany(),
      prisma.inventoryLog.deleteMany(),
      prisma.productVariant.deleteMany(),
      prisma.productOption.deleteMany(),
      prisma.product.deleteMany(),
    ])
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

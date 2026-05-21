import { prisma } from '@/lib/prisma'

/**
 * Returns the current Deal of the Day — the product flagged with
 * `isDealOfTheDay=true` whose sale window is currently live. If multiple
 * products are flagged (shouldn't happen — see only-one-DOTD enforcement in
 * the products PATCH/POST handlers), the highest-discount one wins.
 */
export async function GET() {
  try {
    const now = new Date()
    const candidates = await prisma.product.findMany({
      where: {
        isActive:       true,
        isDealOfTheDay: true,
        salePrice:      { not: null },
        AND: [
          { OR: [{ salePriceExpiresAt: null }, { salePriceExpiresAt: { gt:  now } }] },
          { OR: [{ salePriceStartsAt:  null }, { salePriceStartsAt:  { lte: now } }] },
        ],
      },
      select: {
        id: true, name: true, slug: true, price: true, salePrice: true,
        salePriceStartsAt: true, salePriceExpiresAt: true,
        stock: true, saleInitialStock: true, maxPerCustomerOnSale: true,
        images: true, brand: true, description: true,
      },
    })

    if (candidates.length === 0) return Response.json({ deal: null })

    // Highest discount wins when more than one slips through.
    const deal = candidates.reduce((best, p) => {
      const discount = (p.price - (p.salePrice ?? p.price)) / p.price
      const bestDiscount = (best.price - (best.salePrice ?? best.price)) / best.price
      return discount > bestDiscount ? p : best
    })

    return Response.json({ deal })
  } catch {
    return Response.json({ deal: null }, { status: 500 })
  }
}

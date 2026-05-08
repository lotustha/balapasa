import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/promotions
 * Returns:
 *  - flashSales: active products with salePrice and salePriceExpiresAt > now
 *  - publicCoupons: active coupons with no expiry or future expiry (public-safe fields only)
 *  - autoDiscountRules: cart-level quantity rules
 */
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)

  const now = new Date()

  const [flashProducts, coupons] = await Promise.all([
    // Flash sales: salePrice set AND (no expiry OR expiry in the future)
    prisma.product.findMany({
      where: {
        isActive:  true,
        salePrice: { not: null },
        OR: [
          { salePriceExpiresAt: null },
          { salePriceExpiresAt: { gt: now } },
        ],
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { salePriceExpiresAt: 'asc' }, // soonest-expiring first
      take: limit,
    }),

    // Public coupons (active, not expired, not maxed out)
    prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true, code: true, type: true, value: true,
        minOrder: true, expiresAt: true, scope: true,
        maxUses: true, usedCount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // Auto-discount rules (static cart rules — extend this array to add more)
  const autoDiscountRules = [
    { id: 'qty3', label: 'Buy 3+, get 5% off',     minQty: 3,  discountPct: 5  },
    { id: 'qty5', label: 'Buy 5+, get 10% off',    minQty: 5,  discountPct: 10 },
    { id: 'qty10','label': 'Buy 10+, get 15% off', minQty: 10, discountPct: 15 },
  ]

  return Response.json({
    flashSales: flashProducts.map(p => ({
      id:                p.id,
      name:              p.name,
      slug:              p.slug,
      price:             p.price,
      salePrice:         p.salePrice,
      salePriceExpiresAt:p.salePriceExpiresAt,
      images:            p.images,
      category:          p.category,
      stock:             p.stock,
      trackInventory:    p.trackInventory,
    })),
    coupons: coupons.map(c => ({
      ...c,
      // Don't expose internal fields; add human-readable discount label
      label: c.type === 'PERCENT'
        ? `${c.value}% off${c.minOrder ? ` on orders over Rs. ${c.minOrder}` : ''}`
        : `Rs. ${c.value} off${c.minOrder ? ` on orders over Rs. ${c.minOrder}` : ''}`,
      spotsLeft: c.maxUses != null ? Math.max(0, c.maxUses - c.usedCount) : null,
    })),
    autoDiscountRules,
  })
}

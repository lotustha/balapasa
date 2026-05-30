import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// A customer may review a product only once an order containing it has actually
// been DELIVERED — not merely confirmed/shipped. Shared by /api/reviews and the
// product-detail endpoints (so the mobile app can read canReview in one call).
const REVIEWABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED]

export async function hasDeliveredPurchase(userId: string, productId: string): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: REVIEWABLE_STATUSES } },
    },
    select: { id: true },
  })
  return item != null
}

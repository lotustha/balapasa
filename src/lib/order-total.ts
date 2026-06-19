import { prisma } from '@/lib/prisma'

// Authoritative order total = (subtotal − all discounts) + delivery charge.
//
// MUST mirror the checkout formula field-for-field (CheckoutClient):
//   total = max(0, subtotal − coupon − auto − giftCard − storeCredit) + delivery
// so assign/cancel/re-assign can never drift the customer's total. Recomputed
// from the order's STORED components rather than delta-adjusting the previous
// total, so it self-heals any prior drift. Gift-card discount is the only
// component not on the Order row (it lives in GiftCardRedemption); we sum it.
export async function computeOrderTotal(
  order: {
    id: string
    subtotal: number
    couponDiscount: number | null
    autoDiscount: number | null
    storeCreditUsed: number | null
  },
  deliveryCharge: number,
): Promise<number> {
  const gc = await prisma.giftCardRedemption
    .aggregate({ where: { orderId: order.id }, _sum: { amount: true } })
    .catch(() => ({ _sum: { amount: 0 } as { amount: number | null } }))
  const giftCard = gc._sum.amount ?? 0
  const base =
    order.subtotal -
    (order.couponDiscount ?? 0) -
    (order.autoDiscount ?? 0) -
    giftCard -
    (order.storeCreditUsed ?? 0)
  return Math.max(0, base + (deliveryCharge || 0))
}

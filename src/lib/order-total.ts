import { prisma } from '@/lib/prisma'

// Authoritative order total = (subtotal − all discounts) + delivery charge.
//
// Recomputed from the order's STORED components rather than delta-adjusting the
// previous total, so it self-heals any prior drift (e.g. an old cancel that
// zeroed deliveryCharge without reducing total, then a re-assign that added the
// charge back → double-count). Gift-card discount is the only component not on
// the Order row (it lives in GiftCardRedemption), so we sum it from there.
export async function computeOrderTotal(
  order: { id: string; subtotal: number; couponDiscount: number | null; autoDiscount: number | null },
  deliveryCharge: number,
): Promise<number> {
  const gc = await prisma.giftCardRedemption
    .aggregate({ where: { orderId: order.id }, _sum: { amount: true } })
    .catch(() => ({ _sum: { amount: 0 } as { amount: number | null } }))
  const giftCard = gc._sum.amount ?? 0
  const base = order.subtotal - (order.couponDiscount ?? 0) - (order.autoDiscount ?? 0) - giftCard
  return Math.max(0, base + (deliveryCharge || 0))
}

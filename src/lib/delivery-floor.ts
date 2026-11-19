// The lowest delivery charge an order can legitimately carry. The checkout page works the real
// charge out from live courier quotes, which the server cannot reproduce exactly (they depend on
// the branch and option the customer picked), so the order API checks the sent charge against this
// floor instead: it stops an order being posted with delivery at Rs 0 when nothing makes it free.

/** The cheapest option checkout ever offers (self pickup). Keep equal to STORE_PICKUP_PRICE in
 *  src/app/api/shipping/coverage/route.ts. */
export const CHEAPEST_DELIVERY_OPTION = 50

export interface DeliveryFloorInput {
  subtotal: number
  /** Value of the lines whose product is not flagged "free delivery". */
  nonFreeSubtotal: number
  freeDeliveryThreshold: number
  /** Delivery credit from an active DELIVERY_SUBSIDY rule, 0 when none. */
  deliverySubsidy: number
}

export function minimumDeliveryCharge(i: DeliveryFloorInput): number {
  if (i.subtotal <= 0) return 0
  if (i.subtotal >= i.freeDeliveryThreshold) return 0
  if (i.nonFreeSubtotal <= 0) return 0
  const share = Math.min(1, i.nonFreeSubtotal / i.subtotal)
  return Math.max(0, Math.round(CHEAPEST_DELIVERY_OPTION * share) - Math.max(0, i.deliverySubsidy))
}

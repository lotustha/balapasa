import { prisma } from '@/lib/prisma'

export interface CouponCartItem {
  productId: string
  price:     number   // unit price after sale
  quantity:  number
}

export interface CouponValidationOk {
  valid:              true
  discount:           number
  qualifyingSubtotal: number
  scope:              string
  coupon: {
    id:    string
    code:  string
    type:  'PERCENT' | 'FIXED'
    value: number
    scope: string
  }
}

export interface CouponValidationError {
  valid:  false
  status: number
  error:  string
}

export type CouponValidationResult = CouponValidationOk | CouponValidationError

/**
 * Validate a coupon code against a cart and compute the discount.
 * Used by both /api/coupons/validate (UI preview) and /api/orders (final validation).
 *
 * This does NOT increment usedCount or mutate state — caller is responsible for
 * applying the coupon atomically when the order is actually created.
 */
export async function validateCoupon(input: {
  code:     string
  subtotal: number
  items:    CouponCartItem[]
}): Promise<CouponValidationResult> {
  const code = input.code.toUpperCase().trim()
  if (!code) return { valid: false, status: 400, error: 'Coupon code required' }

  const coupon = await prisma.coupon.findUnique({ where: { code } })

  if (!coupon)          return { valid: false, status: 404, error: 'Invalid coupon code' }
  if (!coupon.isActive) return { valid: false, status: 400, error: 'This coupon is no longer active' }
  if (coupon.expiresAt && coupon.expiresAt < new Date())
                        return { valid: false, status: 400, error: 'This coupon has expired' }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
                        return { valid: false, status: 400, error: 'Coupon usage limit reached' }

  // ── Determine qualifying subtotal based on scope ──────────────────
  let qualifyingSubtotal = input.subtotal

  if (coupon.scope === 'PRODUCT' && coupon.productIds.length > 0 && input.items.length > 0) {
    const allowed = new Set(coupon.productIds)
    qualifyingSubtotal = input.items
      .filter(i => allowed.has(i.productId))
      .reduce((s, i) => s + i.price * i.quantity, 0)
    if (qualifyingSubtotal === 0) {
      return { valid: false, status: 400, error: 'This coupon is not valid for the items in your cart' }
    }
  }

  if (coupon.scope === 'CATEGORY' && coupon.categoryIds.length > 0 && input.items.length > 0) {
    const productIds = input.items.map(i => i.productId)
    const products = await prisma.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true, categoryId: true },
    })
    const catMap: Record<string, string> = {}
    for (const p of products) catMap[p.id] = p.categoryId
    const allowed = new Set(coupon.categoryIds)
    qualifyingSubtotal = input.items
      .filter(i => allowed.has(catMap[i.productId] ?? ''))
      .reduce((s, i) => s + i.price * i.quantity, 0)
    if (qualifyingSubtotal === 0) {
      return { valid: false, status: 400, error: 'This coupon is not valid for the categories in your cart' }
    }
  }

  // ── Min order ──────────────────────────────────────────────────────
  if (coupon.minOrder !== null && qualifyingSubtotal < coupon.minOrder) {
    return {
      valid: false, status: 400,
      error: `Minimum qualifying order of NPR ${coupon.minOrder.toLocaleString()} required`,
    }
  }

  // ── Discount math (rounded to integer NPR for both types — receipts match) ──
  const rawDiscount = coupon.type === 'PERCENT'
    ? (qualifyingSubtotal * coupon.value) / 100
    : Math.min(coupon.value, qualifyingSubtotal)
  const discount = Math.round(rawDiscount)

  return {
    valid: true,
    discount,
    qualifyingSubtotal,
    scope: coupon.scope,
    coupon: {
      id:    coupon.id,
      code:  coupon.code,
      type:  coupon.type,
      value: coupon.value,
      scope: coupon.scope,
    },
  }
}

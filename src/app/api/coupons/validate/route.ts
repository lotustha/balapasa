import { NextRequest } from 'next/server'
import { validateCoupon, type CouponCartItem } from '@/lib/coupons'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal, items = [] } = await req.json() as {
      code: string; subtotal: number; items?: CouponCartItem[]
    }
    const result = await validateCoupon({ code, subtotal, items })
    if (!result.valid) {
      return Response.json({ error: result.error }, { status: result.status })
    }
    return Response.json({
      valid:              true,
      discount:           result.discount,
      qualifyingSubtotal: result.qualifyingSubtotal,
      scope:              result.scope,
      coupon:             result.coupon,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

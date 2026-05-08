import { prisma } from '@/lib/prisma'

export interface DiscountRule {
  id:           string
  type:         'DELIVERY_SUBSIDY' | 'ORDER_DISCOUNT'
  minOrder:     number
  deliveryCredit?: number   // for DELIVERY_SUBSIDY — NPR off delivery
  percent?:     number      // for ORDER_DISCOUNT — % off subtotal
  maxDiscount?: number      // for ORDER_DISCOUNT — cap in NPR
  isActive:     boolean
  label:        string
}

export async function getRules(): Promise<DiscountRule[]> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'DISCOUNT_RULES' } })
    if (!row) return []
    return JSON.parse(row.value) as DiscountRule[]
  } catch { return [] }
}

export async function GET() {
  const rules = await getRules()
  return Response.json({ rules: rules.filter(r => r.isActive) })
}

/** Given a subtotal, compute auto-discounts from active rules.
 *  Returns { deliverySubsidy, orderDiscount } both in NPR. */
export function computeAutoDiscounts(rules: DiscountRule[], subtotal: number) {
  const active = rules.filter(r => r.isActive && subtotal >= r.minOrder)

  // Delivery subsidy: pick the highest-tier matching rule
  const subsidyRule = active
    .filter(r => r.type === 'DELIVERY_SUBSIDY')
    .sort((a, b) => b.minOrder - a.minOrder)[0]
  const deliverySubsidy = subsidyRule?.deliveryCredit ?? 0

  // Order discount: apply all matching ORDER_DISCOUNT rules, capped individually
  let orderDiscount = 0
  for (const r of active.filter(r => r.type === 'ORDER_DISCOUNT')) {
    const raw = r.percent ? Math.round((subtotal * r.percent) / 100) : 0
    orderDiscount += r.maxDiscount ? Math.min(raw, r.maxDiscount) : raw
  }

  return { deliverySubsidy, orderDiscount }
}

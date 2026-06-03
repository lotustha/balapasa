import { prisma } from '@/lib/prisma'
import { computeAutoDiscounts, type DiscountRule } from '@/lib/discounts'

// Re-exported so existing importers (`@/app/api/discount-rules/route`) keep
// working; the implementation now lives in the prisma-free '@/lib/discounts'.
export { computeAutoDiscounts }
export type { DiscountRule }

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

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json() as { code: string; subtotal: number }
    if (!code) return Response.json({ error: 'Coupon code required' }, { status: 400 })

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } })

    if (!coupon)           return Response.json({ error: 'Invalid coupon code' },        { status: 404 })
    if (!coupon.isActive)  return Response.json({ error: 'This coupon is no longer active' }, { status: 400 })
    if (coupon.expiresAt && coupon.expiresAt < new Date())
                           return Response.json({ error: 'This coupon has expired' },    { status: 400 })
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
                           return Response.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    if (coupon.minOrder !== null && subtotal < coupon.minOrder)
                           return Response.json({ error: `Minimum order of NPR ${coupon.minOrder.toLocaleString()} required` }, { status: 400 })

    const discount = coupon.type === 'PERCENT'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal)

    return Response.json({ valid: true, discount, coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

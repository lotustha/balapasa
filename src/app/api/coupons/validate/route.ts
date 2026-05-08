import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CartItem { productId: string; price: number; quantity: number }

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal, items = [] } = await req.json() as {
      code: string; subtotal: number; items?: CartItem[]
    }
    if (!code) return Response.json({ error: 'Coupon code required' }, { status: 400 })

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } })

    if (!coupon)          return Response.json({ error: 'Invalid coupon code' },             { status: 404 })
    if (!coupon.isActive) return Response.json({ error: 'This coupon is no longer active' }, { status: 400 })
    if (coupon.expiresAt && coupon.expiresAt < new Date())
                          return Response.json({ error: 'This coupon has expired' },          { status: 400 })
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
                          return Response.json({ error: 'Coupon usage limit reached' },       { status: 400 })

    // ── Determine qualifying subtotal based on scope ──────────────────
    let qualifyingSubtotal = subtotal

    if (coupon.scope === 'PRODUCT' && coupon.productIds.length > 0 && items.length > 0) {
      const allowed = new Set(coupon.productIds)
      qualifyingSubtotal = items
        .filter(i => allowed.has(i.productId))
        .reduce((s, i) => s + i.price * i.quantity, 0)
      if (qualifyingSubtotal === 0)
        return Response.json({ error: 'This coupon is not valid for the items in your cart' }, { status: 400 })
    }

    if (coupon.scope === 'CATEGORY' && coupon.categoryIds.length > 0 && items.length > 0) {
      const productIds = items.map(i => i.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true },
      })
      const catMap: Record<string, string> = {}
      for (const p of products) catMap[p.id] = p.categoryId
      const allowed = new Set(coupon.categoryIds)
      qualifyingSubtotal = items
        .filter(i => allowed.has(catMap[i.productId] ?? ''))
        .reduce((s, i) => s + i.price * i.quantity, 0)
      if (qualifyingSubtotal === 0)
        return Response.json({ error: 'This coupon is not valid for the categories in your cart' }, { status: 400 })
    }

    // ── Min order check against qualifying subtotal ───────────────────
    if (coupon.minOrder !== null && qualifyingSubtotal < coupon.minOrder)
      return Response.json({ error: `Minimum qualifying order of NPR ${coupon.minOrder.toLocaleString()} required` }, { status: 400 })

    const discount = coupon.type === 'PERCENT'
      ? Math.round((qualifyingSubtotal * coupon.value) / 100)
      : Math.min(coupon.value, qualifyingSubtotal)

    return Response.json({
      valid: true,
      discount,
      qualifyingSubtotal,
      scope: coupon.scope,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, scope: coupon.scope },
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

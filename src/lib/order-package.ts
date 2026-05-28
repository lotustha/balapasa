import { prisma } from '@/lib/prisma'
import type { Pkg } from '@/lib/carrier-limits'

// Aggregate an order's physical parcel from its line items' products:
// total weight = Σ(product.weight × quantity); each dimension = the longest
// across all items (parcels are bundled, so the largest item dictates size).
// A 0 on any axis means that data is missing on the products (treated as
// "unknown" by the limit checks).
export async function aggregateOrderPackage(orderId: string): Promise<Pkg> {
  const items = await prisma.orderItem.findMany({ where: { orderId } })
  const productIds = items.map(i => i.productId).filter((x): x is string => !!x)
  const products = productIds.length
    ? await prisma.product.findMany({
        where:  { id: { in: productIds } },
        select: { id: true, weight: true, length: true, width: true, height: true },
      })
    : []
  const pById = new Map(products.map(p => [p.id, p]))

  let weightKg = 0, lengthCm = 0, widthCm = 0, heightCm = 0
  for (const it of items) {
    const p = it.productId ? pById.get(it.productId) : null
    if (p?.weight) weightKg += p.weight * it.quantity
    if (p?.length) lengthCm = Math.max(lengthCm, p.length)
    if (p?.width)  widthCm  = Math.max(widthCm,  p.width)
    if (p?.height) heightCm = Math.max(heightCm, p.height)
  }
  return { weightKg, lengthCm, widthCm, heightCm }
}

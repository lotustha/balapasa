import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { productId, type, quantity, note } = await req.json() as {
    productId: string
    type: 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'
    quantity: number
    note?: string
  }

  if (!productId || !type || quantity === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, trackInventory: true, name: true },
  })
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })
  if (!product.trackInventory) return Response.json({ error: 'Inventory tracking is disabled for this product' }, { status: 400 })

  // Positive types increase stock; DAMAGE/SALE decrease
  const delta     = ['DAMAGE'].includes(type) ? -Math.abs(quantity) : Math.abs(quantity)
  const newStock  = Math.max(0, product.stock + delta)

  const [updated] = await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
    prisma.inventoryLog.create({
      data: { productId, type, quantity: delta, stockAfter: newStock, note: note || null },
    }),
  ])

  return Response.json({ success: true, stock: newStock, product: product.name })
}

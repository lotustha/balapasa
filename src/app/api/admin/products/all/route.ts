import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    // Delete in dependency order (inventory logs → variants → options → products)
    await prisma.inventoryLog.deleteMany()
    await prisma.productVariant.deleteMany()
    await prisma.productOption.deleteMany()
    await prisma.product.deleteMany()
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

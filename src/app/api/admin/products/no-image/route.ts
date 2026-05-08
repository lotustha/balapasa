import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.product.count({ where: { images: { isEmpty: true } } })
    return Response.json({ count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const targets = await prisma.product.findMany({
      where: { images: { isEmpty: true } },
      select: { id: true },
    })
    const ids = targets.map(p => p.id)
    if (ids.length === 0) return Response.json({ success: true, deleted: 0 })

    await prisma.inventoryLog.deleteMany({ where: { productId: { in: ids } } })
    await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } })
    await prisma.productOption.deleteMany({ where: { productId: { in: ids } } })
    await prisma.product.deleteMany({ where: { id: { in: ids } } })

    return Response.json({ success: true, deleted: ids.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        reviews: { include: { user: { select: { name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(product)
  } catch {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const {
      name, slug, description, price, salePrice, costPrice,
      stock, lowStockThreshold, images, categoryId, supplierId,
      tags, isActive, isFeatured, isNew, isTaxable, trackInventory,
      brand, sku, barcode, weight, boughtTogetherIds,
    } = body

    const data: Record<string, unknown> = {}
    if (name              !== undefined) data.name              = name
    if (slug              !== undefined) data.slug              = slug
    if (description       !== undefined) data.description       = description
    if (price             !== undefined) data.price             = Number(price)
    if (salePrice         !== undefined) data.salePrice         = salePrice  ? Number(salePrice)  : null
    if (costPrice         !== undefined) data.costPrice         = costPrice  ? Number(costPrice)  : null
    if (stock             !== undefined) data.stock             = Number(stock)
    if (lowStockThreshold !== undefined) data.lowStockThreshold = Number(lowStockThreshold)
    if (images            !== undefined) data.images            = images
    if (categoryId        !== undefined) data.categoryId        = categoryId
    if (supplierId        !== undefined) data.supplierId        = supplierId || null
    if (tags              !== undefined) data.tags              = tags
    if (isActive          !== undefined) data.isActive          = isActive
    if (isFeatured        !== undefined) data.isFeatured        = isFeatured
    if (isNew             !== undefined) data.isNew             = isNew
    if (isTaxable         !== undefined) data.isTaxable         = isTaxable
    if (trackInventory    !== undefined) data.trackInventory    = trackInventory
    if (brand             !== undefined) data.brand             = brand   || null
    if (sku               !== undefined) data.sku               = sku     || null
    if (barcode           !== undefined) data.barcode           = barcode || null
    if (weight            !== undefined) data.weight            = weight  ? Number(weight) : null
    if (boughtTogetherIds !== undefined) data.boughtTogetherIds = Array.isArray(boughtTogetherIds) ? boughtTogetherIds : []

    const product = await prisma.product.update({ where: { id }, data })
    return Response.json(product)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  try {
    // Hard delete — OrderItem.productId has no FK constraint and snapshots name/image,
    // so order history survives. Cascade child rows that have RESTRICT FKs.
    await prisma.$transaction([
      prisma.review.deleteMany({         where: { productId: id } }),
      prisma.wishlistItem.deleteMany({   where: { productId: id } }),
      prisma.inventoryLog.deleteMany({   where: { productId: id } }),
      prisma.productVariant.deleteMany({ where: { productId: id } }),
      prisma.productOption.deleteMany({  where: { productId: id } }),
      prisma.product.delete({            where: { id } }),
    ])
    // Image files on disk are kept so historical order receipts continue to render.
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasDeliveredPurchase } from '@/lib/review-eligibility'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        options:  true,
        variants: true,
        plan:     true,
        reviews: { include: { user: { select: { name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
    // canReview: logged-in (bearer/cookie) customer who has had an order for this
    // product delivered. Lets the mobile app gate the rating UI from one call.
    const me = await getCurrentUser().catch(() => null)
    const canReview = me ? await hasDeliveredPurchase(me.sub, product.id) : false

    // Bundle components — BundleItem has no Prisma relation to Product (scalar
    // FK only), so resolve names/images/prices with a manual join. Lets the
    // admin edit form prefill the "Bundle contents" picker in one call.
    let bundleComponents: {
      componentProductId: string; quantity: number
      name: string; image: string | null; price: number
    }[] = []
    if (product.kind === 'BUNDLE') {
      const items = await prisma.bundleItem.findMany({
        where: { bundleProductId: product.id },
        orderBy: { sortOrder: 'asc' },
      })
      if (items.length) {
        const comps = await prisma.product.findMany({
          where: { id: { in: items.map(i => i.componentProductId) } },
          select: { id: true, name: true, images: true, price: true, salePrice: true },
        })
        const byId = new Map(comps.map(c => [c.id, c]))
        bundleComponents = items
          .filter(i => byId.has(i.componentProductId))
          .map(i => {
            const c = byId.get(i.componentProductId)!
            return {
              componentProductId: i.componentProductId,
              quantity: i.quantity,
              name:  c.name,
              image: c.images?.[0] ?? null,
              price: c.salePrice ?? c.price,
            }
          })
      }
    }

    return Response.json({ ...product, canReview, bundleComponents })
  } catch {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const {
      name, slug, description, price, salePrice,
      salePriceStartsAt, salePriceExpiresAt, maxPerCustomerOnSale, isDealOfTheDay,
      costPrice,
      stock, lowStockThreshold, images, categoryId, supplierId,
      tags, isActive, isFeatured, isNew, isTaxable, trackInventory, freeDelivery,
      brand, sku, barcode, weight, length, width, height, boughtTogetherIds,
      kind, planId,
      variantOptions, variants, bundleComponents, faqs,
    } = body as Record<string, unknown> & {
      variantOptions?: { name: string; values: string[] }[]
      variants?: { title: string; sku?: string | null; price?: number | null; stock?: number; image?: string | null; options: Record<string, string> }[]
      bundleComponents?: { componentProductId: string; quantity: number }[]
      faqs?: { q: string; a: string }[]
    }

    const data: Record<string, unknown> = {}
    if (name              !== undefined) data.name              = name
    if (slug              !== undefined) data.slug              = slug
    if (description       !== undefined) data.description       = description
    if (price             !== undefined) data.price             = Number(price)
    if (salePrice         !== undefined) data.salePrice         = salePrice  ? Number(salePrice)  : null
    if (salePriceStartsAt  !== undefined) data.salePriceStartsAt  = salePriceStartsAt  ? new Date(salePriceStartsAt as string)  : null
    if (salePriceExpiresAt !== undefined) data.salePriceExpiresAt = salePriceExpiresAt ? new Date(salePriceExpiresAt as string) : null
    if (maxPerCustomerOnSale !== undefined) data.maxPerCustomerOnSale = maxPerCustomerOnSale ? Number(maxPerCustomerOnSale) : null
    if (isDealOfTheDay    !== undefined) data.isDealOfTheDay    = isDealOfTheDay === true || isDealOfTheDay === 'true'
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
    if (freeDelivery      !== undefined) data.freeDelivery      = freeDelivery === true || freeDelivery === 'true'
    if (brand             !== undefined) data.brand             = brand   || null
    if (sku               !== undefined) data.sku               = sku     || null
    if (barcode           !== undefined) data.barcode           = barcode || null
    if (weight            !== undefined) data.weight            = weight  ? Number(weight) : null
    if (length            !== undefined) data.length            = length  ? Number(length) : null
    if (width             !== undefined) data.width             = width   ? Number(width)  : null
    if (height            !== undefined) data.height            = height  ? Number(height) : null
    if (boughtTogetherIds !== undefined) data.boughtTogetherIds = Array.isArray(boughtTogetherIds) ? boughtTogetherIds : []
    if (kind   !== undefined) data.kind   = kind
    if (planId !== undefined) data.planId = planId || null
    // Editable SEO FAQ → aiFaqJson (admin form can now edit, not just AI-generate).
    if (faqs   !== undefined) data.aiFaqJson = Array.isArray(faqs) ? faqs : null

    // If the body includes variant fields, treat them as the full desired state
    // and replace existing rows. The admin form always sends the complete list,
    // so a wholesale replace is simpler and safer than diffing by id/title.
    const replaceVariants = variants !== undefined
    const replaceOptions  = variantOptions !== undefined

    const product = await prisma.$transaction(async tx => {
      // Snapshot stock when the sale transitions from inactive → active so the
      // "% claimed" bar has a baseline. Clear the snapshot when sale ends.
      const existing = await tx.product.findUnique({
        where: { id },
        select: { salePrice: true, saleInitialStock: true, stock: true, kind: true },
      })
      // A bundle's availability is derived from its components, so its own stock
      // is never tracked — force it off whenever the product is (or becomes) a bundle.
      const effectiveKind = (data.kind as string | undefined) ?? existing?.kind
      if (effectiveKind === 'BUNDLE') data.trackInventory = false
      if (existing) {
        const becomingActive = data.salePrice !== undefined && data.salePrice !== null && existing.salePrice == null
        const becomingInactive = data.salePrice !== undefined && data.salePrice === null && existing.salePrice != null
        if (becomingActive && existing.saleInitialStock == null) {
          data.saleInitialStock = (data.stock as number | undefined) ?? existing.stock
        }
        if (becomingInactive) {
          data.saleInitialStock = null
        }
      }

      const updated = await tx.product.update({ where: { id }, data })

      // Only one product can be DOTD at a time.
      if (data.isDealOfTheDay === true) {
        await tx.product.updateMany({
          where: { isDealOfTheDay: true, NOT: { id } },
          data:  { isDealOfTheDay: false },
        })
      }

      if (replaceOptions) {
        await tx.productOption.deleteMany({ where: { productId: id } })
        if (Array.isArray(variantOptions) && variantOptions.length) {
          await tx.productOption.createMany({
            data: variantOptions.map((opt, i) => ({
              productId: id, name: opt.name, values: opt.values, position: i,
            })),
          })
        }
      }

      if (replaceVariants) {
        // Variant rows may carry a unique SKU — delete first so re-using SKUs works.
        await tx.productVariant.deleteMany({ where: { productId: id } })
        if (Array.isArray(variants) && variants.length) {
          await tx.productVariant.createMany({
            data: variants.map(v => ({
              productId: id,
              title:     v.title,
              sku:       v.sku   || null,
              price:     v.price != null ? Number(v.price) : null,
              stock:     Number(v.stock ?? 0),
              image:     v.image || null,
              options:   v.options,
            })),
          })
        }
      }

      // Bundle components — wholesale replace (admin form sends the full list).
      // Guards: drop self-references and nested bundles so a bundle can never
      // deduct itself or another kit recursively.
      if (effectiveKind === 'BUNDLE' && bundleComponents !== undefined) {
        await tx.bundleItem.deleteMany({ where: { bundleProductId: id } })
        const wanted = (bundleComponents ?? []).filter(c => c.componentProductId && c.componentProductId !== id)
        const kinds = wanted.length
          ? await tx.product.findMany({ where: { id: { in: wanted.map(c => c.componentProductId) } }, select: { id: true, kind: true } })
          : []
        const allowed = new Set(kinds.filter(k => k.kind !== 'BUNDLE').map(k => k.id))
        const rows = wanted
          .filter(c => allowed.has(c.componentProductId))
          .map((c, i) => ({
            bundleProductId:    id,
            componentProductId: c.componentProductId,
            quantity:           Math.max(1, Math.floor(Number(c.quantity) || 1)),
            sortOrder:          i,
          }))
        if (rows.length) await tx.bundleItem.createMany({ data: rows, skipDuplicates: true })
      }

      return updated
    })

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
      // Remove this product both AS a bundle and as a component of other bundles.
      prisma.bundleItem.deleteMany({     where: { OR: [{ bundleProductId: id }, { componentProductId: id }] } }),
      prisma.product.delete({            where: { id } }),
    ])
    // Image files on disk are kept so historical order receipts continue to render.
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category   = searchParams.get('category')
  const search     = searchParams.get('search')
  const featured   = searchParams.get('featured')
  const flash      = searchParams.get('flash')      // 'true' = only products with active salePrice
  const status     = searchParams.get('status')     // 'active' | 'draft' | null (null = active only for shop)
  const stock      = searchParams.get('stock')      // 'low' | 'out' | null
  const supplierId = searchParams.get('supplier')
  const admin      = searchParams.get('admin') === 'true' // admin mode: no isActive filter
  const sort       = searchParams.get('sort') ?? 'newest'
  const limit      = parseInt(searchParams.get('limit') ?? '24', 10)
  const page       = parseInt(searchParams.get('page') ?? '1', 10)
  const skip       = (page - 1) * limit
  const slugsParam = searchParams.get('slugs')
  const idsParam   = searchParams.get('ids')        // comma-separated product ids (e.g. coupon edit)

  try {
    const where: Record<string, unknown> = {}

    // Slug lookup (used by Recently Viewed) — bypass other filters
    if (slugsParam) {
      const slugs = slugsParam.split(',').filter(Boolean).slice(0, 12)
      const products = await prisma.product.findMany({
        where: { slug: { in: slugs }, isActive: true },
        select: {
          id: true, name: true, slug: true,
          price: true, salePrice: true, salePriceExpiresAt: true,
          images: true, rating: true, reviewCount: true, brand: true,
        },
      })
      const now = new Date()
      const normalized = products.map(p =>
        p.salePriceExpiresAt && p.salePriceExpiresAt <= now
          ? { ...p, salePrice: null, salePriceExpiresAt: null }
          : p
      )
      return Response.json({ products: normalized })
    }

    // Shop always sees only active; admin can filter by status
    if (admin) {
      if (status === 'active') where.isActive = true
      else if (status === 'draft') where.isActive = false
      // else: no filter — show all
    } else {
      where.isActive = true
    }

    if (idsParam)            where.id          = { in: idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50) }
    if (category)            where.category    = { slug: category }
    if (featured === 'true') where.isFeatured  = true
    if (supplierId)          where.supplierId  = supplierId
    if (stock === 'out')  where.stock = 0
    if (stock === 'low')  Object.assign(where, { trackInventory: true, stock: { gt: 0, lte: 10 } })
    if (flash === 'true') {
      const now = new Date()
      where.salePrice = { not: null }
      where.AND = [
        { OR: [{ salePriceExpiresAt: null }, { salePriceExpiresAt: { gt: now } }] },
        { OR: [{ salePriceStartsAt:  null }, { salePriceStartsAt:  { lte: now } }] },
      ]
    }

    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand:       { contains: search, mode: 'insensitive' } },
        { sku:         { contains: search, mode: 'insensitive' } },
        { tags:        { hasSome: [search] } },
      ]
    }

    const orderBy: Record<string, string> =
      sort === 'price-asc'   ? { price:     'asc'  } :
      sort === 'price-desc'  ? { price:     'desc' } :
      sort === 'stock-asc'   ? { stock:     'asc'  } :
      sort === 'stock-desc'  ? { stock:     'desc' } :
      sort === 'name-asc'    ? { name:      'asc'  } :
      sort === 'name-desc'   ? { name:      'desc' } :
      sort === 'rating'      ? { rating:    'desc' } :
                               { createdAt: 'desc' }

    const include = admin
      ? { category: { select: { name: true, slug: true } }, supplier: { select: { id: true, name: true, email: true } } }
      : { category: { select: { name: true, slug: true } } }

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, include, take: limit, skip }),
      prisma.product.count({ where }),
    ])

    // Null out salePrice when the sale is not currently live (expired OR
    // scheduled for the future). Admin requests with admin=true bypass this
    // masking so the editor can show what's saved.
    const now = new Date()
    const products = admin ? rawProducts : rawProducts.map(p => {
      const expired   = p.salePriceExpiresAt && p.salePriceExpiresAt <= now
      const scheduled = p.salePriceStartsAt  && p.salePriceStartsAt  >  now
      if (expired || scheduled) {
        return { ...p, salePrice: null, salePriceExpiresAt: expired ? null : p.salePriceExpiresAt }
      }
      return p
    })

    return Response.json({ products, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, slug, description, price, salePrice,
      salePriceStartsAt, salePriceExpiresAt, maxPerCustomerOnSale, isDealOfTheDay,
      costPrice,
      stock, lowStockThreshold, images, categoryId, supplierId,
      tags, isActive, isFeatured, isNew, isTaxable, trackInventory, freeDelivery,
      brand, sku, barcode, weight, length, width, height, videoUrl, boughtTogetherIds,
      kind, planId,
    } = body

    if (!name || !slug || !description || price == null || !categoryId) {
      return Response.json({ error: 'Missing required fields: name, slug, description, price, categoryId' }, { status: 400 })
    }

    const { variantOptions, variants, bundleComponents, faqs } = body as {
      variantOptions?: { name: string; values: string[] }[]
      variants?: { title: string; sku?: string; price?: number; stock: number; image?: string; options: Record<string, string> }[]
      bundleComponents?: { componentProductId: string; quantity: number }[]
      faqs?: { q: string; a: string }[]
    }
    const isBundle = kind === 'BUNDLE'

    const product = await prisma.product.create({
      data: {
        name, slug, description,
        price:             Number(price),
        salePrice:         salePrice  ? Number(salePrice)  : null,
        costPrice:         costPrice  ? Number(costPrice)  : null,
        stock:             Number(stock ?? 10),
        lowStockThreshold: Number(lowStockThreshold ?? 10),
        images:            Array.isArray(images) ? images : [],
        categoryId,
        supplierId:        supplierId || null,
        tags:              Array.isArray(tags) ? tags : [],
        isActive:          isActive  ?? true,
        isFeatured:        isFeatured ?? false,
        isNew:             isNew      ?? false,
        isTaxable:         isTaxable  ?? false,
        // A bundle's stock is derived from components — never track its own.
        trackInventory:    isBundle ? false : (trackInventory ?? true),
        kind:              kind   || 'PHYSICAL',
        planId:            planId || null,
        freeDelivery:      freeDelivery === true || freeDelivery === 'true',
        brand:             brand    || null,
        sku:               sku      || null,
        barcode:           barcode  || null,
        weight:            weight   ? Number(weight) : null,
        length:            length   ? Number(length) : null,
        width:             width    ? Number(width)  : null,
        height:            height   ? Number(height) : null,
        videoUrl:             videoUrl || null,
        salePriceStartsAt:    salePriceStartsAt  ? new Date(salePriceStartsAt)  : null,
        salePriceExpiresAt:   salePriceExpiresAt ? new Date(salePriceExpiresAt) : null,
        maxPerCustomerOnSale: maxPerCustomerOnSale ? Number(maxPerCustomerOnSale) : null,
        isDealOfTheDay:       isDealOfTheDay === true || isDealOfTheDay === 'true',
        // Snapshot stock when creating a product that already has a sale price.
        saleInitialStock:     salePrice ? Number(stock ?? 10) : null,
        boughtTogetherIds:    Array.isArray(boughtTogetherIds) ? boughtTogetherIds : [],
        aiFaqJson:            Array.isArray(faqs) && faqs.length ? faqs : undefined,
      },
    })

    // Only one product can be DOTD at a time. If this one was flagged, clear
    // the flag on any other product.
    if (isDealOfTheDay === true || isDealOfTheDay === 'true') {
      await prisma.product.updateMany({
        where: { isDealOfTheDay: true, NOT: { id: product.id } },
        data:  { isDealOfTheDay: false },
      })
    }

    // Save options + variants if provided
    if (variantOptions?.length) {
      await prisma.productOption.createMany({
        data: variantOptions.map((opt, i) => ({
          productId: product.id, name: opt.name, values: opt.values, position: i,
        })),
      })
    }
    if (variants?.length) {
      await prisma.productVariant.createMany({
        data: variants.map(v => ({
          productId: product.id,
          title:     v.title,
          sku:       v.sku   || null,
          price:     v.price != null ? Number(v.price) : null,
          stock:     Number(v.stock ?? 0),
          image:     v.image || null,
          options:   v.options,
        })),
        skipDuplicates: true,
      })
    }

    // Bundle components — same guards as the PATCH route: no self-reference, no
    // nested bundles. Availability + order-time deduction derive from these.
    if (isBundle && Array.isArray(bundleComponents) && bundleComponents.length) {
      const wanted = bundleComponents.filter(c => c.componentProductId && c.componentProductId !== product.id)
      const kinds = wanted.length
        ? await prisma.product.findMany({ where: { id: { in: wanted.map(c => c.componentProductId) } }, select: { id: true, kind: true } })
        : []
      const allowed = new Set(kinds.filter(k => k.kind !== 'BUNDLE').map(k => k.id))
      const rows = wanted
        .filter(c => allowed.has(c.componentProductId))
        .map((c, i) => ({
          bundleProductId:    product.id,
          componentProductId: c.componentProductId,
          quantity:           Math.max(1, Math.floor(Number(c.quantity) || 1)),
          sortOrder:          i,
        }))
      if (rows.length) await prisma.bundleItem.createMany({ data: rows, skipDuplicates: true })
    }

    return Response.json(product, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

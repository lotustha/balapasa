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

  try {
    const where: Record<string, unknown> = {}

    // Shop always sees only active; admin can filter by status
    if (admin) {
      if (status === 'active') where.isActive = true
      else if (status === 'draft') where.isActive = false
      // else: no filter — show all
    } else {
      where.isActive = true
    }

    if (category)            where.category    = { slug: category }
    if (featured === 'true') where.isFeatured  = true
    if (supplierId)          where.supplierId  = supplierId
    if (stock === 'out')  where.stock = 0
    if (stock === 'low')  Object.assign(where, { trackInventory: true, stock: { gt: 0, lte: 10 } })
    if (flash === 'true') Object.assign(where, {
      salePrice: { not: null },
      OR: [{ salePriceExpiresAt: null }, { salePriceExpiresAt: { gt: new Date() } }],
    })

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

    // Null out salePrice if its expiry has passed (enforce at response time)
    const now = new Date()
    const products = rawProducts.map(p =>
      p.salePriceExpiresAt && p.salePriceExpiresAt <= now
        ? { ...p, salePrice: null, salePriceExpiresAt: null }
        : p
    )

    return Response.json({ products, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, slug, description, price, salePrice, salePriceExpiresAt, costPrice,
      stock, lowStockThreshold, images, categoryId, supplierId,
      tags, isActive, isFeatured, isNew, isTaxable, trackInventory,
      brand, sku, barcode, weight, videoUrl, boughtTogetherIds,
    } = body

    if (!name || !slug || !description || price == null || !categoryId) {
      return Response.json({ error: 'Missing required fields: name, slug, description, price, categoryId' }, { status: 400 })
    }

    const { variantOptions, variants } = body as {
      variantOptions?: { name: string; values: string[] }[]
      variants?: { title: string; sku?: string; price?: number; stock: number; image?: string; options: Record<string, string> }[]
    }

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
        isTaxable:         isTaxable  ?? true,
        trackInventory:    trackInventory ?? true,
        brand:             brand    || null,
        sku:               sku      || null,
        barcode:           barcode  || null,
        weight:            weight   ? Number(weight) : null,
        videoUrl:             videoUrl || null,
        salePriceExpiresAt:   salePriceExpiresAt ? new Date(salePriceExpiresAt) : null,
        boughtTogetherIds:    Array.isArray(boughtTogetherIds) ? boughtTogetherIds : [],
      },
    })

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

    return Response.json(product, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

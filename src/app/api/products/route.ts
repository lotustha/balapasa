import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const featured = searchParams.get('featured')
  const sort = searchParams.get('sort') ?? 'newest'
  const limit = parseInt(searchParams.get('limit') ?? '24', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const skip = (page - 1) * limit

  try {
    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = { slug: category }
    if (featured === 'true') where.isFeatured = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ]
    }

    const orderBy: Record<string, string> = {}
    if (sort === 'price-asc') orderBy.price = 'asc'
    else if (sort === 'price-desc') orderBy.price = 'desc'
    else if (sort === 'rating') orderBy.rating = 'desc'
    else orderBy.createdAt = 'desc'

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        include: { category: { select: { name: true, slug: true } } },
        take: limit,
        skip,
      }),
      prisma.product.count({ where }),
    ])

    return Response.json({ products, total, page, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, slug, description, price, salePrice, costPrice,
      stock, lowStockThreshold, images, categoryId, supplierId,
      tags, isActive, isFeatured, isNew, isTaxable, trackInventory,
      brand, sku, barcode, weight, videoUrl,
    } = body

    if (!name || !slug || !description || !price || !categoryId) {
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
        stock:             Number(stock ?? 0),
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
        videoUrl:          videoUrl || null,
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

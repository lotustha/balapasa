import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sort  = searchParams.get('sort')
  const limit = parseInt(searchParams.get('limit') ?? '100', 10)

  try {
    if (sort === 'sales') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const rows = await prisma.$queryRaw<{
        id: string; name: string; slug: string; color: string
        icon: string | null; image: string | null
        product_count: bigint; sales: bigint
      }[]>(Prisma.sql`
        SELECT c.id, c.name, c.slug, c.color, c.icon, c.image,
               COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) AS product_count,
               COALESCE(SUM(oi.quantity), 0) AS sales
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id
          AND o.created_at >= ${weekAgo}
        GROUP BY c.id, c.name, c.slug, c.color, c.icon, c.image
        ORDER BY sales DESC
        LIMIT ${limit}
      `)
      // Fetch up to 4 latest product preview images per visible category so
      // the homepage can render a 2x2 collage instead of a single icon.
      const ids = rows.map(r => r.id)
      const previewLists = ids.length
        ? await Promise.all(ids.map(id =>
            prisma.product.findMany({
              where:   { categoryId: id, isActive: true, images: { isEmpty: false } },
              orderBy: { createdAt: 'desc' },
              take:    4,
              select:  { images: true },
            }).catch(() => [] as { images: string[] }[]),
          ))
        : []
      const previewByCategory = new Map<string, string[]>()
      ids.forEach((id, i) => {
        const imgs = previewLists[i]
          .map(p => p.images[0])
          .filter((x): x is string => !!x)
        previewByCategory.set(id, imgs.slice(0, 4))
      })

      const categories = rows.map(r => ({
        id:    r.id,
        name:  r.name,
        slug:  r.slug,
        color: r.color,
        icon:  r.icon,
        image: r.image,
        sales: Number(r.sales),
        previewImages: previewByCategory.get(r.id) ?? [],
        _count: { products: Number(r.product_count) },
      }))
      return Response.json({ categories })
    }

    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' },
      take: limit,
    })
    return Response.json({ categories })
  } catch {
    return Response.json({ categories: [] })
  }
}

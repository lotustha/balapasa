import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateCategoryIntro } from '@/lib/ai-seo'

// POST /api/admin/ai/category-intro { categoryId, save?: boolean = true }
export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  let body: { categoryId?: unknown; save?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const categoryId = typeof body.categoryId === 'string' ? body.categoryId : ''
  const save       = body.save !== false
  if (!categoryId) return Response.json({ error: 'categoryId required' }, { status: 400 })

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true, name: true,
      _count:   { select: { products: true } },
      products: { select: { brand: true }, where: { isActive: true, brand: { not: null } }, take: 8 },
    },
  })
  if (!category) return Response.json({ error: 'Category not found' }, { status: 404 })

  const brandSample = Array.from(new Set(category.products.map(p => p.brand).filter((b): b is string => !!b))).slice(0, 5)

  try {
    const intro = await generateCategoryIntro({
      name:         category.name,
      productCount: category._count.products,
      brandSample,
    })
    if (save) {
      await prisma.category.update({
        where: { id: categoryId },
        data:  { seoIntro: intro },
      })
    }
    return Response.json({ intro, saved: save })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

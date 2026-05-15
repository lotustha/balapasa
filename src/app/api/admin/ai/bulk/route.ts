import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  generateProductDescription,
  generateProductFaq,
  generateCategoryIntro,
} from '@/lib/ai-seo'

type BulkType = 'product-description' | 'product-faq' | 'category-intro'

// POST /api/admin/ai/bulk { type, limit?: number = 5 }
// Processes the next N items missing the relevant AI content. Returns results
// per item with success/error so the UI can show progress. Each call processes
// a small batch to stay under Gemini rate limits — admin presses again to do
// the next batch.
export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  let body: { type?: unknown; limit?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const type  = body.type as BulkType
  const limit = Math.min(Math.max(1, Number(body.limit ?? 5)), 20)

  if (type !== 'product-description' && type !== 'product-faq' && type !== 'category-intro') {
    return Response.json({ error: 'Invalid type' }, { status: 400 })
  }

  const results: Array<{ id: string; name: string; ok: boolean; error?: string }> = []

  try {
    if (type === 'product-description') {
      const products = await prisma.product.findMany({
        where:  { isActive: true, aiDescAt: null },
        select: { id: true, name: true, brand: true, tags: true, description: true, price: true, salePrice: true, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      for (const p of products) {
        try {
          const description = await generateProductDescription({
            name: p.name, category: p.category.name, brand: p.brand, tags: p.tags,
            existing: p.description,
            priceLabel: `NPR ${Math.round(p.salePrice ?? p.price).toLocaleString('en-IN')}`,
          })
          await prisma.product.update({ where: { id: p.id }, data: { description, aiDescAt: new Date() } })
          results.push({ id: p.id, name: p.name, ok: true })
        } catch (e) {
          results.push({ id: p.id, name: p.name, ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    } else if (type === 'product-faq') {
      const products = await prisma.product.findMany({
        where:  { isActive: true, aiFaqAt: null },
        select: { id: true, name: true, brand: true, tags: true, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      for (const p of products) {
        try {
          const faqs = await generateProductFaq({
            name: p.name, category: p.category.name, brand: p.brand, tags: p.tags,
          })
          if (!faqs.length) throw new Error('no FAQs generated')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.product.update({ where: { id: p.id }, data: { aiFaqJson: faqs as any, aiFaqAt: new Date() } })
          results.push({ id: p.id, name: p.name, ok: true })
        } catch (e) {
          results.push({ id: p.id, name: p.name, ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    } else {
      // category-intro
      const cats = await prisma.category.findMany({
        where:  { seoIntro: null },
        select: { id: true, name: true, _count: { select: { products: true } }, products: { select: { brand: true }, where: { isActive: true, brand: { not: null } }, take: 8 } },
        orderBy: { name: 'asc' },
        take: limit,
      })
      for (const c of cats) {
        try {
          const brandSample = Array.from(new Set(c.products.map(p => p.brand).filter((b): b is string => !!b))).slice(0, 5)
          const intro = await generateCategoryIntro({ name: c.name, productCount: c._count.products, brandSample })
          await prisma.category.update({ where: { id: c.id }, data: { seoIntro: intro } })
          results.push({ id: c.id, name: c.name, ok: true })
        } catch (e) {
          results.push({ id: c.id, name: c.name, ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    }

    return Response.json({ results, processed: results.length })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// GET /api/admin/ai/bulk?type=product-description  — returns count of items
// still needing this content type. Used by the SEO Tools page to show progress.
export async function GET(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const url  = new URL(req.url)
  const type = url.searchParams.get('type') as BulkType | null
  if (type !== 'product-description' && type !== 'product-faq' && type !== 'category-intro') {
    return Response.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    let pending: number
    let total:   number
    if (type === 'product-description') {
      pending = await prisma.product.count({ where: { isActive: true, aiDescAt: null } })
      total   = await prisma.product.count({ where: { isActive: true } })
    } else if (type === 'product-faq') {
      pending = await prisma.product.count({ where: { isActive: true, aiFaqAt: null } })
      total   = await prisma.product.count({ where: { isActive: true } })
    } else {
      pending = await prisma.category.count({ where: { seoIntro: null } })
      total   = await prisma.category.count()
    }
    return Response.json({ pending, total, done: total - pending })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

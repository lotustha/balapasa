import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateProductFaq } from '@/lib/ai-seo'

// POST /api/admin/ai/product-faq { productId, save?: boolean = true }
export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  let body: { productId?: unknown; save?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const productId = typeof body.productId === 'string' ? body.productId : ''
  const save      = body.save !== false
  if (!productId) return Response.json({ error: 'productId required' }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, brand: true, tags: true, category: { select: { name: true } } },
  })
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })

  try {
    const faqs = await generateProductFaq({
      name:     product.name,
      category: product.category.name,
      brand:    product.brand,
      tags:     product.tags,
    })
    if (!faqs.length) {
      return Response.json({ error: 'No FAQs generated. Retry.' }, { status: 502 })
    }
    if (save) {
      await prisma.product.update({
        where: { id: productId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data:  { aiFaqJson: faqs as any, aiFaqAt: new Date() },
      })
    }
    return Response.json({ faqs, saved: save })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateProductDescription } from '@/lib/ai-seo'

// POST /api/admin/ai/product-rewrite { productId, save?: boolean = true }
// Generates a unique SEO description and (by default) saves it directly to the
// product, replacing the manufacturer copy. If save=false, returns the text
// without persisting so the admin can preview first.
export async function POST(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  let body: { productId?: unknown; save?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const productId = typeof body.productId === 'string' ? body.productId : ''
  const save      = body.save !== false  // default true
  if (!productId) return Response.json({ error: 'productId required' }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, brand: true, tags: true, description: true, price: true, salePrice: true, category: { select: { name: true } } },
  })
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })

  try {
    const priceLabel = `NPR ${Math.round(product.salePrice ?? product.price).toLocaleString('en-IN')}`
    const description = await generateProductDescription({
      name:     product.name,
      category: product.category.name,
      brand:    product.brand,
      tags:     product.tags,
      existing: product.description,
      priceLabel,
    })

    if (save) {
      await prisma.product.update({
        where: { id: productId },
        data:  { description, aiDescAt: new Date() },
      })
    }
    return Response.json({ description, saved: save })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

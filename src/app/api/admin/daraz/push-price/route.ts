import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getDarazControls } from '@/lib/daraz-admin'
import { isSaleLive } from '@/lib/sale-status'
import { darazItemId, pushPriceToDaraz } from '../../../../../../scripts/daraz/push-price.mjs'

export const dynamic = 'force-dynamic'

// The Daraz scripts talk to the database through pg's query(); this gives them the same over Prisma.
const db = {
  query: async (sql: string, params: unknown[] = []) => ({ rows: await prisma.$queryRawUnsafe<Record<string, string>[]>(sql, ...params) }),
}

// GET: is the "also update Daraz?" question switched on (Settings → Daraz).
export async function GET() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  return Response.json({ enabled: (await getDarazControls()).websitePricePush })
}

// POST { productId }: puts the product's current website price on its Daraz listing in the
// TrendWave shop and on the copy in the Bala Pasa shop. Stock on Daraz is not touched.
export async function POST(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const controls = await getDarazControls()
  if (!controls.websitePricePush) return Response.json({ error: 'Updating Daraz from the website is switched off in Settings → Daraz' }, { status: 409 })

  const body = await req.json().catch(() => ({})) as { productId?: string }
  if (!body.productId) return Response.json({ error: 'No product given' }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: {
      name: true, sku: true, price: true, salePrice: true, salePriceStartsAt: true, salePriceExpiresAt: true,
      variants: { where: { isActive: true, price: { not: null } }, select: { sku: true, price: true } },
    },
  })
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })
  const itemId = darazItemId(product.sku)
  if (!itemId) return Response.json({ error: 'This product did not come from Daraz, so there is no listing to update' }, { status: 400 })

  // A sale that has ended is not sent; one that starts later is sent with its start date.
  const ended = product.salePriceExpiresAt != null && product.salePriceExpiresAt <= new Date()
  const scheduled = product.salePriceStartsAt != null && product.salePriceStartsAt > new Date()
  const salePrice = product.salePrice != null && !ended && (scheduled || isSaleLive(product)) ? product.salePrice : 0

  const variantPrices: Record<string, number> = {}
  for (const v of product.variants) {
    const skuId = darazItemId(v.sku)
    if (skuId && v.price != null) variantPrices[skuId] = v.price
  }

  try {
    const result = await pushPriceToDaraz(db, itemId, {
      price: product.price, salePrice,
      saleStartsAt: product.salePriceStartsAt, saleExpiresAt: product.salePriceExpiresAt,
      variantPrices,
    })
    return Response.json(result, { status: result.ok ? 200 : 502 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { sendEmailLogged } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'

type Ctx = { params: Promise<{ id: string }> }

// POST — email this product's supplier a firm reorder (purchase order).
// Quantity comes from the admin product page. The automatic low-stock variant
// of this email is fired from /api/orders (order creation), not here.
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error

  const { id } = await ctx.params
  try {
    const body     = await req.json().catch(() => ({}))
    const quantity = Number(body.quantity)
    const note     = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return Response.json({ error: 'Enter a quantity greater than 0.' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where:  { id },
      select: {
        name: true, sku: true, stock: true, lowStockThreshold: true,
        supplier: { select: { name: true, contactName: true, email: true } },
      },
    })
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })
    if (!product.supplier) {
      return Response.json({ error: 'No supplier is linked to this product. Add one in the product details first.' }, { status: 400 })
    }
    if (!product.supplier.email) {
      return Response.json({ error: `Supplier "${product.supplier.name}" has no email on file. Add one under Suppliers.` }, { status: 400 })
    }

    const settings = await getSiteSettings()
    const contact  = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings WHERE key IN ('STORE_PHONE','STORE_EMAIL')
    `.catch(() => [] as { key: string; value: string }[])
    const cmap = Object.fromEntries(contact.map(r => [r.key, r.value]))

    const { subject, html } = await renderEmail('supplier-reorder', {
      kind:           'PURCHASE_ORDER',
      supplierName:   product.supplier.name,
      contactName:    product.supplier.contactName,
      productName:    product.name,
      sku:            product.sku,
      currentStock:   product.stock,
      threshold:      product.lowStockThreshold,
      quantity,
      note,
      storePhone:     cmap.STORE_PHONE || null,
      storeEmail:     cmap.STORE_EMAIL || null,
      recipientEmail: product.supplier.email,
      siteUrl:        settings.storeUrl,
      siteName:       settings.siteName,
      tagline:        settings.seo.description,
    })

    await sendEmailLogged('supplier-reorder', {
      to: product.supplier.email, subject, html,
      context: { productId: id, quantity },
    })

    return Response.json({ ok: true, sentTo: product.supplier.email })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

import 'server-only'

import { prisma } from '@/lib/prisma'
import { render } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Subscribe an email to a product's back-in-stock alert. Upsert resets
// `notifiedAt` to null so re-subscribing after a previous alert re-arms it
// (the @@unique([productId, email]) constraint makes this a clean upsert).
export async function subscribeBackInStock(
  args: { productId: string; email: string; userId?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = args.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address.' }

  await prisma.backInStockSubscription.upsert({
    where:  { productId_email: { productId: args.productId, email } },
    create: { productId: args.productId, email, userId: args.userId ?? null },
    update: { notifiedAt: null, userId: args.userId ?? null },
  })
  return { ok: true }
}

// Back-in-stock engine (run by the cron). Scans pending subscriptions, emails
// the subscribers whose product (or any of its variants) now has stock, and
// stamps `notifiedAt` so they are never double-notified. Idempotent and safe to
// re-run. A cron — not a per-write hook — so it covers EVERY restock path
// (admin adjust, product edit, POS, import, cancel/return restock) uniformly.
export async function runBackInStockNotifications(): Promise<{ notified: number; productsInStock: number }> {
  const pending = await prisma.backInStockSubscription.findMany({
    where:  { notifiedAt: null },
    select: { id: true, productId: true, email: true },
  })
  if (pending.length === 0) return { notified: 0, productsInStock: 0 }

  const productIds = [...new Set(pending.map(p => p.productId))]
  const products = await prisma.product.findMany({
    where:  { id: { in: productIds } },
    select: {
      id: true, name: true, slug: true, price: true, salePrice: true,
      images: true, stock: true, isActive: true,
      variants: { select: { stock: true } },
    },
  })

  const inStock = new Map<string, (typeof products)[number]>()
  for (const p of products) {
    const hasStock = p.isActive && (p.stock > 0 || p.variants.some(v => v.stock > 0))
    if (hasStock) inStock.set(p.id, p)
  }
  if (inStock.size === 0) return { notified: 0, productsInStock: 0 }

  const settings = await getSiteSettings()
  const notifiedIds: string[] = []

  for (const sub of pending) {
    const p = inStock.get(sub.productId)
    if (!p) continue
    try {
      const { subject, html } = await render('back-in-stock', {
        productName: p.name,
        productUrl:  `${settings.storeUrl}/products/${p.slug}`,
        price:       p.salePrice ?? p.price,
        imageUrl:    p.images[0] ?? null,
        productId:   p.id,
        siteUrl:     settings.storeUrl,
        siteName:    settings.siteName,
        tagline:     settings.seo.description,
      })
      await sendEmailLogged('back-in-stock', {
        to: sub.email, subject, html, context: { productId: p.id },
      })
      notifiedIds.push(sub.id)
    } catch (e) {
      console.warn('[back-in-stock] send failed (non-fatal):', e)
    }
  }

  if (notifiedIds.length) {
    await prisma.backInStockSubscription.updateMany({
      where: { id: { in: notifiedIds } },
      data:  { notifiedAt: new Date() },
    })
  }

  console.log(`[cron/back-in-stock] notified=${notifiedIds.length} productsInStock=${inStock.size}`)
  return { notified: notifiedIds.length, productsInStock: inStock.size }
}

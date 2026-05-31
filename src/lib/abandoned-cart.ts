import { prisma } from '@/lib/prisma'
import { waAbandonedCart } from '@/lib/whatsapp'
import { sendEmailLogged } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'
import type { AbandonedCartItem } from '@/lib/emails/types'

interface RecoveryResult { total: number; whatsapp: number; email: number }

// Cart items are persisted as the storefront CartItem[] JSON by /api/cart/abandon.
function parseCartItems(json: string): AbandonedCartItem[] {
  try {
    const raw = JSON.parse(json) as Array<Record<string, unknown>>
    if (!Array.isArray(raw)) return []
    return raw.map(i => ({
      name:     String(i.name ?? 'Item'),
      quantity: Number(i.quantity ?? 1),
      price:    Number(i.price ?? 0),
      image:    typeof i.image === 'string' ? i.image : undefined,
    }))
  } catch {
    return []
  }
}

// Send recovery reminders for every cart left unpaid past its reminder window.
// WhatsApp goes to the captured phone; the email channel is best-effort — it
// only fires when the phone maps to a registered Profile with an email. Each
// cart is marked `reminded` exactly once so reminders never repeat. Idempotent
// and safe to re-run (the `reminded:false` filter drops already-nudged carts).
export async function runAbandonedCartRecovery(): Promise<RecoveryResult> {
  const eligible = await prisma.cartAbandonment.findMany({
    where: { reminded: false, expiresAt: { lt: new Date() } },
  })
  if (eligible.length === 0) return { total: 0, whatsapp: 0, email: 0 }

  const settings = await getSiteSettings()
  const cartUrl  = settings.storeUrl + '/cart'

  let whatsapp = 0
  let email = 0

  for (const cart of eligible) {
    // WhatsApp — the original channel.
    const waId = await waAbandonedCart(cart.phone, cart.name ?? '').catch(() => null)
    if (waId) whatsapp++

    // Email — only if we can resolve a registered customer's address by phone.
    try {
      const profile = await prisma.profile.findFirst({
        where:  { phone: cart.phone },
        select: { email: true, name: true },
      })
      if (profile?.email) {
        const items = parseCartItems(cart.cartJson)
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
        const itemCount = items.reduce((s, i) => s + i.quantity, 0)
        const { subject, html } = await renderEmail('abandoned-cart', {
          recipientName: cart.name ?? profile.name ?? 'there',
          cartUrl,
          items,
          itemCount,
          subtotal,
          siteUrl:  settings.storeUrl,
          siteName: settings.siteName,
          tagline:  settings.seo.description,
        })
        const res = await sendEmailLogged('abandoned-cart', {
          to: profile.email, subject, html, context: { phone: cart.phone },
        })
        if (!res.error) email++
      }
    } catch { /* email is best-effort — never block the WhatsApp send or the mark */ }

    await prisma.cartAbandonment.update({
      where: { id: cart.id },
      data:  { reminded: true },
    })
  }

  console.log(`[abandoned-cart] reminded total=${eligible.length} whatsapp=${whatsapp} email=${email}`)
  return { total: eligible.length, whatsapp, email }
}

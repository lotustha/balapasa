import { prisma } from '@/lib/prisma'

// Prices an order from the database. The browser and the mobile app send prices with the cart, but
// those are only ever used to notice that the customer was looking at stale numbers: what is
// charged always comes from here.

export interface PricedLine {
  id:           string          // product id
  variantId:    string | null
  variantTitle: string | null
  name:         string          // product name, with the variant in brackets when there is one
  image:        string
  quantity:     number
  price:        number          // unit price charged
}

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotal: number }
  | { ok: false; status: number; error: string }

const MAX_QTY = 999
// Rupee prices, so anything under this is rounding, not a different price.
const SAME_PRICE = 0.5

interface IncomingLine { id?: unknown; quantity?: unknown; variantId?: unknown; price?: unknown; salePrice?: unknown }

const fail = (status: number, error: string): PricingResult => ({ ok: false, status, error })

// Same rule the product page uses, so the customer is charged what the page showed.
function productPrice(p: { price: number; salePrice: number | null; salePriceStartsAt: Date | null; salePriceExpiresAt: Date | null }, now: Date): number {
  const saleLive = p.salePrice != null
    && (!p.salePriceStartsAt  || p.salePriceStartsAt  <= now)
    && (!p.salePriceExpiresAt || p.salePriceExpiresAt >  now)
  return saleLive ? p.salePrice! : p.price
}

export async function priceOrderLines(raw: unknown, now: Date = new Date()): Promise<PricingResult> {
  if (!Array.isArray(raw) || raw.length === 0) return fail(400, 'Your cart is empty.')

  const incoming: { id: string; quantity: number; variantId: string | null; sentPrice: number | null }[] = []
  for (const line of raw as IncomingLine[]) {
    const quantity = Number(line?.quantity)
    if (typeof line?.id !== 'string' || !line.id || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      return fail(400, 'There is a problem with an item in your cart. Please remove it and add it again.')
    }
    const sent = Number(line.salePrice ?? line.price)
    incoming.push({
      id: line.id,
      quantity,
      variantId: typeof line.variantId === 'string' && line.variantId ? line.variantId : null,
      sentPrice: Number.isFinite(sent) ? sent : null,
    })
  }

  const products = await prisma.product.findMany({
    where:  { id: { in: [...new Set(incoming.map(l => l.id))] } },
    select: {
      id: true, name: true, price: true, salePrice: true, salePriceStartsAt: true, salePriceExpiresAt: true,
      isActive: true, images: true,
      variants: { where: { isActive: true }, select: { id: true, title: true, price: true, image: true } },
    },
  })
  const byId = new Map(products.map(p => [p.id, p]))

  const lines: PricedLine[] = []
  for (const l of incoming) {
    const p = byId.get(l.id)
    if (!p || !p.isActive) return fail(409, 'An item in your cart is no longer available. Please remove it and try again.')

    const base = productPrice(p, now)
    let variant = l.variantId ? p.variants.find(v => v.id === l.variantId) ?? null : null
    if (l.variantId && !variant) return fail(409, `The option you chose for "${p.name}" is no longer available. Please choose again.`)

    // Older clients (and the mobile app) do not say which variant was picked. The price they send
    // must then be one this product really has; it also tells us which variant it was.
    const pricedVariants = p.variants.filter(v => v.price != null)
    if (!variant && pricedVariants.length > 0) {
      const sent = l.sentPrice
      const matchesBase = sent != null && Math.abs(sent - base) < SAME_PRICE
      variant = sent == null ? null : pricedVariants.find(v => Math.abs(v.price! - sent) < SAME_PRICE) ?? null
      if (!variant && !matchesBase) return fail(409, `The price of "${p.name}" has changed. Please open the product and add it to your cart again.`)
    }

    lines.push({
      id: p.id,
      variantId: variant?.id ?? null,
      variantTitle: variant?.title ?? null,
      name: variant ? `${p.name} (${variant.title})` : p.name,
      image: variant?.image ?? p.images[0] ?? '',
      quantity: l.quantity,
      price: variant?.price ?? base,
    })
  }

  const subtotal = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100
  return { ok: true, lines, subtotal }
}

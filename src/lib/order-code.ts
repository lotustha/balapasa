// Human-readable order code generator: `{PREFIX}-{0001}`.
// PREFIX comes from the first item's product SKU (falling back to product
// slug, then a generic "ORD" tag). Each prefix has its own counter row in
// `order_code_counters`, bumped atomically via upsert+increment so two
// concurrent checkouts can never land on the same code.

import { prisma } from '@/lib/prisma'

function sanitizePrefix(raw: string): string {
  // Uppercase, keep A–Z 0–9 and dashes; collapse anything else to a dash;
  // strip leading/trailing dashes; cap length so the final code stays short.
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'ORD'
}

/**
 * Resolve a code prefix for an order given its first item's product id.
 * Looks up SKU first, then slug, then falls back to "ORD".
 */
export async function resolveOrderCodePrefix(firstProductId: string | null | undefined): Promise<string> {
  if (!firstProductId) return 'ORD'
  try {
    const p = await prisma.product.findUnique({
      where:  { id: firstProductId },
      select: { sku: true, slug: true },
    })
    return sanitizePrefix(p?.sku || p?.slug || 'ORD')
  } catch {
    return 'ORD'
  }
}

/**
 * Atomically allocate the next sequence number for a prefix and assign the
 * formatted code to the order. Returns the assigned code, or null if every
 * attempt collided (extremely unlikely; the counter is atomic so collisions
 * only happen if a prior process partially wrote without bumping).
 */
export async function assignOrderCode(orderId: string, prefix: string): Promise<string | null> {
  const safe = sanitizePrefix(prefix)
  for (let attempt = 0; attempt < 5; attempt++) {
    // upsert+increment is the atomic bump. After update path, nextValue is
    // current+1 → our seq is nextValue-1. After create path, nextValue is 2
    // → our seq is 1. Either way: seq = nextValue - 1.
    const counter = await prisma.orderCodeCounter.upsert({
      where:  { prefix: safe },
      update: { nextValue: { increment: 1 } },
      create: { prefix: safe, nextValue: 2 },
      select: { nextValue: true },
    })
    const seq  = counter.nextValue - 1 + attempt   // +attempt only used after a collision retry
    const code = `${safe}-${String(seq).padStart(4, '0')}`
    try {
      await prisma.order.update({ where: { id: orderId }, data: { orderCode: code } })
      return code
    } catch {
      // P2002 unique violation — pre-existing manual data or partial backfill.
      // Loop bumps and retries.
    }
  }
  return null
}

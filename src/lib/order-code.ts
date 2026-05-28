// Human-readable order code generator: `{STORE_PREFIX}-{PRODUCT_TAG}-{0001}`.
// STORE_PREFIX comes from the ORDER_CODE_PREFIX app setting (e.g. "BLP").
// PRODUCT_TAG comes from the first item's product SKU / slug.
// If the SKU already starts with the store prefix (backward compat), the full
// SKU is used as-is so existing counters are not orphaned.
// Each prefix has its own counter row in `order_code_counters`, bumped
// atomically via upsert+increment so two concurrent checkouts never collide.

import { prisma } from '@/lib/prisma'

function sanitizePrefix(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'ORD'
}

async function getStorePrefix(): Promise<string> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'ORDER_CODE_PREFIX' } })
    if (setting?.value) return sanitizePrefix(setting.value)
  } catch { /* non-fatal */ }
  return ''
}

/**
 * Resolve a code prefix for an order given its first item's product id.
 * Format: `{STORE_PREFIX}-{PRODUCT_TAG}` (or just `{STORE_PREFIX}` / product
 * tag alone if one side is absent). If the product SKU already starts with the
 * store prefix the SKU is used verbatim — preserves existing counter rows.
 */
export async function resolveOrderCodePrefix(firstProductId: string | null | undefined): Promise<string> {
  const [storePrefix, productTag] = await Promise.all([
    getStorePrefix(),
    (async () => {
      if (!firstProductId) return ''
      try {
        const p = await prisma.product.findUnique({
          where:  { id: firstProductId },
          select: { sku: true, slug: true },
        })
        return sanitizePrefix(p?.sku || p?.slug || 'ORD')
      } catch {
        return 'ORD'
      }
    })(),
  ])

  if (!storePrefix) return productTag || 'ORD'
  if (!productTag)  return storePrefix

  // Backward compat: if the product tag already starts with the store prefix
  // (e.g. SKU "BLP-WOOD-948" and prefix "BLP") keep it as-is so existing
  // counter rows are reused and old codes stay consistent.
  if (productTag.startsWith(storePrefix + '-') || productTag === storePrefix) {
    return productTag
  }

  return `${storePrefix}-${productTag}`
}

/**
 * Atomically allocate the next sequence number for a prefix and assign the
 * formatted code to the order. Returns the assigned code, or null on failure.
 */
export async function assignOrderCode(orderId: string, prefix: string): Promise<string | null> {
  const safe = sanitizePrefix(prefix)
  for (let attempt = 0; attempt < 5; attempt++) {
    const counter = await prisma.orderCodeCounter.upsert({
      where:  { prefix: safe },
      update: { nextValue: { increment: 1 } },
      create: { prefix: safe, nextValue: 2 },
      select: { nextValue: true },
    })
    const seq  = counter.nextValue - 1 + attempt
    const code = `${safe}-${String(seq).padStart(4, '0')}`
    try {
      await prisma.order.update({ where: { id: orderId }, data: { orderCode: code } })
      return code
    } catch {
      // P2002 unique violation — retry with next seq
    }
  }
  return null
}

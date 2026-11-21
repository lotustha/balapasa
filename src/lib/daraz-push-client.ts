// Admin, in the browser: after a price change on the website, ask whether Daraz should get it too.

let enabled: Promise<boolean> | null = null

function pushEnabled(): Promise<boolean> {
  enabled ??= fetch('/api/admin/daraz/push-price')
    .then(r => (r.ok ? r.json() : { enabled: false }))
    .then(d => d.enabled === true)
    .catch(() => false)
  return enabled
}

const isDarazSku = (sku?: string | null) => /^DZ-\d+$/.test(sku ?? '')

/**
 * Call after a price or sale price was saved. Does nothing for products that did not come from
 * Daraz, for staff who are not admins, or when the feature is switched off in Settings → Daraz.
 * Returns the text to show the admin, or null when nothing was asked.
 */
export async function offerDarazPriceSync(product: { id: string; sku?: string | null; name?: string }): Promise<string | null> {
  if (!isDarazSku(product.sku)) return null
  if (!(await pushEnabled())) return null

  const yes = window.confirm(
    `Also update this price on Daraz?\n\n${product.name ? `${product.name.slice(0, 80)}\n\n` : ''}` +
    'OK: the TrendWave and Bala Pasa Daraz shops get the same price now.\n' +
    'Cancel: only the website changes, and the next Daraz sync will bring the Daraz price back to the website.',
  )
  if (!yes) return null

  try {
    const res = await fetch('/api/admin/daraz/push-price', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.summary) return `${res.ok ? 'Daraz updated.' : 'Daraz was NOT fully updated.'}\n${String(data.summary).replace(/ \| /g, '\n')}`
    return `Daraz was not updated: ${data.error ?? `HTTP ${res.status}`}`
  } catch (e) {
    return `Daraz was not updated: ${e instanceof Error ? e.message : String(e)}`
  }
}

/** True when any price field differs between what was loaded and what is being saved. */
export function priceChanged(
  before: { price?: unknown; salePrice?: unknown; salePriceStartsAt?: unknown; salePriceExpiresAt?: unknown },
  after: { price?: unknown; salePrice?: unknown; salePriceStartsAt?: unknown; salePriceExpiresAt?: unknown },
): boolean {
  const num = (v: unknown) => (v === '' || v == null ? 0 : Number(v))
  const time = (v: unknown) => (v ? new Date(String(v)).getTime() : 0)
  return num(before.price) !== num(after.price) || num(before.salePrice) !== num(after.salePrice)
    || (num(after.salePrice) > 0 && (time(before.salePriceStartsAt) !== time(after.salePriceStartsAt) || time(before.salePriceExpiresAt) !== time(after.salePriceExpiresAt)))
}

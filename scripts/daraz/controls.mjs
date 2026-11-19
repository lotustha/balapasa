// The Daraz switches from Settings → Daraz. Stored as one JSON value in app_settings and read by
// every Daraz job at the start of each run, so a switch takes effect on the next run with no deploy.
// Pure and import-free on purpose: the admin settings page imports this file too.

export const CONTROL_KEY = 'DARAZ_CONTROL_JSON'

export const CONTROL_DEFAULTS = {
  // Website catalog ← TrendWave Daraz shop (scripts/daraz/daily-sync.mjs)
  websiteSync: true,
  websitePrices: true,
  websiteNewProducts: true,
  websiteHideRemoved: true,
  websiteVariants: true,
  priceHoldPercent: 20,
  homepageFlags: true,
  categoryArt: true,
  copyImages: true,
  // Bala Pasa Daraz shop ← TrendWave Daraz shop (scripts/daraz/mirror-sync.mjs)
  mirrorSync: true,
  mirrorPrices: true,
  mirrorStock: true,
  mirrorNewListings: true,
  mirrorSoldOut: true,
  // WhatsApp summary after a run that changed something. Failure alerts are always sent.
  notifyChanges: true,
}

const HOLD_MIN = 1
const HOLD_MAX = 500

/** Settings JSON → a complete controls object. Anything missing or malformed keeps its default. */
export function parseControls(raw) {
  let saved = {}
  try { saved = raw ? JSON.parse(raw) : {} } catch { saved = {} }
  if (!saved || typeof saved !== 'object') saved = {}
  const out = { ...CONTROL_DEFAULTS }
  for (const key of Object.keys(CONTROL_DEFAULTS)) {
    if (key === 'priceHoldPercent') {
      const n = Number(saved[key])
      if (Number.isFinite(n)) out[key] = Math.min(HOLD_MAX, Math.max(HOLD_MIN, Math.round(n)))
    } else if (typeof saved[key] === 'boolean') {
      out[key] = saved[key]
    }
  }
  return out
}

/** Reads the switches with a pg client. A read failure returns the defaults (everything on). */
export async function loadControls(db) {
  try {
    const row = (await db.query('SELECT value FROM app_settings WHERE key = $1', [CONTROL_KEY])).rows[0]
    return parseControls(row?.value)
  } catch {
    return parseControls(null)
  }
}

/** Removes from a website sync plan (plan-sync.mjs) the parts that are switched off.
 *  Returns the trimmed plan and the names of what was left out, for the run summary. */
export function limitSitePlan(plan, c) {
  const off = []
  const out = { ...plan }
  if (!c.websitePrices) {
    off.push('prices')
    out.priceChanges = []
    out.variantChanges = out.variantChanges.map(v => ({ ...v, priceUpdates: [] }))
  }
  if (!c.websiteNewProducts) { off.push('new products'); out.create = [] }
  if (!c.websiteHideRemoved) { off.push('hiding removed products'); out.deactivate = []; out.reactivate = [] }
  if (!c.websiteVariants) {
    off.push('variant changes')
    // Variant prices are prices: they stay if only the variant switch is off.
    out.variantChanges = out.variantChanges
      .filter(v => v.priceUpdates.length)
      .map(v => ({ ...v, create: [], deactivate: [], reactivate: [], structural: false }))
  }
  return { plan: out, off }
}

/** Removes from a shop mirror plan (mirror-plan.mjs) the parts that are switched off. */
export function limitMirrorPlan(plan, c) {
  const off = []
  const out = { ...plan }
  if (!c.mirrorPrices || !c.mirrorStock) {
    if (!c.mirrorPrices) off.push('prices')
    if (!c.mirrorStock) off.push('stock')
    out.updates = plan.updates.flatMap(u => {
      const priceChanged = u.changed.some(k => k !== 'quantity')
      const stockChanged = u.changed.includes('quantity')
      const keepPrice = c.mirrorPrices && priceChanged
      const keepStock = c.mirrorStock && stockChanged
      if (!keepPrice && !keepStock) return []
      const next = { ...u, changed: u.changed.filter(k => (k === 'quantity' ? keepStock : keepPrice)) }
      // The update call always carries a quantity, so an unwanted stock change sends the current one.
      if (!keepStock) next.quantity = u.old.quantity
      // Without a price the payload carries the quantity alone.
      if (!keepPrice) { next.price = null; next.salePrice = null }
      return [next]
    })
  }
  if (!c.mirrorNewListings) { off.push('new listings'); out.create = [] }
  if (!c.mirrorSoldOut) { off.push('marking removed products sold out'); out.soldOut = [] }
  return { plan: out, off }
}

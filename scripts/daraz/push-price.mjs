// Website → Daraz: put a product's website price on its listing in the TrendWave shop and on the
// copy of it in the Bala Pasa shop. Used when an admin changes a price on the website and chooses
// to update Daraz too, and by hand:
//   node scripts/daraz/push-price.mjs <daraz item id> --price 1400 [--sale 750] [--dry-run]
// (by hand it only writes to Daraz; the website follows on its next Daraz sync).
import { darazGet, darazPost } from './api.mjs'
import { getAccessToken } from './tokens.mjs'
import { sellerSkuFor } from './mirror-payload.mjs'
import { priceQuantityXml } from './mirror-plan.mjs'

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000
const OPEN_ENDED_YEARS = 10

/** A moment → 'yyyy-MM-dd HH:mm:ss' in Nepal time, the form Daraz reports sale times in. */
export function nepalTime(date) {
  return new Date(date.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ')
}

/** The Daraz item id behind a website product SKU ("DZ-1543786278"), or null if it is not a Daraz product. */
export function darazItemId(sku) {
  const m = /^DZ-(\d+)$/.exec(String(sku ?? ''))
  return m ? m[1] : null
}

/**
 * What each Daraz SKU of one listing should be set to. Pure.
 *   skus:    the listing's SKUs as Daraz reports them
 *   website: { price, salePrice, saleStartsAt, saleExpiresAt, variantPrices: { [skuId]: number } }
 *            variantPrices holds only variants that have their own price on the website; that
 *            price is what the shopper pays, so it becomes a sale price when it is below the
 *            SKU's regular Daraz price and the regular price otherwise.
 * Quantities are never changed: each entry repeats the SKU's current quantity.
 */
export function priceEntries(itemId, skus, website, now = new Date()) {
  const price = Number(website.price)
  if (!Number.isFinite(price) || price <= 0) throw new Error('website price must be above 0')
  const starts = website.saleStartsAt ? new Date(website.saleStartsAt) : null
  const expires = website.saleExpiresAt ? new Date(website.saleExpiresAt) : null
  let sale = Number(website.salePrice) || 0
  if (sale >= price || sale < 0) sale = 0
  if (expires && expires <= now) sale = 0

  const dates = () => {
    const from = starts && starts > now ? starts : now
    const to = expires ?? new Date(Date.UTC(now.getUTCFullYear() + OPEN_ENDED_YEARS, now.getUTCMonth(), now.getUTCDate()))
    return { saleFrom: nepalTime(from), saleTo: nepalTime(to) }
  }

  return skus
    .filter(s => s.Status === 'active' && Number(s.price) > 0)
    .map(s => {
      const own = Number(website.variantPrices?.[String(s.SkuId)]) || 0
      const base = { itemId, skuId: s.SkuId, quantity: Number(s.quantity) || 0 }
      if (own > 0) {
        const regular = Number(s.price)
        return own < regular
          ? { ...base, price: regular, salePrice: own, ...dates() }
          : { ...base, price: own, salePrice: 0 }
      }
      return sale ? { ...base, price, salePrice: sale, ...dates() } : { ...base, price, salePrice: 0 }
    })
}

const describe = e => (e.salePrice ? `Rs ${e.salePrice} (regular Rs ${e.price})` : `Rs ${e.price}`)

/**
 * Sets the price in both shops. `db` needs only query(sql, params) → { rows }.
 * Returns { shops: [{ shop, ok, skus, detail }], summary }. One shop failing does not stop the other.
 */
export async function pushPriceToDaraz(db, itemId, website, { dryRun = false, post = darazPost, get = darazGet } = {}) {
  const shops = []
  let sourceSkus = []

  try {
    const token = await getAccessToken(db, 'trendwave')
    const item = (await get('/product/item/get', { item_id: String(itemId) }, { accessToken: token })).data
    sourceSkus = item?.skus ?? []
    const entries = priceEntries(itemId, sourceSkus, website)
    if (entries.length === 0) throw new Error('the listing has no active SKU')
    if (!dryRun) await post('/product/price_quantity/update', { payload: priceQuantityXml(entries) }, { accessToken: token })
    shops.push({ shop: 'TrendWave', ok: true, skus: entries.length, detail: describe(entries[0]) })
  } catch (err) {
    shops.push({ shop: 'TrendWave', ok: false, skus: 0, detail: err.message.slice(0, 200) })
  }

  try {
    if (sourceSkus.length === 0) throw new Error('could not read the TrendWave listing, so its copy was not looked up')
    const token = await getAccessToken(db, 'balapasa')
    const wanted = sourceSkus.map(s => sellerSkuFor(s.SkuId))
    const found = (await get('/products/get', { filter: 'all', limit: '50', offset: '0', sku_seller_list: JSON.stringify(wanted) }, { accessToken: token })).data?.products ?? []
    // The copy's SKUs carry the source SkuId in their SellerSku; price them as their source SKU.
    const sourceIdOf = new Map(wanted.map((w, i) => [w, String(sourceSkus[i].SkuId)]))
    const entries = []
    for (const p of found) {
      const copies = (p.skus ?? []).filter(s => sourceIdOf.has(s.SellerSku))
      const asSource = copies.map(s => ({ ...s, SkuId: sourceIdOf.get(s.SellerSku), mirrorSkuId: s.SkuId }))
      const planned = priceEntries(p.item_id, asSource, website)
      const mirrorId = new Map(asSource.map(s => [String(s.SkuId), s.mirrorSkuId]))
      for (const e of planned) entries.push({ ...e, skuId: mirrorId.get(String(e.skuId)) })
    }
    if (entries.length === 0) throw new Error('this product has no copy in the Bala Pasa shop')
    if (!dryRun) await post('/product/price_quantity/update', { payload: priceQuantityXml(entries) }, { accessToken: token })
    shops.push({ shop: 'Bala Pasa', ok: true, skus: entries.length, detail: describe(entries[0]) })
  } catch (err) {
    shops.push({ shop: 'Bala Pasa', ok: false, skus: 0, detail: err.message.slice(0, 200) })
  }

  return { shops, ok: shops.every(s => s.ok), summary: shops.map(s => `${s.shop}: ${s.ok ? s.detail : `FAILED, ${s.detail}`}`).join(' | ') }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
  const itemId = process.argv[2]
  const price = Number(arg('--price'))
  if (!/^\d+$/.test(itemId ?? '') || !(price > 0)) {
    console.error('usage: node scripts/daraz/push-price.mjs <daraz item id> --price <regular> [--sale <sale price>] [--dry-run]')
    process.exit(2)
  }
  const { default: pg } = await import('pg')
  const db = new pg.Client({ connectionString: process.env.DIRECT_URL?.replace(/\?.*$/, '') })
  await db.connect()
  const res = await pushPriceToDaraz(db, itemId, { price, salePrice: Number(arg('--sale')) || 0 }, { dryRun: process.argv.includes('--dry-run') })
  console.log((process.argv.includes('--dry-run') ? '(dry run) ' : '') + res.summary)
  await db.end()
  process.exit(res.ok ? 0 : 1)
}

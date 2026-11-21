// Bala Pasa Daraz shop: give every copied listing that has no long description the one its
// TrendWave original has (or, when the original has none either, its highlights).
//   node scripts/daraz/mirror-descriptions.mjs [--apply] [--limit N]
import pg from 'pg'
import { darazGet, darazPost, fetchProducts } from './api.mjs'
import { getAccessToken } from './tokens.mjs'

const APPLY = process.argv.includes('--apply')
const li = process.argv.indexOf('--limit')
const LIMIT = li > 0 ? Number(process.argv[li + 1]) : Infinity
const sleep = ms => new Promise(r => setTimeout(r, ms))

const db = new pg.Client({ connectionString: process.env.DIRECT_URL?.replace(/\?.*$/, '') })
await db.connect()
const sourceToken = await getAccessToken(db, 'trendwave')
const targetToken = await getAccessToken(db, 'balapasa')
await db.end()

const source = await fetchProducts(sourceToken)
const mirror = await fetchProducts(targetToken)
const sourceBySku = new Map()
for (const p of source) for (const s of p.skus ?? []) sourceBySku.set(`TW-${s.SkuId}`, p)

const lacking = mirror.filter(p => !p.attributes?.description && (p.skus ?? []).some(s => sourceBySku.has(s.SellerSku)))
console.log(`${mirror.length} Bala Pasa listings, ${lacking.length} without a long description${APPLY ? '' : ' (dry run)'}`)

let done = 0, failed = 0, fromHighlights = 0
for (const p of lacking.slice(0, LIMIT)) {
  const original = sourceBySku.get(p.skus.find(s => sourceBySku.has(s.SellerSku)).SellerSku)
  // The list call can leave the description out; ask for the full original.
  const full = (await darazGet('/product/item/get', { item_id: String(original.item_id) }, { accessToken: sourceToken })).data
  let description = full.attributes?.description
  if (!description) { description = full.attributes?.short_description ?? p.attributes?.short_description; fromHighlights++ }
  const name = String(p.attributes?.name).slice(0, 60)
  if (!description) { failed++; console.log(`  NOTHING TO USE  ${name}`); continue }
  if (!APPLY) { console.log(`  would add ${String(description).length} chars${full.attributes?.description ? '' : ' (from highlights)'}  ${name}`); continue }
  const payload = { Request: { Product: { ItemId: String(p.item_id), Attributes: { description }, Skus: { Sku: p.skus.map(s => ({ SkuId: String(s.SkuId), SellerSku: s.SellerSku })) } } } }
  try {
    await darazPost('/product/update', { payload: JSON.stringify(payload) }, { accessToken: targetToken })
    done++; console.log(`  added  ${name}`)
  } catch (err) { failed++; console.log(`  FAILED ${name}: ${err.message.slice(0, 160)}`) }
  await sleep(900)
}
console.log(`added: ${done} | failed: ${failed} | taken from highlights: ${fromHighlights}`)
process.exit(failed ? 1 : 0)

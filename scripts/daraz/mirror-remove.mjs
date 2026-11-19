/**
 * Delete every Bala Pasa Daraz listing that is NOT a mirror of a TrendWave product
 * (mirrors have SellerSku "TW-<SkuId>"). Deletion on Daraz is permanent.
 *
 *   node scripts/daraz/mirror-remove.mjs                 list what would be deleted
 *   node scripts/daraz/mirror-remove.mjs --apply --confirm-shop "Bala Pasa"
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { darazGet, darazPost, fetchProducts } from './api.mjs'

const APPLY = process.argv.includes('--apply')
const confirmShop = process.argv.includes('--confirm-shop') ? process.argv[process.argv.indexOf('--confirm-shop') + 1] : null
const BP = process.env.DARAZ_SHOP2_ACCESS_TOKEN
if (!BP) { console.error('DARAZ_SHOP2_ACCESS_TOKEN is required'); process.exit(2) }
const BATCH = 20
const sleep = ms => new Promise(r => setTimeout(r, ms))

const seller = (await darazGet('/seller/get', {}, { accessToken: BP })).data
const products = await fetchProducts(BP)
const isMirror = p => p.skus.some(s => String(s.SellerSku).startsWith('TW-'))
const mirrors = products.filter(isMirror), own = products.filter(p => !isMirror(p))

console.log(`shop: ${seller.name} (${seller.seller_id})`)
console.log(`listings: ${products.length} | TrendWave mirrors (kept): ${mirrors.length} | to delete: ${own.length} (${own.filter(p => p.status === 'Active').length} active)`)

if (!APPLY) { console.log('\nDRY RUN: nothing deleted.'); process.exit(0) }
if (confirmShop !== seller.name) { console.error(`REFUSING: shop is "${seller.name}" but --confirm-shop is "${confirmShop ?? '(missing)'}"`); process.exit(1) }

mkdirSync('scripts/daraz/snapshots', { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
writeFileSync(`scripts/daraz/snapshots/balapasa-deleted-${stamp}.json`, JSON.stringify(own))
const LOG = 'scripts/daraz/snapshots/mirror-remove-log.jsonl'

const skus = own.flatMap(p => p.skus.map(s => `SkuId_${p.item_id}_${s.SkuId}`))
let removed = 0, failed = 0
for (let i = 0; i < skus.length; i += BATCH) {
  const batch = skus.slice(i, i + BATCH)
  try {
    const res = await darazPost('/product/remove', { sku_id_list: JSON.stringify(batch) }, { accessToken: BP })
    removed += batch.length
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), batch, result: res.data ?? res }) + '\n')
  } catch (err) {
    failed += batch.length
    console.log(`FAIL batch at ${i}: ${err.message.slice(0, 300)}`)
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), batch, error: err.message }) + '\n')
  }
  await sleep(1200)
}
console.log(`delete requests sent for ${removed} SKUs, failed for ${failed}`)
const after = await fetchProducts(BP)
console.log(`listings now: ${after.length} | mirrors: ${after.filter(isMirror).length} | others left: ${after.filter(p => !isMirror(p)).length}`)

/**
 * Copy every sellable TrendWave product that the Bala Pasa Daraz shop does not have yet.
 * Safe to re-run: a product whose "TW-<SkuId>" SellerSku already exists in Bala Pasa is skipped.
 *
 *   node scripts/daraz/mirror-create.mjs --dry-run
 *   node scripts/daraz/mirror-create.mjs [--limit N]
 *   node scripts/daraz/mirror-create.mjs --replace-own-copies   also copy products Bala Pasa already lists under its own SKUs
 *
 * Needs DARAZ_ACCESS_TOKEN (TrendWave) and DARAZ_SHOP2_ACCESS_TOKEN (Bala Pasa) in the environment.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { darazGet, darazPost, fetchProducts } from './api.mjs'
import { buildCreatePayload, missingMandatory, sellerSkuFor } from './mirror-payload.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity
const REPLACE_OWN = process.argv.includes('--replace-own-copies')
// --set name=value supplies a required attribute the source listing lacks (repeatable).
const overrides = Object.fromEntries(process.argv.flatMap((a, i, all) => (a === '--set' && all[i + 1]?.includes('=') ? [all[i + 1].split(/=(.*)/s).slice(0, 2)] : [])))
const MAX_CONSECUTIVE_FAILURES = 5
const TW = process.env.DARAZ_ACCESS_TOKEN, BP = process.env.DARAZ_SHOP2_ACCESS_TOKEN
if (!TW || !BP) { console.error('DARAZ_ACCESS_TOKEN and DARAZ_SHOP2_ACCESS_TOKEN are required'); process.exit(2) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const norm = s => String(s ?? '').toLowerCase().replace(/by trendwave/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const activeSkus = p => (p.skus ?? []).filter(s => s.Status === 'active' && Number(s.price) > 0)

mkdirSync('scripts/daraz/snapshots', { recursive: true })
const LOG = 'scripts/daraz/snapshots/mirror-create-log.jsonl'
const CACHE = 'scripts/daraz/snapshots/category-attrs.json'
const catCache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

async function categoryAttrs(id) {
  if (!catCache[id] || catCache[id].some(a => a.options === undefined)) {
    const r = await darazGet('/category/attributes/get', { primary_category_id: id, language_code: 'en_US' }, { accessToken: BP })
    catCache[id] = (r.data ?? []).map(a => ({ name: a.name, type: a.attribute_type, mandatory: a.is_mandatory == 1, saleProp: a.is_sale_prop == 1, options: (a.options ?? []).map(o => o.name) }))
    writeFileSync(CACHE, JSON.stringify(catCache))
  }
  return catCache[id]
}

const [tw, bp] = [await fetchProducts(TW), await fetchProducts(BP)]
const bpSellerSkus = new Set(bp.flatMap(p => p.skus.map(s => s.SellerSku)))
const bpNames = new Set(bp.map(p => norm(p.attributes.name)))
const bpImages = new Set(bp.flatMap(p => p.images ?? []))

const todo = [], already = [], hadBefore = []
for (const p of tw.filter(p => p.status === 'Active' && activeSkus(p).length)) {
  if (activeSkus(p).some(s => bpSellerSkus.has(sellerSkuFor(s.SkuId)))) already.push(p)
  // Listings Bala Pasa carried before the mirror started are matched by name or picture, not by SellerSku.
  else if (!REPLACE_OWN && (bpNames.has(norm(p.attributes.name)) || (p.images ?? []).some(i => bpImages.has(i)))) hadBefore.push(p)
  else todo.push(p)
}
console.log(`TrendWave sellable: ${already.length + hadBefore.length + todo.length} | mirrored already: ${already.length} | Bala Pasa had its own copy: ${hadBefore.length} | to create: ${todo.length}`)

let created = 0, skipped = 0, failed = 0, streak = 0
for (const p of todo) {
  if (created >= limit) break
  const detail = (await darazGet('/product/item/get', { item_id: String(p.item_id) }, { accessToken: TW })).data
  const attrs = await categoryAttrs(String(detail.primary_category))
  const payload = buildCreatePayload(detail, attrs)
  // Fill required fields the source lacks, but only with neutral values: an explicit --set, Daraz's own
  // "Other" choice, or a package-contents line in the form the seller already uses.
  if (payload) {
    const product = payload.Request.Product
    for (const name of missingMandatory(payload, attrs)) {
      const attr = attrs.find(a => a.name === name)
      const value = overrides[name] ?? (attr.options.includes('Other') ? 'Other' : name === 'package_content' ? `1 x ${product.Attributes.name}`.slice(0, 250) : null)
      if (value == null) continue
      if (attr.type === 'sku') for (const sku of product.Skus.Sku) sku[name] ??= value
      else product.Attributes[name] = value
    }
  }
  const lacking = payload ? missingMandatory(payload, attrs) : ['active sku']
  if (lacking.length) {
    skipped++
    console.log(`SKIP ${p.item_id} ${p.attributes.name.slice(0, 50)}: missing ${lacking.join(', ')}`)
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), source: p.item_id, skipped: lacking }) + '\n')
    continue
  }
  if (DRY_RUN) { created++; continue }
  try {
    const res = await darazPost('/product/create', { payload: JSON.stringify(payload) }, { accessToken: BP })
    created++; streak = 0
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), source: p.item_id, created: res.data }) + '\n')
    if (created % 25 === 0) console.log(`... ${created} created`)
  } catch (err) {
    failed++; streak++
    console.log(`FAIL ${p.item_id} ${p.attributes.name.slice(0, 50)}: ${err.message.slice(0, 300)}`)
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), source: p.item_id, error: err.message }) + '\n')
    if (streak >= MAX_CONSECUTIVE_FAILURES) { console.log(`stopping: ${streak} failures in a row`); break }
  }
  await sleep(1000)
}
console.log(`${DRY_RUN ? 'would create' : 'created'}: ${created} | skipped (missing required fields): ${skipped} | failed: ${failed}`)

/**
 * Copy every sellable TrendWave product that the Bala Pasa Daraz shop does not have yet.
 * Safe to re-run: a product whose "TW-<SkuId>" SellerSku already exists in Bala Pasa is skipped.
 *
 *   node scripts/daraz/mirror-create.mjs --dry-run
 *   node scripts/daraz/mirror-create.mjs [--limit N]
 *   node scripts/daraz/mirror-create.mjs --replace-own-copies   also copy products Bala Pasa already lists under its own SKUs
 *   node scripts/daraz/mirror-create.mjs --set name=value        supply a required attribute the source lacks (repeatable)
 *
 * Needs DARAZ_ACCESS_TOKEN (TrendWave) and DARAZ_SHOP2_ACCESS_TOKEN (Bala Pasa) in the environment.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { fetchProducts } from './api.mjs'
import { sellerSkuFor } from './mirror-payload.mjs'
import { createMirror } from './mirror-lib.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const REPLACE_OWN = process.argv.includes('--replace-own-copies')
const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity
const overrides = Object.fromEntries(process.argv.flatMap((a, i, all) => (a === '--set' && all[i + 1]?.includes('=') ? [all[i + 1].split(/=(.*)/s).slice(0, 2)] : [])))
const MAX_CONSECUTIVE_FAILURES = 5
const TW = process.env.DARAZ_ACCESS_TOKEN, BP = process.env.DARAZ_SHOP2_ACCESS_TOKEN
if (!TW || !BP) { console.error('DARAZ_ACCESS_TOKEN and DARAZ_SHOP2_ACCESS_TOKEN are required'); process.exit(2) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const norm = s => String(s ?? '').toLowerCase().replace(/by trendwave/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const activeSkus = p => (p.skus ?? []).filter(s => s.Status === 'active' && Number(s.price) > 0)

mkdirSync('scripts/daraz/snapshots', { recursive: true })
const LOG = 'scripts/daraz/snapshots/mirror-create-log.jsonl'
const log = entry => appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')

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
  try {
    const res = await createMirror(p.item_id, { sourceToken: TW, targetToken: BP, overrides, dryRun: DRY_RUN })
    if (res.skipped) {
      skipped++
      console.log(`SKIP ${p.item_id} ${p.attributes.name.slice(0, 50)}: missing ${res.skipped.join(', ')}`)
      log({ source: p.item_id, skipped: res.skipped })
      continue
    }
    created++; streak = 0
    if (!DRY_RUN) { log({ source: p.item_id, created: res.created }); if (created % 25 === 0) console.log(`... ${created} created`) }
  } catch (err) {
    failed++; streak++
    console.log(`FAIL ${p.item_id} ${p.attributes.name.slice(0, 50)}: ${err.message.slice(0, 300)}`)
    log({ source: p.item_id, error: err.message })
    if (streak >= MAX_CONSECUTIVE_FAILURES) { console.log(`stopping: ${streak} failures in a row`); break }
  }
  if (!DRY_RUN) await sleep(1000)
}
console.log(`${DRY_RUN ? 'would create' : 'created'}: ${created} | skipped (missing required fields): ${skipped} | failed: ${failed}`)

/**
 * Daily TrendWave → Bala Pasa (Daraz shop) sync: prices, sale prices and dates, stock, new and delisted products.
 *
 *   node scripts/daraz/mirror-sync.mjs            apply
 *   node scripts/daraz/mirror-sync.mjs --dry-run  report only
 *
 * Tokens for both shops come from app_settings (see tokens.mjs). Alerts go to WhatsApp and/or Discord when configured (see notify.mjs).
 */
import { useUtc } from './utc.mjs'
import { config } from 'dotenv'
import pg from 'pg'
import { darazPost, fetchProducts } from './api.mjs'
import { getAccessToken } from './tokens.mjs'
import { notify } from './notify.mjs'
import { planMirror, priceQuantityXml } from './mirror-plan.mjs'
import { createMirror } from './mirror-lib.mjs'
import { loadControls, limitMirrorPlan } from './controls.mjs'
import { recordRun } from './runs.mjs'

config({ path: '.env.local', quiet: true })

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH = 20
// A source response this much smaller than the mirror is treated as an API fault, not mass delisting.
const MIN_CATALOG_RATIO = 0.5
const SKIP_KEY = 'daraz.mirror.skip'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })
await db.connect()
await useUtc(db)

// The switches from Settings → Daraz. A dry run always runs, so a switched-off sync can still be previewed.
const startedAt = new Date()
const controls = await loadControls(db)
if (!controls.mirrorSync && !DRY_RUN) {
  await recordRun(db, { job: 'mirror', status: 'SKIPPED', summary: 'Switched off in Settings → Daraz', startedAt })
  console.log(`Bala Pasa Daraz mirror ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC: skipped, switched off in Settings → Daraz`)
  await db.end()
  process.exit(0)
}

let exitCode = 0
try {
  const sourceToken = await getAccessToken(db, 'trendwave')
  const targetToken = await getAccessToken(db, 'balapasa')
  // Source products Daraz refused to accept as a copy; retried only by hand with mirror-create.mjs.
  const skipRow = (await db.query('SELECT value FROM app_settings WHERE key = $1', [SKIP_KEY])).rows[0]
  const skipCreate = new Set(skipRow ? JSON.parse(skipRow.value) : [])

  const source = await fetchProducts(sourceToken)
  const mirror = await fetchProducts(targetToken)
  const fullPlan = planMirror(source, mirror, { skipCreate })

  const mirrorSkuCount = mirror.reduce((n, p) => n + p.skus.filter(s => String(s.SellerSku).startsWith('TW-')).length, 0)
  if (mirrorSkuCount > 0 && fullPlan.soldOut.length > mirrorSkuCount * (1 - MIN_CATALOG_RATIO)) {
    throw new Error(`source looks incomplete: ${fullPlan.soldOut.length} of ${mirrorSkuCount} mirrored SKUs would go sold out; refusing to sync`)
  }

  const { plan, off } = limitMirrorPlan(fullPlan, controls)

  const priced = plan.updates.filter(u => u.changed.some(c => c !== 'quantity'))
  const fmt = u => `${u.salePrice ? `${u.salePrice} (was ${u.price})` : u.price}`
  const fmtOld = u => `${u.old.salePrice ? `${u.old.salePrice} (was ${u.old.price})` : u.old.price}`
  const lines = [
    `Bala Pasa Daraz mirror ${DRY_RUN ? '(dry run) ' : ''}${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    `TrendWave: ${source.filter(p => p.status === 'Active').length} active | Bala Pasa: ${mirrorSkuCount} mirrored SKUs`,
    `price/sale changes: ${priced.length} | stock-only changes: ${plan.updates.length - priced.length} | new: ${plan.create.length} | sold out: ${plan.soldOut.length} | need attention: ${plan.partial.length} | not copyable: ${skipCreate.size}`,
    ...priced.slice(0, 15).map(u => `  ${u.name.slice(0, 55)}: ${fmtOld(u)} → ${fmt(u)}`),
    ...plan.create.slice(0, 10).map(p => `  NEW  ${String(p.attributes?.name).slice(0, 70)}`),
    ...plan.soldOut.slice(0, 10).map(s => `  SOLD OUT (no longer sold by TrendWave)  ${s.name.slice(0, 55)}`),
    ...plan.partial.slice(0, 5).map(p => `  NEEDS ATTENTION new variant not copied: ${p.name.slice(0, 50)} (${p.missing.join(', ')})`),
  ]

  if (off.length) lines.push(`switched off in settings, not done: ${off.join(', ')}`)

  let failures = 0
  if (!DRY_RUN) {
    const entries = [...plan.updates, ...plan.soldOut.map(s => ({ itemId: s.itemId, skuId: s.skuId, quantity: 0 }))]
    for (let i = 0; i < entries.length; i += BATCH) {
      try {
        await darazPost('/product/price_quantity/update', { payload: priceQuantityXml(entries.slice(i, i + BATCH)) }, { accessToken: targetToken })
      } catch (err) {
        failures++
        lines.push(`  FAILED update batch ${i / BATCH + 1}: ${err.message.slice(0, 200)}`)
      }
      await sleep(800)
    }
    for (const p of plan.create) {
      try {
        const res = await createMirror(p.item_id, { sourceToken, targetToken })
        if (res.skipped) {
          skipCreate.add(String(p.item_id))
          lines.push(`  NOT COPIED (will not retry) ${String(p.attributes?.name).slice(0, 50)}: Daraz requires ${res.skipped.join(', ')}`)
        }
      } catch (err) {
        skipCreate.add(String(p.item_id))
        lines.push(`  NOT COPIED (will not retry) ${String(p.attributes?.name).slice(0, 50)}: ${err.message.slice(0, 150)}`)
      }
      await sleep(1000)
    }
  }

  if (!DRY_RUN) {
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [SKIP_KEY, JSON.stringify([...skipCreate])])
  }
  const changed = plan.updates.length + plan.create.length + plan.soldOut.length + plan.partial.length
  if (!DRY_RUN) await recordRun(db, { job: 'mirror', status: failures ? 'FAILED' : 'OK', changes: changed, summary: lines.join('\n'), startedAt })
  await db.end()

  console.log(lines.join('\n'))
  if (changed > 0 && !DRY_RUN && controls.notifyChanges) await notify(lines.join('\n'))
  if (failures) exitCode = 1
} catch (err) {
  exitCode = 1
  console.error(`Bala Pasa mirror sync FAILED: ${err.message}`)
  await notify(`Bala Pasa mirror sync FAILED: ${err.message}`)
  if (!DRY_RUN) await recordRun(db, { job: 'mirror', status: 'FAILED', summary: err.message, startedAt })
  await db.end().catch(() => {})
}
process.exit(exitCode)

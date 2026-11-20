/**
 * Copies Daraz orders (Bala Pasa shop and TrendWave shop) into marketplace_orders, read-only, and
 * sends a WhatsApp message for new ones. Runs every 15 minutes from cron on the VPS.
 *
 *   node scripts/daraz/orders-sync.mjs [--dry-run] [--manual] [--days <n>]
 *
 * Each run asks Daraz for orders changed since the previous run (with an hour of overlap); the very
 * first run for a shop goes back --days (default 30) and sends no alerts.
 */
import { useUtc } from './utc.mjs'
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'
import { darazGet } from './api.mjs'
import { getAccessToken } from './tokens.mjs'
import { notify } from './notify.mjs'
import { loadControls } from './controls.mjs'
import { recordRun } from './runs.mjs'
import { SHOPS, darazTimeParam, mapOrder, mapItem, ordersToAlert, alertText } from './orders-lib.mjs'

config({ path: '.env.local', quiet: true })

const DRY_RUN = process.argv.includes('--dry-run')
const DAYS = process.argv.includes('--days') ? Number(process.argv[process.argv.indexOf('--days') + 1]) || 30 : 30
const PAGE = 100
const ITEM_BATCH = 40
const OVERLAP_MS = 60 * 60 * 1000
const cursorKey = shop => `daraz.orders.cursor.${shop}`

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })
await db.connect()
await useUtc(db)

const startedAt = new Date()
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
const controls = await loadControls(db)
if (!controls.ordersSync && !DRY_RUN) {
  console.log(`Daraz orders ${stamp()} UTC: skipped, switched off in Settings → Daraz`)
  await db.end()
  process.exit(0)
}

async function fetchOrders(accessToken, since) {
  const out = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await darazGet('/orders/get',
      { update_after: darazTimeParam(since), limit: PAGE, offset, sort_by: 'updated_at', sort_direction: 'ASC' }, { accessToken })
    const orders = (res.data ?? res).orders ?? []
    out.push(...orders)
    if (orders.length < PAGE) return out
  }
}

async function fetchItems(accessToken, orderIds) {
  const out = []
  for (let i = 0; i < orderIds.length; i += ITEM_BATCH) {
    const res = await darazGet('/orders/items/get', { order_ids: JSON.stringify(orderIds.slice(i, i + ITEM_BATCH).map(Number)) }, { accessToken })
    for (const entry of res.data ?? []) out.push(...(entry.order_items ?? []))
  }
  return out
}

async function syncShop(shop) {
  const cursorRow = (await db.query('SELECT value FROM app_settings WHERE key = $1', [cursorKey(shop)])).rows[0]
  const firstRun = !cursorRow
  const since = firstRun ? new Date(Date.now() - DAYS * 86_400_000) : new Date(new Date(cursorRow.value).getTime() - OVERLAP_MS)
  const accessToken = await getAccessToken(db, shop)
  const fetchedAt = new Date()

  const mapped = (await fetchOrders(accessToken, since)).map(o => mapOrder(o, shop)).filter(Boolean)
  const known = new Map((await db.query(
    `SELECT external_id, id, changed_at FROM marketplace_orders WHERE shop = $1 AND external_id = ANY($2::text[])`,
    [shop, mapped.map(o => o.externalId)])).rows.map(r => [r.external_id, r]))

  // Only orders that are new or changed need their items fetched again.
  const changed = mapped.filter(o => !known.has(o.externalId) || new Date(known.get(o.externalId).changed_at).getTime() !== o.changedAt.getTime())
  const items = changed.length ? (await fetchItems(accessToken, changed.map(o => o.externalId))).map(mapItem).filter(Boolean) : []
  const itemsByOrder = new Map()
  for (const i of items) (itemsByOrder.get(i.externalOrderId) ?? itemsByOrder.set(i.externalOrderId, []).get(i.externalOrderId)).push(i)

  const fresh = changed.filter(o => !known.has(o.externalId))
  const alerts = ordersToAlert(mapped, new Set(known.keys()), { firstRun })

  if (!DRY_RUN) {
    for (const o of changed) {
      await db.query('BEGIN')
      try {
        const row = (await db.query(
          `INSERT INTO marketplace_orders (id, shop, external_id, status, items_count, total, shipping_fee, payment_method,
                                           customer_name, phone, city, address, placed_at, changed_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
           ON CONFLICT (shop, external_id) DO UPDATE SET
             status = EXCLUDED.status, items_count = EXCLUDED.items_count, total = EXCLUDED.total, shipping_fee = EXCLUDED.shipping_fee,
             payment_method = EXCLUDED.payment_method, customer_name = EXCLUDED.customer_name, phone = EXCLUDED.phone,
             city = EXCLUDED.city, address = EXCLUDED.address, changed_at = EXCLUDED.changed_at, updated_at = now()
           RETURNING id`,
          [createId(), o.shop, o.externalId, o.status, o.itemsCount, o.total, o.shippingFee, o.paymentMethod,
            o.customerName, o.phone, o.city, o.address, o.placedAt, o.changedAt])).rows[0]
        for (const i of itemsByOrder.get(o.externalId) ?? []) {
          await db.query(
            `INSERT INTO marketplace_order_items (id, order_id, external_item_id, name, sku, variation, image, item_price, paid_price,
                                                  status, tracking_code, cancel_reason, product_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ON CONFLICT (external_item_id) DO UPDATE SET
               status = EXCLUDED.status, paid_price = EXCLUDED.paid_price, tracking_code = EXCLUDED.tracking_code,
               cancel_reason = EXCLUDED.cancel_reason, variation = EXCLUDED.variation`,
            [createId(), row.id, i.externalItemId, i.name, i.sku, i.variation, i.image, i.itemPrice, i.paidPrice,
              i.status, i.trackingCode, i.cancelReason, i.productUrl])
        }
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }
    }
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [cursorKey(shop), fetchedAt.toISOString()])
    if (alerts.length && controls.ordersAlert) await notify(alertText(SHOPS[shop].label, alerts, itemsByOrder))
  }
  return { shop, seen: mapped.length, fresh: fresh.length, updated: changed.length - fresh.length, alerts: alerts.length, firstRun }
}

let exitCode = 0
const lines = [`Daraz orders ${DRY_RUN ? '(dry run) ' : ''}${stamp()} UTC`]
let changes = 0
for (const [shop, info] of Object.entries(SHOPS)) {
  if (!controls[info.control]) { lines.push(`${info.label}: switched off in settings`); continue }
  try {
    const r = await syncShop(shop)
    changes += r.fresh + r.updated
    lines.push(`${info.label}: ${r.fresh} new, ${r.updated} updated${r.firstRun ? ' (first run, no alerts)' : `, ${r.alerts} alerted`}`)
  } catch (err) {
    exitCode = 1
    lines.push(`${info.label}: FAILED ${err.message.slice(0, 200)}`)
  }
}
console.log(lines.join(' | '))
if (!DRY_RUN) {
  // Quiet runs are not recorded one by one: every-15-minute rows would bury the ones that matter.
  if (exitCode || changes) await recordRun(db, { job: 'orders', status: exitCode ? 'FAILED' : 'OK', changes, summary: lines.join('\n'), startedAt })
  else await db.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('daraz.orders.lastQuietRun', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [new Date().toISOString()])
}
await db.end()
process.exit(exitCode)

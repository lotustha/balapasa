/**
 * Copies buyer reviews of the TrendWave Daraz listings onto the same products on the website.
 * Reads the review list Daraz shows on each product page. Names are masked, a review is stored
 * once (by its Daraz id) and each product's star rating is recalculated from what is stored.
 * Safe to re-run. Daraz blocks fast readers, so it goes slowly and stops at the first block;
 * the next run carries on with the products checked longest ago.
 *
 *   node scripts/daraz/reviews-sync.mjs [--dry-run] [--limit <products>]
 */
import { useUtc } from './utc.mjs'
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'
import { mapReview } from './reviews-lib.mjs'
import { recordRun } from './runs.mjs'

config({ path: '.env.local', quiet: true })

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity
const PAUSE_MS = 1500
const PAGE = 50
const MAX_PAGES = 4
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })
await db.connect()
await useUtc(db)
const startedAt = new Date()
const sleep = ms => new Promise(r => setTimeout(r, ms))

class Blocked extends Error {}

async function reviewPage(itemId, pageNo) {
  const res = await fetch(`https://my.daraz.com.np/pdp/review/getReviewList?itemId=${itemId}&pageSize=${PAGE}&filter=0&sort=0&pageNo=${pageNo}`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { throw new Blocked(`Daraz answered with a check page (HTTP ${res.status})`) }
  if (!body?.model) throw new Error(`unexpected answer for item ${itemId}`)
  return body.model
}

// Products checked longest ago come first, so a run that is cut short still makes progress.
const { rows: products } = await db.query(
  `SELECT p.id, p.sku FROM products p WHERE p.sku ~ '^DZ-[0-9]+$' AND p.is_active
   ORDER BY p.reviews_checked_at ASC NULLS FIRST, p.id`)

let checked = 0, stored = 0, withReviews = 0, stopped = ''
for (const p of products) {
  if (checked >= LIMIT) break
  const itemId = p.sku.slice(3)
  try {
    const rows = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const model = await reviewPage(itemId, page)
      for (const raw of model.items ?? []) { const r = mapReview(raw); if (r) rows.push(r) }
      await sleep(PAUSE_MS)
      if (page >= (model.paging?.totalPages ?? 1)) break
    }
    checked++
    if (rows.length) withReviews++
    if (DRY_RUN) { stored += rows.length; continue }
    for (const r of rows) {
      await db.query(
        `INSERT INTO reviews (id, product_id, rating, comment, created_at, author_name, source, external_id, images, variant)
         VALUES ($1,$2,$3,$4,$5,$6,'daraz',$7,$8,$9)
         ON CONFLICT (external_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, images = EXCLUDED.images, variant = EXCLUDED.variant`,
        [createId(), p.id, r.rating, r.comment, r.createdAt, r.authorName, r.externalId, r.images, r.variant])
      stored++
    }
    await db.query(
      `UPDATE products SET reviews_checked_at = now(),
         rating = COALESCE((SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE product_id = $1), 0),
         review_count = (SELECT count(*) FROM reviews WHERE product_id = $1)
       WHERE id = $1`, [p.id])
  } catch (err) {
    if (err instanceof Blocked) { stopped = err.message; break }
    console.error(`item ${itemId}: ${err.message}`)
    await sleep(PAUSE_MS)
  }
}

const summary = `${DRY_RUN ? '(dry run) ' : ''}checked ${checked} of ${products.length} products, ${withReviews} have Daraz reviews, ${stored} reviews stored${stopped ? `; stopped early: ${stopped}` : ''}`
console.log(new Date().toISOString(), summary)
if (!DRY_RUN) await recordRun(db, { job: 'reviews', status: stopped && checked === 0 ? 'failed' : 'ok', changes: stored, summary, startedAt })
await db.end()

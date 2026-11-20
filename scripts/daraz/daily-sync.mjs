/**
 * Daily Daraz → website sync: prices, sale prices, variants, new and delisted products.
 *
 *   node scripts/daraz/daily-sync.mjs              apply changes
 *   node scripts/daraz/daily-sync.mjs --dry-run    report only
 *   node scripts/daraz/daily-sync.mjs --apply-held also apply price moves over the 20% hold threshold
 *
 * Every price change is written to price_history. Alerts go to WhatsApp and/or Discord when configured (see notify.mjs).
 */
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'
import { fetchProducts, fetchCategoryPaths } from './api.mjs'
import { getAccessToken } from './tokens.mjs'
import { notify } from './notify.mjs'
import { mergeFamilies } from './families.mjs'
import { mapProduct } from './map.mjs'
import { planSync } from './plan-sync.mjs'
import { chooseFlags } from './flags.mjs'
import { loadControls, limitSitePlan } from './controls.mjs'
import { refreshCategoryArt } from './category-art.mjs'
import { ensureSupplier, insertOptions, insertProduct, insertVariant, slugify } from './store.mjs'

config({ path: '.env.local', quiet: true })

const DRY_RUN = process.argv.includes('--dry-run')
const APPLY_HELD = process.argv.includes('--apply-held')
// A Daraz response this much smaller than the site's catalog is treated as an API fault, not mass delisting.
const MIN_CATALOG_RATIO = 0.5

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })
await db.connect()

// The switches from Settings → Daraz. A dry run always runs, so a switched-off sync can still be previewed.
const controls = await loadControls(db)
if (!controls.websiteSync && !DRY_RUN) {
  console.log(`Daraz sync ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC: skipped, switched off in Settings → Daraz`)
  await db.end()
  process.exit(0)
}

async function loadExisting() {
  const products = (await db.query(`SELECT id, sku, name, price, sale_price AS "salePrice", sale_price_expires_at AS "salePriceExpiresAt", is_active AS "isActive" FROM products WHERE sku LIKE 'DZ-%'`)).rows
  const variants = (await db.query(
    `SELECT v.id, v.product_id AS "productId", v.sku, v.price, v.is_active AS "isActive"
       FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.sku LIKE 'DZ-%'`)).rows
  const byProduct = new Map()
  for (const v of variants) (byProduct.get(v.productId) ?? byProduct.set(v.productId, []).get(v.productId)).push(v)
  return products.map(p => ({ ...p, variants: byProduct.get(p.id) ?? [] }))
}

// New products land in their Daraz top-level category, matching how the catalog was imported.
async function categoryFor(darazCategoryId, accessToken, cache) {
  const mapped = (await db.query(`SELECT category_id FROM category_mappings WHERE source = 'daraz' AND external_id = $1`, [darazCategoryId])).rows[0]
  if (mapped) return mapped.category_id
  cache.paths ??= await fetchCategoryPaths(accessToken)
  const path = cache.paths.get(darazCategoryId)
  const top = path?.[0] ?? 'Other'
  let cat = (await db.query('SELECT id FROM categories WHERE slug = $1', [slugify(top)])).rows[0]
  if (!cat) cat = (await db.query('INSERT INTO categories (id, name, slug) VALUES ($1,$2,$3) RETURNING id', [createId(), top, slugify(top)])).rows[0]
  await db.query(
    `INSERT INTO category_mappings (id, source, external_name, external_id, category_id) VALUES ($1, 'daraz', $2, $3, $4) ON CONFLICT (source, external_name) DO NOTHING`,
    [createId(), `${path?.at(-1) ?? top} #${darazCategoryId}`, darazCategoryId, cat.id])
  return cat.id
}

async function logPrice(c, status) {
  if (status === 'HELD') {
    const dup = (await db.query(
      `SELECT 1 FROM price_history WHERE sku = $1 AND status = 'HELD' AND new_price = $2 AND new_sale_price IS NOT DISTINCT FROM $3 LIMIT 1`,
      [c.sku, c.new.price, c.new.salePrice])).rows[0]
    if (dup) return
  }
  await db.query(
    `INSERT INTO price_history (id, product_id, sku, name, old_price, new_price, old_sale_price, new_sale_price, change_percent, status, source, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'daraz-sync',now())`,
    [createId(), c.id, c.sku, c.name, c.old.price, c.new.price, c.old.salePrice, c.new.salePrice, c.changePercent, status])
}

const money = p => (p.salePrice != null ? `${p.salePrice} (was ${p.price})` : `${p.price}`)

// "New" and "featured" on the homepage are derived from the catalog each day (see flags.mjs).
// Listing dates are copied from Daraz so "newly added" follows the seller's order, not the import's.
async function refreshFlags(mapped) {
  const listedAt = new Map(mapped.filter(m => m.createdAt).map(m => [m.sku, m.createdAt]))
  const rows = (await db.query(
    `SELECT id, sku, category_id AS "categoryId", price, sale_price AS "salePrice", view_count AS "viewCount", stock,
            is_new AS "isNew", is_featured AS "isFeatured", created_at AS "createdAt"
       FROM products WHERE sku LIKE 'DZ-%' AND is_active`)).rows
  let redated = 0
  for (const r of rows) {
    const d = listedAt.get(r.sku)
    if (d && Math.abs(new Date(r.createdAt) - d) > 86_400_000) {
      await db.query('UPDATE products SET created_at = $1 WHERE id = $2', [d, r.id])
      r.createdAt = d
      redated++
    }
  }
  const { newIds, featuredIds } = chooseFlags(rows)
  const isNew = new Set(newIds), isFeatured = new Set(featuredIds)
  let changed = 0
  for (const r of rows) {
    const n = isNew.has(r.id), f = isFeatured.has(r.id)
    if (r.isNew !== n || r.isFeatured !== f) {
      await db.query('UPDATE products SET is_new = $1, is_featured = $2 WHERE id = $3', [n, f, r.id])
      changed++
    }
  }
  return { changed, redated }
}

// Website stock follows Daraz: products and variants take the Daraz quantity and become tracked, so
// what is sold out there is sold out here. Switched off, imported products go back to untracked
// (always orderable) rather than being left blocked by a stale figure.
async function syncStock(mapped, follow) {
  if (!follow) {
    return (await db.query(`UPDATE products SET track_inventory = false, updated_at = now() WHERE sku LIKE 'DZ-%' AND track_inventory`)).rowCount
  }
  const skus = [], qty = [], vSkus = [], vQty = []
  for (const m of mapped) {
    skus.push(m.sku); qty.push(Math.max(0, Math.trunc(m.stock) || 0))
    for (const v of m.variants ?? []) { vSkus.push(v.sku); vQty.push(Math.max(0, Math.trunc(v.stock) || 0)) }
  }
  const products = await db.query(
    `UPDATE products p SET stock = d.stock, track_inventory = true, updated_at = now()
       FROM unnest($1::text[], $2::int[]) AS d(sku, stock)
      WHERE p.sku = d.sku AND (p.stock <> d.stock OR NOT p.track_inventory)`, [skus, qty])
  const variants = await db.query(
    `UPDATE product_variants v SET stock = d.stock
       FROM unnest($1::text[], $2::int[]) AS d(sku, stock), products p
      WHERE v.sku = d.sku AND p.id = v.product_id AND p.sku LIKE 'DZ-%' AND v.stock <> d.stock`, [vSkus, vQty])
  return products.rowCount + variants.rowCount
}

let exitCode = 0
try {
  const accessToken = await getAccessToken(db)
  const raw = await fetchProducts(accessToken)
  const mapped = mergeFamilies(raw).map(p => mapProduct(p, new Date())).filter(Boolean)
  const existing = await loadExisting()
  const activeOnSite = existing.filter(e => e.isActive).length

  if (activeOnSite > 0 && mapped.length < activeOnSite * MIN_CATALOG_RATIO) {
    throw new Error(`Daraz returned ${mapped.length} sellable products but the site has ${activeOnSite}; refusing to sync`)
  }

  const { plan, off } = limitSitePlan(
    planSync(mapped, existing, { applyHeld: APPLY_HELD, holdOver: controls.priceHoldPercent / 100 }), controls)
  const applied = plan.priceChanges.filter(c => !c.held)
  const held = plan.priceChanges.filter(c => c.held)
  const repriced = applied.filter(c => c.priceChanged)
  const redated = applied.filter(c => !c.priceChanged)
  const heldVariants = plan.variantChanges.flatMap(v => v.priceUpdates.filter(u => u.held).map(u => ({ ...u, name: v.name })))
  const variantEdits = plan.variantChanges.reduce((n, v) => n + v.priceUpdates.filter(u => !u.held).length + v.create.length + v.deactivate.length + v.reactivate.length, 0)

  const lines = [
    `Daraz sync ${DRY_RUN ? '(dry run) ' : ''}${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    `Daraz: ${mapped.length} sellable products | site: ${activeOnSite} active`,
    `price changes: ${repriced.length} applied, ${held.length + heldVariants.length} held | sale dates: ${redated.length} | new: ${plan.create.length} | hidden: ${plan.deactivate.length} | restored: ${plan.reactivate.length} | variant edits: ${variantEdits}`,
    ...repriced.slice(0, 15).map(c => `  ${c.changePercent > 0 ? '+' : ''}${c.changePercent}%  ${c.name.slice(0, 60)}: ${money(c.old)} → ${money(c.new)}`),
    ...held.map(c => `  HELD ${c.changePercent > 0 ? '+' : ''}${c.changePercent}%  ${c.name.slice(0, 60)}: ${money(c.old)} → ${money(c.new)}`),
    ...heldVariants.map(u => `  HELD variant ${u.sku} of ${u.name.slice(0, 50)}: ${u.old ?? 'product price'} → ${u.new ?? 'product price'}`),
    ...plan.create.slice(0, 10).map(m => `  NEW  ${m.name.slice(0, 70)} (${money(m)})`),
    ...plan.deactivate.slice(0, 10).map(d => `  HIDDEN  ${d.name.slice(0, 70)}`),
  ]

  if (off.length) lines.push(`switched off in settings, not done: ${off.join(', ')}`)

  if (!DRY_RUN) {
    const newCategoryIds = new Map()
    const cache = {}
    for (const m of plan.create) {
      if (!newCategoryIds.has(m.darazCategoryId)) newCategoryIds.set(m.darazCategoryId, await categoryFor(m.darazCategoryId, accessToken, cache))
    }
    await db.query('BEGIN')
    try {
      for (const c of applied) {
        await db.query(
          `UPDATE products SET price = $1, sale_price = $2, sale_price_starts_at = $3, sale_price_expires_at = $4, updated_at = now() WHERE id = $5`,
          [c.new.price, c.new.salePrice, c.new.salePriceStartsAt, c.new.salePriceExpiresAt, c.id])
        if (c.priceChanged) await logPrice(c, 'APPLIED')
      }
      for (const c of held) await logPrice(c, 'HELD')
      for (const d of plan.deactivate) await db.query('UPDATE products SET is_active = false, updated_at = now() WHERE id = $1', [d.id])
      for (const r of plan.reactivate) await db.query('UPDATE products SET is_active = true, updated_at = now() WHERE id = $1', [r.id])

      for (const vc of plan.variantChanges) {
        for (const u of vc.priceUpdates) if (!u.held) await db.query('UPDATE product_variants SET price = $1 WHERE id = $2', [u.new, u.id])
        for (const d of vc.deactivate) await db.query('UPDATE product_variants SET is_active = false WHERE id = $1', [d.id])
        for (const r of vc.reactivate) await db.query('UPDATE product_variants SET is_active = true WHERE id = $1', [r.id])
        for (const v of vc.create) await insertVariant(db, vc.productId, v)
        if (vc.structural) {
          // Option names are derived from the full set of values, so every variant's labels are rewritten with them.
          await db.query('DELETE FROM product_options WHERE product_id = $1', [vc.productId])
          await insertOptions(db, vc.productId, vc.options)
          for (const v of vc.all) {
            await db.query('UPDATE product_variants SET title = $1, options = $2, image = $3 WHERE sku = $4 AND product_id = $5',
              [v.title, JSON.stringify(v.options), v.image, v.sku, vc.productId])
          }
        }
      }

      if (plan.create.length) {
        const supplierId = await ensureSupplier(db)
        for (const m of plan.create) await insertProduct(db, m, newCategoryIds.get(m.darazCategoryId), supplierId)
      }
      await db.query('COMMIT')
    } catch (err) {
      await db.query('ROLLBACK')
      throw err
    }
  }

  if (!DRY_RUN) {
    const stockChanges = await syncStock(mapped, controls.websiteStock)
    if (stockChanges) lines.push(controls.websiteStock ? `stock updated on ${stockChanges} products and variants` : `stock tracking switched off on ${stockChanges} products`)
    const flags = controls.homepageFlags ? await refreshFlags(mapped) : { changed: 0, redated: 0 }
    if (flags.changed || flags.redated) lines.push(`homepage flags updated on ${flags.changed} products, listing dates aligned on ${flags.redated}`)
    const art = controls.categoryArt ? await refreshCategoryArt(db) : 0
    if (art) lines.push(`category pictures, icons or colours filled in on ${art} categories`)
  }

  console.log(lines.join('\n'))
  const changed = plan.priceChanges.length + heldVariants.length + plan.create.length + plan.deactivate.length + plan.reactivate.length + variantEdits
  if (changed > 0 && !DRY_RUN && controls.notifyChanges) await notify(lines.join('\n'))
} catch (err) {
  exitCode = 1
  console.error(`Daraz sync FAILED: ${err.message}`)
  await notify(`Daraz sync FAILED: ${err.message}`)
}

await db.end()
process.exit(exitCode)

/**
 * Replace every website product with the active products of a Daraz snapshot.
 *
 * Dry run (read-only):  node scripts/daraz/import-website.mjs <snapshot.json>
 * Apply:                node scripts/daraz/import-website.mjs <snapshot.json> --apply --confirm-db <dbname>
 * Rollback test:        ... --apply --confirm-db <dbname> --fail-after <n>
 *
 * DIRECT_URL / DATABASE_URL from the environment win over .env.local.
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'
import { mapProduct } from './map.mjs'
import { mergeFamilies } from './families.mjs'

config({ path: '.env.local', quiet: true })

const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] }
const snapshotPath = args.find(a => !a.startsWith('--') && a.endsWith('.json'))
const APPLY = args.includes('--apply')
const confirmDb = flag('--confirm-db')
const failAfter = flag('--fail-after') ? Number(flag('--fail-after')) : null
const SUPPLIER = 'Daraz TrendWave'

if (!snapshotPath) { console.error('usage: import-website.mjs <snapshot.json> [--apply --confirm-db <name>]'); process.exit(2) }

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
const now = new Date()
const mapped = mergeFamilies(snapshot.products).map(p => mapProduct(p, now)).filter(Boolean)

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const client = new pg.Client({ connectionString: url })
await client.connect()

const one = async (sql, params) => (await client.query(sql, params)).rows[0]
const count = async table => Number((await one(`SELECT count(*) AS n FROM ${table}`)).n)

async function resolveCategories(db) {
  const mappings = (await db.query(`SELECT external_id, external_name, category_id FROM category_mappings WHERE source = 'daraz'`)).rows
  const byId = new Map(mappings.filter(m => m.external_id).map(m => [String(m.external_id), m.category_id]))
  const byName = new Map(mappings.map(m => [m.external_name.toLowerCase(), m.category_id]))
  const cats = (await db.query(`SELECT id, name, slug FROM categories`)).rows
  const bySlug = new Map(cats.map(c => [c.slug, c]))
  const nameOf = new Map(cats.map(c => [c.id, c.name]))

  // Daraz reuses leaf names under different parents; those share one website category.
  const plan = new Map()
  const creating = new Map()
  for (const darazId of new Set(mapped.map(m => m.darazCategoryId))) {
    const darazName = snapshot.categories[darazId] ?? `Daraz ${darazId}`
    const slug = slugify(darazName)
    const existingId = byId.get(darazId) ?? byName.get(darazName.toLowerCase())
    if (existingId) { plan.set(darazId, { how: 'mapped', categoryId: existingId, name: nameOf.get(existingId), darazName }); continue }
    const sameSlug = bySlug.get(slug)
    if (sameSlug) plan.set(darazId, { how: 'existing-category', categoryId: sameSlug.id, name: sameSlug.name, darazName, mappingName: darazName })
    else if (creating.has(slug)) plan.set(darazId, { how: 'share-created', categoryId: creating.get(slug), name: darazName, darazName, mappingName: `${darazName} #${darazId}` })
    else {
      const categoryId = createId()
      creating.set(slug, categoryId)
      plan.set(darazId, { how: 'create', categoryId, name: darazName, slug, darazName, mappingName: darazName })
    }
  }
  return plan
}

const dbName = (await one('SELECT current_database() AS db')).db
const before = {}
for (const t of ['products', 'product_variants', 'reviews', 'inventory_logs', 'orders']) before[t] = await count(t)
const plan = await resolveCategories(client)

console.log(`database: ${dbName}`)
console.log(`current:  ${Object.entries(before).map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log(`snapshot: ${snapshotPath} (fetched ${snapshot.fetchedAt})`)
console.log(`would import: ${mapped.length} products (${mapped.filter(m => m.salePrice != null).length} on sale, ${mapped.filter(m => m.variants.length).length} with variants, ${mapped.reduce((n, m) => n + m.variants.length, 0)} variant rows)`)
const hows = [...plan.values()].reduce((acc, c) => (acc[c.how] = (acc[c.how] ?? 0) + 1, acc), {})
console.log(`categories: ${plan.size} Daraz categories → ${Object.entries(hows).map(([k, v]) => `${v} ${k}`).join(', ')}`)
for (const [id, c] of plan) if (c.how !== 'mapped') console.log(`  ${c.how.padEnd(17)} ${id}  "${c.darazName}"${c.how === 'existing-category' ? ` → existing "${c.name}"` : ''}`)

if (!APPLY) { console.log('\nDRY RUN: nothing written. Add --apply --confirm-db <name> to write.'); await client.end(); process.exit(0) }

if (confirmDb !== dbName) {
  console.error(`\nREFUSING: connected to "${dbName}" but --confirm-db is "${confirmDb ?? '(missing)'}". Nothing written.`)
  await client.end(); process.exit(1)
}

try {
  await client.query('BEGIN')

  await client.query('DELETE FROM reviews')
  await client.query('DELETE FROM inventory_logs')
  const deleted = (await client.query('DELETE FROM products')).rowCount
  await client.query(`UPDATE coupons SET product_ids = '{}' WHERE cardinality(product_ids) > 0`)

  let supplier = await one('SELECT id FROM suppliers WHERE name = $1', [SUPPLIER])
  if (!supplier) supplier = await one(`INSERT INTO suppliers (id, name, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING id`, [createId(), SUPPLIER])

  for (const [darazId, c] of plan) {
    if (c.how === 'create') {
      await client.query('INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)', [c.categoryId, c.name, c.slug])
    }
    if (c.how !== 'mapped') {
      await client.query(
        `INSERT INTO category_mappings (id, source, external_name, external_id, category_id) VALUES ($1, 'daraz', $2, $3, $4) ON CONFLICT (source, external_name) DO NOTHING`,
        [createId(), c.mappingName, darazId, c.categoryId])
    }
  }

  let done = 0
  for (const m of mapped) {
    const productId = createId()
    await client.query(
      `INSERT INTO products (id, name, slug, description, price, sale_price, sale_price_starts_at, sale_price_expires_at,
         stock, images, category_id, supplier_id, tags, is_active, track_inventory, brand, sku, weight, length, width, height, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{}',true,false,$13,$14,$15,$16,$17,$18,now(),now())`,
      [productId, m.name, m.slug, m.description, m.price, m.salePrice, m.salePriceStartsAt, m.salePriceExpiresAt,
        m.stock, m.images, plan.get(m.darazCategoryId).categoryId, supplier.id, m.brand, m.sku, m.weight, m.length, m.width, m.height])
    for (const [position, o] of m.options.entries()) {
      await client.query('INSERT INTO product_options (id, product_id, name, position, "values") VALUES ($1,$2,$3,$4,$5)', [createId(), productId, o.name, position, o.values])
    }
    for (const v of m.variants) {
      await client.query(
        `INSERT INTO product_variants (id, product_id, title, sku, price, stock, image, options, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,now())`,
        [createId(), productId, v.title, v.sku, v.price, v.stock, v.image, JSON.stringify(v.options)])
    }
    done++
    if (failAfter != null && done >= failAfter) throw new Error(`--fail-after ${failAfter}: forced failure for rollback test`)
  }

  await client.query('COMMIT')
  console.log(`\nremoved ${deleted} old products`)
  console.log(`imported ${done} products`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error(`\nFAILED, rolled back, database unchanged: ${err.message}`)
  await client.end(); process.exit(1)
}

await client.end()

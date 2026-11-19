/**
 * Move every Daraz-imported product into its Daraz top-level category and delete categories left empty.
 *
 * Dry run:  node scripts/daraz/regroup-categories.mjs <snapshot.json> <category-paths.json>
 * Apply:    ... --apply --confirm-db <dbname>
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'

config({ path: '.env.local', quiet: true })

const args = process.argv.slice(2)
const files = args.filter(a => a.endsWith('.json'))
const APPLY = args.includes('--apply')
const confirmDb = args.includes('--confirm-db') ? args[args.indexOf('--confirm-db') + 1] : null
if (files.length !== 2) { console.error('usage: regroup-categories.mjs <snapshot.json> <category-paths.json> [--apply --confirm-db <name>]'); process.exit(2) }

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const snapshot = JSON.parse(readFileSync(files[0], 'utf8'))
const paths = JSON.parse(readFileSync(files[1], 'utf8'))

const topOfSku = new Map()
const topOfDarazId = new Map()
for (const p of snapshot.products) {
  const top = paths[String(p.primary_category)]?.[0]
  if (!top) continue
  topOfSku.set(`DZ-${p.item_id}`, top)
  topOfDarazId.set(String(p.primary_category), top)
}

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
const client = new pg.Client({ connectionString: url })
await client.connect()
const dbName = (await client.query('SELECT current_database() AS db')).rows[0].db

const products = (await client.query(`SELECT id, sku FROM products`)).rows
const cats = (await client.query(`SELECT id, name, slug FROM categories`)).rows
const bySlug = new Map(cats.map(c => [c.slug, c]))

const unknown = products.filter(p => !topOfSku.has(p.sku))
const tops = [...new Set(products.map(p => topOfSku.get(p.sku)).filter(Boolean))]
const target = new Map(tops.map(name => [name, bySlug.get(slugify(name)) ?? { id: createId(), name, slug: slugify(name), isNew: true }]))
const counts = {}
for (const p of products) { const t = topOfSku.get(p.sku); if (t) counts[t] = (counts[t] ?? 0) + 1 }
const keepIds = new Set([...target.values()].map(c => c.id))

console.log(`database: ${dbName}`)
console.log(`products: ${products.length} (${unknown.length} without a Daraz top-level category, left where they are)`)
console.log(`categories now: ${cats.length} → top-level groups: ${target.size} (${[...target.values()].filter(c => c.isNew).length} new, ${[...target.values()].filter(c => !c.isNew).length} reused)`)
for (const [name, c] of [...target].sort((a, b) => counts[b[0]] - counts[a[0]])) console.log(`  ${String(counts[name]).padStart(3)}  ${name}${c.isNew ? '' : '  (existing)'}`)

if (!APPLY) { console.log('\nDRY RUN: nothing written.'); await client.end(); process.exit(0) }
if (confirmDb !== dbName) { console.error(`\nREFUSING: connected to "${dbName}" but --confirm-db is "${confirmDb ?? '(missing)'}".`); await client.end(); process.exit(1) }

try {
  await client.query('BEGIN')
  for (const c of target.values()) if (c.isNew) await client.query('INSERT INTO categories (id, name, slug) VALUES ($1,$2,$3)', [c.id, c.name, c.slug])
  for (const p of products) {
    const t = topOfSku.get(p.sku)
    if (t) await client.query('UPDATE products SET category_id = $1 WHERE id = $2', [target.get(t).id, p.id])
  }
  // Future syncs resolve a Daraz category id through these rows, so point them at the top-level category.
  for (const [darazId, top] of topOfDarazId) {
    if (target.has(top)) await client.query(`UPDATE category_mappings SET category_id = $1 WHERE source = 'daraz' AND external_id = $2`, [target.get(top).id, darazId])
  }
  const removed = (await client.query(
    `DELETE FROM categories c WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id) AND NOT (c.id = ANY($1))`, [[...keepIds]])).rowCount
  const left = (await client.query('SELECT count(*) AS n FROM categories')).rows[0].n
  await client.query('COMMIT')
  console.log(`\nregrouped ${products.length - unknown.length} products, deleted ${removed} empty categories, ${left} categories remain`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error(`\nFAILED, rolled back, database unchanged: ${err.message}`)
  await client.end(); process.exit(1)
}
await client.end()

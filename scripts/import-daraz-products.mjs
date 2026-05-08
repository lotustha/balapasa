/**
 * Bulk import from Daraz seller export files.
 * Reads: category_daraz.xlsx + product_list_to_import.xlsx (from project root)
 * Creates: categories → category_mappings → products in the DB
 *
 * Run: node scripts/import-daraz-products.mjs
 * Options:
 *   --dry-run         Show counts without writing to DB
 */

import { config }            from 'dotenv'
import XLSX                  from 'xlsx'
import pg                    from 'pg'
import { createId }          from '@paralleldrive/cuid2'

config({ path: '.env.local' })

const DRY_RUN = process.argv.includes('--dry-run')

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

// ── Slugify ───────────────────────────────────────────────────────────────────

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

// ── Read Excel files ──────────────────────────────────────────────────────────

const catWb   = XLSX.readFile('category_daraz.xlsx')
const catRows = XLSX.utils.sheet_to_json(catWb.Sheets[catWb.SheetNames[0]])

const prodWb   = XLSX.readFile('product_list_to_import.xlsx')
const prodRows = XLSX.utils.sheet_to_json(prodWb.Sheets[prodWb.SheetNames[0]])

console.log(`📋 Categories in Daraz file: ${catRows.length}`)
console.log(`📦 Products to import:        ${prodRows.length}`)
if (DRY_RUN) console.log('🔍 DRY RUN — no writes\n')

// ── Build Daraz category map: catId → { l1, l2 } ─────────────────────────────

const darazCatMap = {}
for (const r of catRows) {
  darazCatMap[String(r['Category Id'])] = {
    l1: String(r['Category Level 1'] ?? '').trim(),
    l2: String(r['Category Level 2'] ?? '').trim(),
  }
}

// ── Map Daraz Level 1 → our consolidated store categories ────────────────────
// Edit this map to customise your category structure

const L1_TO_STORE = {
  'Mobiles & Tablets':                       'Mobiles & Accessories',
  'Computers & Laptops':                     'Computers & Laptops',
  'TV, Audio / Video, Gaming & Wearables':   'Audio & Wearables',
  'Cameras':                                 'Cameras',
  'Health & Beauty':                         'Beauty & Personal Care',
  'Home Appliances':                         'Home & Kitchen',
  'Kitchen & Dining':                        'Home & Kitchen',
  'Bedding & Bath':                          'Home & Kitchen',
  'Laundry & Cleaning':                      'Home & Kitchen',
  'Furniture & Decor':                       'Home & Kitchen',
  'Sports & Outdoors':                       'Sports & Fitness',
  'Toys & Games':                            'Toys & Baby',
  'Mother & Baby':                           'Toys & Baby',
  'Tools, DIY & Outdoor':                    'Tools & DIY',
  'Stationery & Craft':                      'Tools & DIY',
  'Fashion':                                 'Fashion & Lifestyle',
  'Bags and Travel':                         'Fashion & Lifestyle',
  'Motors':                                  'Fashion & Lifestyle',
  'Pet Supplies':                            'Fashion & Lifestyle',
  'Groceries':                               'Fashion & Lifestyle',
}

const STORE_CAT_COLORS = {
  'Mobiles & Accessories':  '#6366F1',
  'Computers & Laptops':    '#3B82F6',
  'Audio & Wearables':      '#8B5CF6',
  'Cameras':                '#06B6D4',
  'Beauty & Personal Care': '#EC4899',
  'Home & Kitchen':         '#F59E0B',
  'Sports & Fitness':       '#16A34A',
  'Toys & Baby':            '#F97316',
  'Tools & DIY':            '#64748B',
  'Fashion & Lifestyle':    '#EF4444',
}

// Find the store category for a Daraz catId
function getStoreCat(catId) {
  const d = darazCatMap[catId]
  if (!d) return null
  return L1_TO_STORE[d.l1] ?? d.l2   // fallback to l2 if l1 not mapped
}

// Find unique store categories used
const usedL2 = new Map()  // storeCatName → Set of daraz catIds
for (const r of prodRows) {
  const catId    = String(r.catId ?? '')
  const storeCat = getStoreCat(catId)
  if (!storeCat) { console.warn(`  ⚠️  Unknown catId: ${catId}`); continue }
  if (!usedL2.has(storeCat)) usedL2.set(storeCat, new Set())
  usedL2.get(storeCat).add(catId)
}

console.log(`\n🗂️  Store categories to create: ${usedL2.size} (consolidated from Daraz's 256)`)
for (const [name, ids] of usedL2) {
  console.log(`  • ${name}: ${ids.size} Daraz catIds → ${[...ids].reduce((s,id) => {
    const d = darazCatMap[id]; return s + (d ? prodRows.filter(r=>String(r.catId)===id).length : 0)
  }, 0)} products`)
}

// ── Step 1: Create/fetch our categories ──────────────────────────────────────

const ourCatIds = {}   // l2Name → our DB category id

if (!DRY_RUN) {
  for (const [l2Name] of usedL2) {
    const slug = slugify(l2Name)
    // Upsert by slug
    const existing = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug])
    if (existing.rows.length) {
      ourCatIds[l2Name] = existing.rows[0].id
    } else {
      const id = createId()
      const color = STORE_CAT_COLORS[l2Name] ?? '#16A34A'
      await pool.query(
        'INSERT INTO categories (id, name, slug, color) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
        [id, l2Name, slug, color]
      )
      const r = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug])
      ourCatIds[l2Name] = r.rows[0].id
    }
    console.log(`  ✓ Category: ${l2Name} → ${ourCatIds[l2Name]}`)
  }
}

// ── Step 2: Save category mappings ───────────────────────────────────────────

let mappingCount = 0
if (!DRY_RUN) {
  for (const [l2Name, catIdSet] of usedL2) {
    const ourId = ourCatIds[l2Name]
    for (const darazCatId of catIdSet) {
      await pool.query(`
        INSERT INTO category_mappings (id, source, external_name, external_id, category_id)
        VALUES ($1, 'daraz', $2, $3, $4)
        ON CONFLICT (source, external_name) DO UPDATE SET external_id = $3, category_id = $4
      `, [createId(), l2Name, darazCatId, ourId])
      mappingCount++
    }
  }
  console.log(`\n🔗 Saved ${mappingCount} category mappings`)
}

// ── Step 3: Import products ───────────────────────────────────────────────────

const COLORS = ['#16A34A','#06B6D4','#8B5CF6','#EC4899','#F59E0B','#EF4444','#3B82F6']

let created = 0, skipped = 0, failed = 0

console.log(`\n📦 Importing ${prodRows.length} products...\n`)

for (let i = 0; i < prodRows.length; i++) {
  const row     = prodRows[i]
  const catId   = String(row.catId ?? '')
  const darazCat = darazCatMap[catId]
  const name    = String(row['Product Name(English)'] ?? row['*Product Name(Nepali) look function'] ?? '').trim()

  if (!name || !darazCat) { skipped++; continue }

  const l2Name  = darazCat.l2
  const storeCatName = getStoreCat(catId)
  const ourCatId     = (storeCatName ? ourCatIds[storeCatName] : null) ?? Object.values(ourCatIds)[0]
  if (!ourCatId) { skipped++; continue }

  // Collect images (im1 ... im8)
  const rawImages = ['im1','im2','im3','im4','im5','im6','im7','im8']
    .map(k => String(row[k] ?? '').trim())
    .filter(Boolean)

  const price       = Number(String(row['*Price'] ?? '0').replace(/[^0-9.]/g, '')) || 0
  const salePrice   = Number(String(row['SpecialPrice'] ?? '0').replace(/[^0-9.]/g, '')) || null
  const stock       = Number(row['*Quantity'] ?? 0) || 0
  const slug        = slugify(name) + '-' + createId().slice(0, 6)
  const sku         = row['tr(s-wb-product@md5key)'] ? String(row['tr(s-wb-product@md5key)']).slice(0, 20) : null

  if (DRY_RUN) {
    created++
    if (i < 3) console.log(`  [${i+1}] ${name} | ${l2Name} | Rs.${price} → Rs.${salePrice ?? '-'} | ${rawImages.length} imgs`)
    continue
  }

  try {
    const images = rawImages
    process.stdout.write(`  [${i+1}/${prodRows.length}] ${name.slice(0,50)}\n`)

    await pool.query(`
      INSERT INTO products (
        id, name, slug, description, price, sale_price, stock, low_stock_threshold,
        images, category_id, tags, is_active, is_featured, is_new, is_taxable,
        track_inventory, rating, review_count, created_at, updated_at
        ${sku ? ', sku' : ''}
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()
        ${sku ? ',$19' : ''}
      )
      ON CONFLICT (slug) DO NOTHING
    `, [
      createId(), name, slug,
      `${name} — ${darazCat.l1} · ${darazCat.l2}`,
      price, salePrice, stock, 10,
      images,
      ourCatId, [],
      true, false, true, true, true,
      0, 0,
      ...(sku ? [sku] : [])
    ])
    created++
  } catch (e) {
    console.error(`  ✗ Failed: ${name} — ${e.message}`)
    failed++
  }
}

await pool.end()

console.log(`\n${'─'.repeat(50)}`)
console.log(`✅  Created:  ${created}`)
console.log(`⚠️   Skipped:  ${skipped}`)
console.log(`❌  Failed:   ${failed}`)
console.log(`📊  Total:    ${prodRows.length}`)
if (DRY_RUN) console.log('\n(Dry run — nothing was written)')
else console.log('\n🎉  Import complete! Visit /admin/products to see your products.')

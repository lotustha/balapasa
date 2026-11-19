// SQL writes shared by the bulk import and the daily sync. `db` is a connected pg client inside a transaction.
import { createId } from '@paralleldrive/cuid2'

export const SUPPLIER_NAME = 'Daraz TrendWave'
export const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export async function ensureSupplier(db) {
  const found = (await db.query('SELECT id FROM suppliers WHERE name = $1', [SUPPLIER_NAME])).rows[0]
  if (found) return found.id
  return (await db.query(
    `INSERT INTO suppliers (id, name, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING id`,
    [createId(), SUPPLIER_NAME])).rows[0].id
}

export async function insertOptions(db, productId, options) {
  for (const [position, o] of options.entries()) {
    await db.query('INSERT INTO product_options (id, product_id, name, position, "values") VALUES ($1,$2,$3,$4,$5)',
      [createId(), productId, o.name, position, o.values])
  }
}

// Daraz SKU ids are unique across the shop, so a variant that turns up under another product has moved there.
export async function insertVariant(db, productId, v) {
  await db.query(
    `INSERT INTO product_variants (id, product_id, title, sku, price, stock, image, options, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,now())
     ON CONFLICT (sku) DO UPDATE SET product_id = EXCLUDED.product_id, title = EXCLUDED.title, price = EXCLUDED.price,
       image = EXCLUDED.image, options = EXCLUDED.options, is_active = true`,
    [createId(), productId, v.title, v.sku, v.price, v.stock, v.image, JSON.stringify(v.options)])
}

export async function insertProduct(db, m, categoryId, supplierId) {
  const productId = createId()
  await db.query(
    `INSERT INTO products (id, name, slug, description, price, sale_price, sale_price_starts_at, sale_price_expires_at,
       stock, images, category_id, supplier_id, tags, is_active, track_inventory, brand, sku, weight, length, width, height, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{}',true,false,$13,$14,$15,$16,$17,$18,COALESCE($19, now()),now())`,
    [productId, m.name, m.slug, m.description, m.price, m.salePrice, m.salePriceStartsAt, m.salePriceExpiresAt,
      m.stock, m.images, categoryId, supplierId, m.brand, m.sku, m.weight, m.length, m.width, m.height, m.createdAt ?? null])
  await insertOptions(db, productId, m.options)
  for (const v of m.variants) await insertVariant(db, productId, v)
  return productId
}

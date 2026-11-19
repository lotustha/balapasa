import test from 'node:test'
import assert from 'node:assert/strict'
import { mapProduct } from './map.mjs'

const NOW = new Date('2026-11-19T06:00:00Z')

function sku({ SkuId = 1, Status = 'active', price = 500, special_price = 0, special_from_time = '2025-01-08 12:00:01', special_to_time = null, color, quantity = 10, Images = [], ...rest } = {}) {
  return {
    SkuId, Status, price, special_price, special_from_time, special_to_time, quantity, Images,
    saleProp: color ? { color_family: color } : {},
    package_weight: '0.1', package_length: '20.000', package_width: '20.000', package_height: '20.000',
    ...rest,
  }
}

function product({ item_id = 1, status = 'Active', name = 'Shoe Bag', name_en, description = '<p>Desc</p>', short_description = '<ul><li>Point</li></ul>', brand = 'Acme', skus = [sku()], images = ['https://static-01.daraz.com.np/p/a.jpg'] } = {}) {
  return {
    item_id, status, primary_category: 10000418, images, skus,
    attributes: { name, name_en: name_en ?? name, description, short_description, brand },
  }
}

test('inactive product → null', () => assert.equal(mapProduct(product({ status: 'InActive' }), NOW), null))
test('no active SKU → null', () => assert.equal(mapProduct(product({ skus: [sku({ Status: 'inactive' })] }), NOW), null))

test('identity and slug unique per item', () => {
  const a = mapProduct(product({ item_id: 1, name: 'Shoe Bag' }), NOW)
  const b = mapProduct(product({ item_id: 2, name: 'Shoe Bag' }), NOW)
  assert.equal(a.sku, 'DZ-1'); assert.equal(a.slug, 'shoe-bag-1'); assert.notEqual(a.slug, b.slug)
  assert.equal(a.darazCategoryId, '10000418')
})

test('long and messy names make a clean bounded slug', () => {
  const m = mapProduct(product({ item_id: 7, name: '1Pc Portable Travel Shoe Bag , Waterproof (60 * 200 cm) | ' + 'x'.repeat(200) }), NOW)
  assert.match(m.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/)
  assert.ok(m.slug.length <= 80 + 2)
  assert.ok(m.slug.endsWith('-7'))
})

test('live sale with a near end date keeps the date (Nepal time)', () => {
  const m = mapProduct(product({ skus: [sku({ price: 200, special_price: 79, special_to_time: '2026-12-26 00:00:00' })] }), NOW)
  assert.equal(m.price, 200); assert.equal(m.salePrice, 79)
  assert.ok(m.salePriceExpiresAt instanceof Date)
  assert.equal(m.salePriceExpiresAt.toISOString(), '2026-12-25T18:15:00.000Z')
})

test('sale ending more than a year out is open-ended (no countdown)', () => {
  const m = mapProduct(product({ skus: [sku({ price: 200, special_price: 79, special_to_time: '2099-03-26 00:00:00' })] }), NOW)
  assert.equal(m.salePrice, 79); assert.equal(m.salePriceExpiresAt, null); assert.equal(m.salePriceStartsAt, null)
})

test('no fake sale: special equals price', () => {
  const m = mapProduct(product({ skus: [sku({ price: 474, special_price: 474, special_to_time: '2099-03-26 00:00:00' })] }), NOW)
  assert.equal(m.salePrice, null); assert.equal(m.salePriceStartsAt, null); assert.equal(m.salePriceExpiresAt, null)
})
test('no fake sale: expired', () => assert.equal(mapProduct(product({ skus: [sku({ price: 200, special_price: 79, special_to_time: '2026-10-23 00:00:00' })] }), NOW).salePrice, null))
test('no fake sale: not started', () => assert.equal(mapProduct(product({ skus: [sku({ price: 200, special_price: 79, special_from_time: '2027-01-01 00:00:00', special_to_time: '2099-01-01 00:00:00' })] }), NOW).salePrice, null))

test('single SKU → no variants', () => {
  const m = mapProduct(product({ skus: [sku({ color: 'Multicolor' })] }), NOW)
  assert.deepEqual(m.variants, []); assert.deepEqual(m.options, [])
})

test('inactive SKUs are dropped', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'Gold' }), sku({ SkuId: 2, color: 'White', Status: 'inactive' }), sku({ SkuId: 3, color: 'Grey' })] }), NOW)
  assert.deepEqual(m.variants.map(v => v.sku), ['DZ-1', 'DZ-3'])
  assert.deepEqual(m.options, [{ name: 'Color', values: ['Gold', 'Grey'] }])
  assert.deepEqual(m.variants[0].options, { Color: 'Gold' })
  assert.equal(m.variants[0].title, 'Gold')
})

test('variant prices differ', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'S', price: 500 }), sku({ SkuId: 2, color: 'L', price: 800, special_price: 700, special_to_time: '2099-01-01 00:00:00' })] }), NOW)
  assert.equal(m.price, 500); assert.equal(m.salePrice, null)
  assert.deepEqual(m.variants.map(v => v.price), [500, 700])
})

test('cheapest variant comes first so the page opens on the listed price', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: '10 PC SET', price: 900 }), sku({ SkuId: 2, color: '1 PC', price: 90 }), sku({ SkuId: 3, color: '5 PC', price: 450 })] }), NOW)
  assert.equal(m.price, 90)
  assert.deepEqual(m.variants.map(v => v.title), ['1 PC', '10 PC SET', '5 PC'])
  assert.deepEqual(m.options[0].values, ['1 PC', '10 PC SET', '5 PC'])
})

test('colour property holding non-colours is labelled Variant', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'Toilets' }), sku({ SkuId: 2, color: 'No Parking' })] }), NOW)
  assert.deepEqual(m.options, [{ name: 'Variant', values: ['Toilets', 'No Parking'] }])
  assert.deepEqual(m.variants[1].options, { Variant: 'No Parking' })
})

test('multi-word colours still count as colours', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'Matte Black' }), sku({ SkuId: 2, color: 'Light blue' }), sku({ SkuId: 3, color: 'Antique White' })] }), NOW)
  assert.equal(m.options[0].name, 'Color')
})

test('other properties keep their own name', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, saleProp: { size_wear: 'M' } }), sku({ SkuId: 2, saleProp: { size_wear: 'L' } })] }), NOW)
  assert.deepEqual(m.options, [{ name: 'Size Wear', values: ['M', 'L'] }])
})

test('same variant prices → variant price null', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'A' }), sku({ SkuId: 2, color: 'B' })] }), NOW)
  assert.deepEqual(m.variants.map(v => v.price), [null, null])
})

test('missing english name and empty description fall back', () => {
  const m = mapProduct(product({ name: 'Nepali Name', name_en: '', description: '', short_description: '' }), NOW)
  assert.equal(m.name, 'Nepali Name'); assert.equal(m.description, 'Nepali Name')
})

test('description is short description followed by description', () => {
  assert.equal(mapProduct(product({}), NOW).description, '<ul><li>Point</li></ul><p>Desc</p>')
})

test('stock copies Daraz quantity of active SKUs', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'A', quantity: 100 }), sku({ SkuId: 2, color: 'B', quantity: 40 }), sku({ SkuId: 3, color: 'C', quantity: 9, Status: 'inactive' })] }), NOW)
  assert.equal(m.stock, 140); assert.deepEqual(m.variants.map(v => v.stock), [100, 40])
})

test('No Brand → null', () => assert.equal(mapProduct(product({ brand: 'No Brand' }), NOW).brand, null))

test('images deduplicated, dimensions numeric', () => {
  const m = mapProduct(product({ images: ['u1', 'u2', 'u1'] }), NOW)
  assert.deepEqual(m.images, ['u1', 'u2'])
  assert.equal(m.weight, 0.1); assert.equal(m.length, 20)
})

test('variant image falls back to null; uses SKU image when present', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'A', Images: ['v1'] }), sku({ SkuId: 2, color: 'B' })] }), NOW)
  assert.deepEqual(m.variants.map(v => v.image), ['v1', null])
})

test('SKUs without a positive numeric price are ignored', () => {
  const m = mapProduct(product({ skus: [sku({ SkuId: 1, color: 'A', price: 'abc' }), sku({ SkuId: 2, color: 'B', price: 0 }), sku({ SkuId: 3, color: 'C', price: 250 })] }), NOW)
  assert.equal(m.price, 250); assert.deepEqual(m.variants, [])
  assert.equal(mapProduct(product({ skus: [sku({ price: null })] }), NOW), null)
})

test('createdAt comes from the Daraz listing date', () => {
  const m = mapProduct({ ...product({}), created_time: '1783942466341' }, NOW)
  assert.equal(m.createdAt.toISOString(), new Date(1783942466341).toISOString())
  assert.equal(mapProduct(product({}), NOW).createdAt, null)
})

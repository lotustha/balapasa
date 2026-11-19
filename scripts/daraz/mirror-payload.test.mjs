import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCreatePayload, missingMandatory, sellerSkuFor } from './mirror-payload.mjs'

const CAT = [
  { name: 'name', type: 'normal', mandatory: true }, { name: 'short_description', type: 'normal', mandatory: true },
  { name: 'brand', type: 'normal', mandatory: true }, { name: 'description', type: 'normal', mandatory: false },
  { name: 'color_family', type: 'sku', mandatory: true, saleProp: true }, { name: 'SellerSku', type: 'sku', mandatory: true },
  { name: 'price', type: 'sku', mandatory: true }, { name: 'package_weight', type: 'sku', mandatory: true },
]
const sku = (o = {}) => ({ SkuId: 111, Status: 'active', SellerSku: 'orig-1', price: 500, special_price: 299, special_from_time: '2025-01-08 12:00:01', special_to_time: '2099-03-26 00:00:00', quantity: 98, package_weight: '0.1', package_length: '20', package_width: '20', package_height: '20', package_content: '1x thing', saleProp: { color_family: 'Gold' }, Images: [], ShopSku: 'x', Url: 'u', multiWarehouseInventories: [{}], ...o })
const detail = (o = {}) => ({ item_id: 9, primary_category: 10000722, images: ['i1', 'i2'], status: 'Active',
  attributes: { name: 'Thing', name_en: 'Thing', short_description: '<ul></ul>', description: '<p>d</p>', description_en: '<p>d</p>', brand: 'No Brand', source: 'asc', Hazmat: 'None' },
  skus: [sku()], ...o })

test('copies category, images and only attributes the target category knows', () => {
  const p = buildCreatePayload(detail(), CAT).Request.Product
  assert.equal(p.PrimaryCategory, '10000722')
  assert.deepEqual(p.Images, { Image: ['i1', 'i2'] })
  assert.deepEqual(p.Attributes, { name: 'Thing', short_description: '<ul></ul>', description: '<p>d</p>', brand: 'No Brand' })
})

test('SKU: new SellerSku, prices, sale window, package fields and sale property; no source-only fields', () => {
  const [s] = buildCreatePayload(detail(), CAT).Request.Product.Skus.Sku
  assert.equal(s.SellerSku, 'TW-111'); assert.equal(sellerSkuFor(111), 'TW-111')
  assert.equal(s.price, 500); assert.equal(s.special_price, 299); assert.equal(s.quantity, 98)
  assert.equal(s.special_from_date, '2025-01-08 12:00:01'); assert.equal(s.special_to_date, '2099-03-26 00:00:00')
  assert.equal(s.color_family, 'Gold'); assert.equal(s.package_weight, '0.1'); assert.equal(s.package_content, '1x thing')
  for (const k of ['SkuId', 'ShopSku', 'Url', 'Status', 'saleProp', 'multiWarehouseInventories', 'Images']) assert.equal(k in s, false, k)
})

test('a special price that is not a discount is dropped', () => {
  const [s] = buildCreatePayload(detail({ skus: [sku({ special_price: 500 })] }), CAT).Request.Product.Skus.Sku
  assert.equal('special_price' in s, false); assert.equal('special_to_date' in s, false)
})

test('only active SKUs are copied; none left → null; SKU images kept', () => {
  const p = buildCreatePayload(detail({ skus: [sku({ SkuId: 1, Images: ['v1'] }), sku({ SkuId: 2, Status: 'inactive' })] }), CAT).Request.Product
  assert.deepEqual(p.Skus.Sku.map(s => s.SellerSku), ['TW-1']); assert.deepEqual(p.Skus.Sku[0].Images, { Image: ['v1'] })
  assert.equal(buildCreatePayload(detail({ skus: [sku({ Status: 'inactive' })] }), CAT), null)
})

test('missingMandatory names what the source could not supply', () => {
  const d = detail({ skus: [sku({ saleProp: {}, package_weight: '' })] }); delete d.attributes.brand
  assert.deepEqual(missingMandatory(buildCreatePayload(d, CAT), CAT).sort(), ['brand', 'color_family', 'package_weight'])
  assert.deepEqual(missingMandatory(buildCreatePayload(detail(), CAT), CAT), [])
})

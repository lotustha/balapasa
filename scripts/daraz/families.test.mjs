import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeFamilies } from './families.mjs'
import { mapProduct } from './map.mjs'

const NOW = new Date('2026-11-19T06:00:00Z')

function item(item_id, name, { color, status = 'Active', skuStatus = 'active', images, price = 500, special = 299, skus } = {}) {
  return {
    item_id, status, primary_category: 10000696,
    images: images ?? [`img-${item_id}-a`, `img-${item_id}-b`],
    attributes: { name, name_en: name, description: `<p>${name}</p>`, short_description: '', brand: 'No Brand' },
    skus: skus ?? [{ SkuId: item_id * 10, Status: skuStatus, price, special_price: special, special_from_time: '2025-01-08 12:00:01', special_to_time: '2099-03-26 00:00:00', quantity: 10, Images: [], saleProp: color ? { color_family: color } : {} }],
  }
}

const BASE = 'Self Adhesive Stainless Steel Metal Sticker'

test('listings named "Base : Variant" merge into one product with a variant each', () => {
  const out = mergeFamilies([
    item(3, `${BASE} : Toilets Metal Sticker`, { color: 'Toilets' }),
    item(1, `${BASE} : Open Closed Metal Sticker`, { color: 'Open Closed' }),
    item(2, `${BASE} : CCTV Metal Sticker`, { color: 'CCTV' }),
    item(9, 'Milk Frother', { color: 'Multicolor' }),
  ])
  assert.equal(out.length, 2)
  const fam = out.find(p => p.attributes.name === BASE)
  assert.equal(fam.item_id, 1)
  assert.deepEqual(fam.skus.map(s => s.SkuId), [10, 20, 30])
  assert.deepEqual(fam.skus.map(s => s.saleProp.color_family), ['Open Closed', 'CCTV', 'Toilets'])
  assert.deepEqual(fam.skus.map(s => s.Images[0]), ['img-1-a', 'img-2-a', 'img-3-a'])
  assert.deepEqual(fam.images.slice(0, 3), ['img-1-a', 'img-2-a', 'img-3-a'])
  assert.ok(fam.images.includes('img-3-b'))

  const m = mapProduct(fam, NOW)
  assert.equal(m.sku, 'DZ-1'); assert.equal(m.name, BASE)
  assert.deepEqual(m.variants.map(v => v.title), ['Open Closed', 'CCTV', 'Toilets'])
  assert.deepEqual(m.variants.map(v => v.sku), ['DZ-10', 'DZ-20', 'DZ-30'])
  assert.deepEqual(m.variants.map(v => v.image), ['img-1-a', 'img-2-a', 'img-3-a'])
  assert.equal(m.price, 500); assert.equal(m.salePrice, 299)
})

test('variant label falls back to the name suffix when sale properties repeat', () => {
  const out = mergeFamilies([
    item(1, 'Pocket Comb : Neem Wood', { color: 'Brown' }),
    item(2, 'Pocket Comb : Peach Wood', { color: 'Brown' }),
  ])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].skus.map(s => s.saleProp), [{ color_family: 'Neem Wood' }, { color_family: 'Peach Wood' }])
})

test('a lone "Base : Variant" listing is left alone', () => {
  const only = item(1, 'Wood Comb : Engraved', { color: 'Brown' })
  assert.deepEqual(mergeFamilies([only]), [only])
})

test('inactive listings and listings with several SKUs stay out of a family', () => {
  const inactive = item(2, `${BASE} : CCTV Metal Sticker`, { color: 'CCTV', status: 'InActive' })
  const multi = item(3, `${BASE} : Toilets Metal Sticker`, { skus: [
    { SkuId: 30, Status: 'active', price: 500, special_price: 0, quantity: 1, Images: [], saleProp: { color_family: 'A' } },
    { SkuId: 31, Status: 'active', price: 500, special_price: 0, quantity: 1, Images: [], saleProp: { color_family: 'B' } },
  ] })
  const out = mergeFamilies([
    item(1, `${BASE} : Open Closed Metal Sticker`, { color: 'Open Closed' }),
    item(4, `${BASE} : Welcome Metal Sticker`, { color: 'Welcome' }),
    inactive, multi,
  ])
  assert.equal(out.length, 3)
  assert.ok(out.includes(inactive)); assert.ok(out.includes(multi))
  assert.deepEqual(out.find(p => p.attributes.name === BASE).skus.map(s => s.SkuId), [10, 40])
})

test('input objects are not mutated', () => {
  const a = item(1, `${BASE} : A`, { color: 'A' }), b = item(2, `${BASE} : B`, { color: 'B' })
  const before = JSON.stringify([a, b])
  mergeFamilies([a, b])
  assert.equal(JSON.stringify([a, b]), before)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { priceEntries, nepalTime, darazItemId, pushPriceToDaraz } from './push-price.mjs'

const now = new Date('2026-11-21T02:00:00Z')
const sku = (id, price, quantity = 5, extra = {}) => ({ SkuId: id, Status: 'active', price, quantity, ...extra })

test('nepalTime is UTC plus 5h45m', () => {
  assert.equal(nepalTime(new Date('2026-11-21T02:00:00Z')), '2026-11-21 07:45:00')
})

test('darazItemId reads only imported product SKUs', () => {
  assert.equal(darazItemId('DZ-1543786278'), '1543786278')
  assert.equal(darazItemId('MY-SKU'), null)
  assert.equal(darazItemId(null), null)
})

test('a sale price is sent with open-ended dates and the quantity is kept', () => {
  const [e] = priceEntries('1', [sku(11, 1400, 100)], { price: 1400, salePrice: 750 }, now)
  assert.deepEqual(e, { itemId: '1', skuId: 11, quantity: 100, price: 1400, salePrice: 750, saleFrom: '2026-11-21 07:45:00', saleTo: '2036-11-21 05:45:00' })
})

test('no sale, a sale not below the price, or an expired sale clears the Daraz sale', () => {
  for (const w of [{ price: 900 }, { price: 900, salePrice: 900 }, { price: 900, salePrice: 500, saleExpiresAt: '2026-11-20T00:00:00Z' }]) {
    const [e] = priceEntries('1', [sku(11, 1400)], w, now)
    assert.equal(e.price, 900); assert.equal(e.salePrice, 0); assert.equal(e.saleFrom, undefined)
  }
})

test('a real end date is sent as given', () => {
  const [e] = priceEntries('1', [sku(11, 1400)], { price: 1400, salePrice: 700, saleExpiresAt: '2026-12-01T00:00:00Z' }, now)
  assert.equal(e.saleTo, '2026-12-01 05:45:00')
})

test('a variant with its own website price keeps it; inactive SKUs are left alone', () => {
  const entries = priceEntries('1', [sku(11, 1000), sku(12, 1000), sku(13, 1000, 5, { Status: 'inactive' })],
    { price: 1000, salePrice: 800, variantPrices: { 12: 600 } }, now)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].salePrice, 800)
  assert.equal(entries[1].price, 1000); assert.equal(entries[1].salePrice, 600)
  const [up] = priceEntries('1', [sku(12, 1000)], { price: 1000, variantPrices: { 12: 1200 } }, now)
  assert.equal(up.price, 1200); assert.equal(up.salePrice, 0)
})

test('a price of zero is refused', () => {
  assert.throws(() => priceEntries('1', [sku(11, 1400)], { price: 0 }, now))
})

test('both shops are written, the copy by its own ids; one failure does not stop the other', async () => {
  const db = { query: async () => ({ rows: [{ value: JSON.stringify({ accessToken: 't', refreshToken: 'r', expiresAt: Date.now() + 9e9, refreshExpiresAt: 0 }) }] }) }
  const posts = []
  const get = async (path) => path === '/product/item/get'
    ? { data: { skus: [sku(11, 1400, 100)] } }
    : { data: { products: [{ item_id: 900, skus: [{ SkuId: 99, SellerSku: 'TW-11', Status: 'active', price: 1400, quantity: 100 }] }] } }
  const post = async (path, params, opts) => { posts.push(params.payload); if (posts.length === 1) throw new Error('boom') }
  const res = await pushPriceToDaraz(db, '1', { price: 1400, salePrice: 750 }, { get, post })
  assert.equal(res.ok, false)
  assert.equal(res.shops[0].ok, false)
  assert.equal(res.shops[1].ok, true)
  assert.match(posts[1], /<ItemId>900<\/ItemId><SkuId>99<\/SkuId><Price>1400<\/Price><SalePrice>750<\/SalePrice>/)
  assert.match(posts[1], /<Quantity>100<\/Quantity>/)
})

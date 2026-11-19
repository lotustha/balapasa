import test from 'node:test'
import assert from 'node:assert/strict'
import { planMirror, priceQuantityXml, saleTimeForWrite } from './mirror-plan.mjs'

const src = (id, skus, status = 'Active') => ({ item_id: id, status, attributes: { name: `P${id}` }, skus })
const ssku = (o = {}) => ({ SkuId: 10, Status: 'active', price: 500, special_price: 299, special_from_time: '2025-01-08 12:00:01', special_to_time: '2099-03-26 00:00:00', quantity: 98, ...o })
const mir = (id, skus) => ({ item_id: id, status: 'Active', attributes: { name: `M${id}` }, skus })
const msku = (o = {}) => ({ SkuId: 900, SellerSku: 'TW-10', Status: 'active', price: 500, special_price: 299, special_from_time: '2025-01-08 12:00:01', special_to_time: '2099-03-26 00:00:00', quantity: 98, ...o })
const empty = { create: [], updates: [], soldOut: [], partial: [] }

test('identical → nothing to do', () => assert.deepEqual(planMirror([src(1, [ssku()])], [mir(7, [msku()])]), empty))

test('not mirrored yet → create', () => {
  const p = src(1, [ssku()])
  assert.deepEqual(planMirror([p], []).create, [p])
})

test('price, sale and quantity differences become one update naming what changed', () => {
  const [u] = planMirror([src(1, [ssku({ price: 600, special_price: 350, quantity: 5 })])], [mir(7, [msku()])]).updates
  assert.equal(u.itemId, 7); assert.equal(u.skuId, 900); assert.equal(u.sellerSku, 'TW-10')
  assert.equal(u.price, 600); assert.equal(u.salePrice, 350); assert.equal(u.quantity, 5)
  assert.deepEqual(u.changed.sort(), ['price', 'quantity', 'salePrice'])
  assert.equal(u.old.price, 500)
})

test('sale ended at source → sale cleared on the mirror', () => {
  const [u] = planMirror([src(1, [ssku({ special_price: 0 })])], [mir(7, [msku()])]).updates
  assert.equal(u.salePrice, 0); assert.equal(u.saleFrom, null); assert.equal(u.saleTo, null)
})

test('a special price that is not below the price counts as no sale', () => {
  assert.deepEqual(planMirror([src(1, [ssku({ special_price: 500 })])], [mir(7, [msku({ special_price: 0, special_from_time: null, special_to_time: null })])]), empty)
})

test('sale window moved → update', () => {
  const [u] = planMirror([src(1, [ssku({ special_to_time: '2026-12-31 00:00:00' })])], [mir(7, [msku()])]).updates
  assert.deepEqual(u.changed, ['saleTo']); assert.equal(u.saleTo, '2026-12-31 00:00:00')
})

test('source product or SKU no longer sellable → mirror goes sold out, once', () => {
  assert.deepEqual(planMirror([src(1, [ssku()], 'InActive')], [mir(7, [msku()])]).soldOut, [{ itemId: 7, skuId: 900, sellerSku: 'TW-10', name: 'M7' }])
  assert.deepEqual(planMirror([src(1, [ssku({ Status: 'inactive' })])], [mir(7, [msku()])]).soldOut.length, 1)
  assert.deepEqual(planMirror([], [mir(7, [msku({ quantity: 0 })])]), empty)
})

test('listings that are not mirrors are never touched', () => {
  assert.deepEqual(planMirror([], [mir(7, [msku({ SellerSku: 'B.P-008' })])]), empty)
})

test('a new variant on an already mirrored product is reported, existing variants still sync', () => {
  const plan = planMirror([src(1, [ssku({ quantity: 50 }), ssku({ SkuId: 11 })])], [mir(7, [msku()])])
  assert.deepEqual(plan.partial, [{ itemId: 1, name: 'P1', missing: ['TW-11'] }])
  assert.equal(plan.updates.length, 1); assert.deepEqual(plan.create, [])
})

test('saleTimeForWrite adds 2h15m so Daraz reports the intended time', () => {
  assert.equal(saleTimeForWrite('2026-06-21 00:00:00'), '2026-06-21 02:15:00')
  assert.equal(saleTimeForWrite('2026-12-31 23:00:00'), '2027-01-01 01:15:00')
  assert.equal(saleTimeForWrite(null), null)
})

test('priceQuantityXml: sale times shifted, cleared sale sends 0, sold-out sends quantity only', () => {
  const xml = priceQuantityXml([
    { itemId: 7, skuId: 900, price: 600, salePrice: 350, saleFrom: '2026-06-21 00:00:00', saleTo: '2026-10-23 00:00:00', quantity: 5 },
    { itemId: 8, skuId: 901, price: 200, salePrice: 0, saleFrom: null, saleTo: null, quantity: 3 },
    { itemId: 9, skuId: 902, quantity: 0 },
  ])
  assert.equal(xml, '<Request><Product><Skus>'
    + '<Sku><ItemId>7</ItemId><SkuId>900</SkuId><Price>600</Price><SalePrice>350</SalePrice><SaleStartDate>2026-06-21 02:15:00</SaleStartDate><SaleEndDate>2026-10-23 02:15:00</SaleEndDate><Quantity>5</Quantity></Sku>'
    + '<Sku><ItemId>8</ItemId><SkuId>901</SkuId><Price>200</Price><SalePrice>0</SalePrice><Quantity>3</Quantity></Sku>'
    + '<Sku><ItemId>9</ItemId><SkuId>902</SkuId><Quantity>0</Quantity></Sku>'
    + '</Skus></Product></Request>')
})

test('a mirror reporting special_price equal to price has no sale', () => {
  assert.deepEqual(planMirror([src(1, [ssku({ special_price: 0 })])], [mir(7, [msku({ special_price: 500 })])]), empty)
})

test('products on the skip list are not offered for creation again', () => {
  assert.deepEqual(planMirror([src(1, [ssku()])], [], { skipCreate: new Set(['1']) }), empty)
})

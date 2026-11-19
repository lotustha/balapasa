import test from 'node:test'
import assert from 'node:assert/strict'
import { planSync } from './plan-sync.mjs'

const mapped = (o = {}) => ({ sku: 'DZ-1', name: 'Item', price: 500, salePrice: null, salePriceStartsAt: null, salePriceExpiresAt: null, variants: [], options: [], ...o })
const existing = (o = {}) => ({ id: 'p1', sku: 'DZ-1', name: 'Item', price: 500, salePrice: null, salePriceExpiresAt: null, isActive: true, variants: [], ...o })
const empty = { create: [], priceChanges: [], deactivate: [], reactivate: [], variantChanges: [] }

test('nothing changed → empty plan', () => {
  assert.deepEqual(planSync([mapped()], [existing()]), empty)
})

test('small price change is applied', () => {
  const plan = planSync([mapped({ price: 450 })], [existing()])
  assert.equal(plan.priceChanges.length, 1)
  const c = plan.priceChanges[0]
  assert.equal(c.id, 'p1'); assert.equal(c.held, false)
  assert.deepEqual(c.old, { price: 500, salePrice: null })
  assert.equal(c.new.price, 450); assert.equal(c.changePercent, -10)
})

test('a move over 20% of the price the customer pays is held', () => {
  const plan = planSync([mapped({ price: 500, salePrice: 299 })], [existing({ price: 500, salePrice: 450 })])
  assert.equal(plan.priceChanges[0].held, true)
  assert.equal(plan.priceChanges[0].changePercent, -33.6)
})

test('exactly 20% is applied; applyHeld releases larger moves', () => {
  assert.equal(planSync([mapped({ price: 400 })], [existing()]).priceChanges[0].held, false)
  assert.equal(planSync([mapped({ price: 100 })], [existing()], { applyHeld: true }).priceChanges[0].held, false)
})

test('regular price changing while the sale price stays is applied, not held', () => {
  const plan = planSync([mapped({ price: 1000, salePrice: 299 })], [existing({ price: 500, salePrice: 299 })])
  assert.equal(plan.priceChanges[0].held, false); assert.equal(plan.priceChanges[0].changePercent, 0)
})

test('sale ending is a price change', () => {
  const plan = planSync([mapped()], [existing({ salePrice: 450 })])
  assert.deepEqual(plan.priceChanges[0].old, { price: 500, salePrice: 450 })
  assert.equal(plan.priceChanges[0].new.salePrice, null)
})

test('gone from Daraz → deactivate; already inactive stays quiet', () => {
  assert.deepEqual(planSync([], [existing()]).deactivate, [{ id: 'p1', sku: 'DZ-1', name: 'Item' }])
  assert.deepEqual(planSync([], [existing({ isActive: false })]), empty)
})

test('back on Daraz → reactivate, with its price change', () => {
  const plan = planSync([mapped({ price: 480 })], [existing({ isActive: false })])
  assert.deepEqual(plan.reactivate, [{ id: 'p1', sku: 'DZ-1', name: 'Item' }])
  assert.equal(plan.priceChanges.length, 1)
})

test('new on Daraz → create', () => {
  const m = mapped({ sku: 'DZ-2' })
  assert.deepEqual(planSync([mapped(), m], [existing()]).create, [m])
})

test('variants: price change, removal, addition and return', () => {
  const m = mapped({ variants: [
    { sku: 'DZ-10', title: 'A', price: 90, stock: 5, image: null, options: { Variant: 'A' } },
    { sku: 'DZ-12', title: 'C', price: null, stock: 5, image: null, options: { Variant: 'C' } },
    { sku: 'DZ-13', title: 'D', price: null, stock: 5, image: null, options: { Variant: 'D' } },
  ], options: [{ name: 'Variant', values: ['A', 'C', 'D'] }] })
  const e = existing({ variants: [
    { id: 'v10', sku: 'DZ-10', price: 100, isActive: true },
    { id: 'v11', sku: 'DZ-11', price: null, isActive: true },
    { id: 'v13', sku: 'DZ-13', price: null, isActive: false },
  ] })
  const [vc] = planSync([m], [e]).variantChanges
  assert.equal(vc.productId, 'p1')
  assert.deepEqual(vc.priceUpdates, [{ id: 'v10', sku: 'DZ-10', old: 100, new: 90, held: false }])
  assert.deepEqual(vc.deactivate, [{ id: 'v11', sku: 'DZ-11' }])
  assert.deepEqual(vc.reactivate, [{ id: 'v13', sku: 'DZ-13' }])
  assert.deepEqual(vc.create.map(v => v.sku), ['DZ-12'])
  assert.deepEqual(vc.options, m.options)
  assert.equal(vc.structural, true)
  assert.deepEqual(vc.all.map(v => v.sku), ['DZ-10', 'DZ-12', 'DZ-13'])
})

test('unchanged variants produce no variant change', () => {
  const m = mapped({ variants: [{ sku: 'DZ-10', title: 'A', price: null, stock: 1, image: null, options: {} }] })
  const e = existing({ variants: [{ id: 'v10', sku: 'DZ-10', price: null, isActive: true }] })
  assert.deepEqual(planSync([m], [e]).variantChanges, [])
})

test('products not from Daraz are never touched', () => {
  assert.deepEqual(planSync([], [existing({ sku: 'OWN-1' }), existing({ id: 'p2', sku: null })]), empty)
})

test('a sale window that moves at the same prices is a change, applied and not logged as a price move', () => {
  const until = new Date('2026-12-31T00:00:00Z')
  const plan = planSync([mapped({ salePrice: 299, salePriceExpiresAt: until })], [existing({ salePrice: 299, salePriceExpiresAt: new Date('2026-11-25T00:00:00Z') })])
  assert.equal(plan.priceChanges.length, 1)
  const c = plan.priceChanges[0]
  assert.equal(c.held, false); assert.equal(c.priceChanged, false)
  assert.equal(c.new.salePriceExpiresAt, until)
})

test('same window as a string or a Date is not a change', () => {
  const plan = planSync([mapped({ salePrice: 299, salePriceExpiresAt: new Date('2026-12-31T00:00:00Z') })], [existing({ salePrice: 299, salePriceExpiresAt: '2026-12-31T00:00:00.000Z' })])
  assert.deepEqual(plan.priceChanges, [])
})

test('a held product is not restored and its variant prices are not applied', () => {
  const m = mapped({ price: 100, variants: [{ sku: 'DZ-10', title: 'A', price: 100, stock: 1, image: null, options: {} }, { sku: 'DZ-11', title: 'B', price: 150, stock: 1, image: null, options: {} }] })
  const e = existing({ isActive: false, variants: [{ id: 'v10', sku: 'DZ-10', price: 500, isActive: true }, { id: 'v11', sku: 'DZ-11', price: 520, isActive: true }] })
  const plan = planSync([m], [e])
  assert.equal(plan.priceChanges[0].held, true)
  assert.deepEqual(plan.reactivate, [])
  assert.ok(plan.variantChanges[0].priceUpdates.every(u => u.held))
})

test('a variant price move over 20% is held on its own; applyHeld releases it', () => {
  const m = mapped({ variants: [{ sku: 'DZ-10', title: 'A', price: 900, stock: 1, image: null, options: {} }, { sku: 'DZ-11', title: 'B', price: 510, stock: 1, image: null, options: {} }] })
  const e = existing({ variants: [{ id: 'v10', sku: 'DZ-10', price: 300, isActive: true }, { id: 'v11', sku: 'DZ-11', price: 500, isActive: true }] })
  assert.deepEqual(planSync([m], [e]).variantChanges[0].priceUpdates.map(u => [u.sku, u.held]), [['DZ-10', true], ['DZ-11', false]])
  assert.ok(planSync([m], [e], { applyHeld: true }).variantChanges[0].priceUpdates.every(u => !u.held))
})

test('a price that is not a number is held, never applied', () => {
  const plan = planSync([mapped({ price: NaN })], [existing()])
  assert.equal(plan.priceChanges[0].held, true)
  assert.equal(planSync([mapped({ price: NaN })], [existing()], { applyHeld: true }).priceChanges[0].held, true)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTROL_DEFAULTS, parseControls, limitSitePlan, limitMirrorPlan } from './controls.mjs'
import { priceQuantityXml } from './mirror-plan.mjs'

const on = CONTROL_DEFAULTS

test('nothing saved, or rubbish saved, means every switch on', () => {
  assert.deepEqual(parseControls(null), CONTROL_DEFAULTS)
  assert.deepEqual(parseControls('{not json'), CONTROL_DEFAULTS)
  assert.deepEqual(parseControls('"text"'), CONTROL_DEFAULTS)
})

test('saved switches are kept, unknown keys dropped, wrong types ignored', () => {
  const c = parseControls(JSON.stringify({ websiteSync: false, mirrorStock: 'no', extra: 1 }))
  assert.equal(c.websiteSync, false)
  assert.equal(c.mirrorStock, true)
  assert.equal('extra' in c, false)
})

test('the hold percentage is clamped to a usable range', () => {
  assert.equal(parseControls('{"priceHoldPercent":35}').priceHoldPercent, 35)
  assert.equal(parseControls('{"priceHoldPercent":0}').priceHoldPercent, 1)
  assert.equal(parseControls('{"priceHoldPercent":9999}').priceHoldPercent, 500)
  assert.equal(parseControls('{"priceHoldPercent":"abc"}').priceHoldPercent, 20)
})

const sitePlan = () => ({
  priceChanges: [{ id: 'p1' }],
  create: [{ name: 'new' }],
  deactivate: [{ id: 'gone' }],
  reactivate: [{ id: 'back' }],
  variantChanges: [
    { productId: 'a', priceUpdates: [{ id: 'v1' }], create: [{ sku: 's' }], deactivate: [], reactivate: [], structural: true },
    { productId: 'b', priceUpdates: [], create: [{ sku: 't' }], deactivate: [], reactivate: [], structural: false },
  ],
})

test('website plan: everything on changes nothing', () => {
  const { plan, off } = limitSitePlan(sitePlan(), on)
  assert.deepEqual(plan, sitePlan())
  assert.deepEqual(off, [])
})

test('website plan: prices off drops product and variant price moves only', () => {
  const { plan, off } = limitSitePlan(sitePlan(), { ...on, websitePrices: false })
  assert.equal(plan.priceChanges.length, 0)
  assert.ok(plan.variantChanges.every(v => v.priceUpdates.length === 0))
  assert.equal(plan.create.length, 1)
  assert.equal(plan.variantChanges[0].create.length, 1)
  assert.deepEqual(off, ['prices'])
})

test('website plan: new products and hiding can be switched off separately', () => {
  const a = limitSitePlan(sitePlan(), { ...on, websiteNewProducts: false }).plan
  assert.equal(a.create.length, 0)
  assert.equal(a.deactivate.length, 1)
  const b = limitSitePlan(sitePlan(), { ...on, websiteHideRemoved: false }).plan
  assert.equal(b.deactivate.length + b.reactivate.length, 0)
  assert.equal(b.create.length, 1)
})

test('website plan: variants off keeps variant prices but no structural edits', () => {
  const { plan } = limitSitePlan(sitePlan(), { ...on, websiteVariants: false })
  assert.equal(plan.variantChanges.length, 1)
  assert.equal(plan.variantChanges[0].priceUpdates.length, 1)
  assert.equal(plan.variantChanges[0].create.length, 0)
  assert.equal(plan.variantChanges[0].structural, false)
})

const update = (changed, o = {}) => ({
  itemId: 1, skuId: 2, name: 'x', price: 500, salePrice: 400, quantity: 9, changed,
  old: { price: 450, salePrice: null, quantity: 3 }, ...o,
})
const mirrorPlan = () => ({
  updates: [update(['price', 'quantity']), update(['quantity']), update(['salePrice'])],
  create: [{ item_id: 5 }], soldOut: [{ itemId: 7, skuId: 8 }], partial: [],
})

test('mirror plan: everything on changes nothing', () => {
  assert.deepEqual(limitMirrorPlan(mirrorPlan(), on).plan, mirrorPlan())
})

test('mirror plan: stock off keeps prices and sends the current quantity back', () => {
  const { plan } = limitMirrorPlan(mirrorPlan(), { ...on, mirrorStock: false })
  assert.equal(plan.updates.length, 2)
  assert.ok(plan.updates.every(u => u.quantity === 3 && u.price === 500))
  assert.ok(plan.updates.every(u => !u.changed.includes('quantity')))
})

test('mirror plan: prices off sends quantity alone', () => {
  const { plan } = limitMirrorPlan(mirrorPlan(), { ...on, mirrorPrices: false })
  assert.equal(plan.updates.length, 2)
  assert.ok(plan.updates.every(u => u.price === null && u.quantity === 9))
  const xml = priceQuantityXml(plan.updates)
  assert.equal(xml.includes('<Price>'), false)
  assert.equal(xml.includes('<Quantity>9</Quantity>'), true)
})

test('mirror plan: prices and stock both off leaves no updates', () => {
  const { plan, off } = limitMirrorPlan(mirrorPlan(), { ...on, mirrorPrices: false, mirrorStock: false })
  assert.equal(plan.updates.length, 0)
  assert.deepEqual(off, ['prices', 'stock'])
})

test('mirror plan: new listings and sold-out marking switch off separately', () => {
  const { plan } = limitMirrorPlan(mirrorPlan(), { ...on, mirrorNewListings: false, mirrorSoldOut: false })
  assert.equal(plan.create.length, 0)
  assert.equal(plan.soldOut.length, 0)
  assert.equal(plan.updates.length, 3)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDarazTime, darazTimeParam, mapOrder, mapItem, ordersToAlert, alertText } from './orders-lib.mjs'

test('Daraz timestamps carry their own offset', () => {
  assert.equal(parseDarazTime('2026-11-20 01:05:00 +0800').toISOString(), '2026-11-19T17:05:00.000Z')
  assert.equal(parseDarazTime('2026-11-20T01:05:00+05:45').toISOString(), '2026-11-19T19:20:00.000Z')
  assert.equal(parseDarazTime(''), null)
  assert.equal(parseDarazTime('yesterday'), null)
})

test('the API time parameter has no milliseconds and an explicit offset', () => {
  assert.equal(darazTimeParam(new Date('2026-11-19T17:05:00.123Z')), '2026-11-19T17:05:00+00:00')
})

const raw = (o = {}) => ({
  order_id: 217050067888404, created_at: '2026-11-20 01:05:00 +0800', updated_at: '2026-11-20 01:18:14 +0800',
  price: '783.00', shipping_fee: 102, payment_method: 'COD', items_count: 2, statuses: ['pending'],
  customer_first_name: 'ram',
  address_shipping: { first_name: 'Ram', last_name: 'Thapa', phone: '9800000000', address1: 'Chowk', address3: 'Kathmandu', address4: 'Bagmati', address5: 'Ward 4', city: 'Kathmandu Metro' },
  ...o,
})

test('an order row is shaped for the database', () => {
  const o = mapOrder(raw(), 'balapasa')
  assert.equal(o.externalId, '217050067888404')
  assert.equal(o.shop, 'balapasa')
  assert.equal(o.total, 783)
  assert.equal(o.shippingFee, 102)
  assert.equal(o.customerName, 'Ram Thapa')
  assert.equal(o.city, 'Kathmandu')
  assert.equal(o.address, 'Chowk, Ward 4, Bagmati, Kathmandu')
  assert.equal(o.status, 'pending')
  assert.equal(o.placedAt.toISOString(), '2026-11-19T17:05:00.000Z')
})

test('several statuses are joined; a missing address falls back to the customer name', () => {
  const o = mapOrder(raw({ statuses: ['shipped', 'canceled'], address_shipping: undefined }), 'trendwave')
  assert.equal(o.status, 'shipped, canceled')
  assert.equal(o.customerName, 'ram')
  assert.equal(o.address, '')
})

test('an order without an id or a readable date is dropped', () => {
  assert.equal(mapOrder(raw({ order_id: null }), 'balapasa'), null)
  assert.equal(mapOrder(raw({ created_at: '' }), 'balapasa'), null)
})

test('an item row is shaped for the database', () => {
  const i = mapItem({ order_item_id: 5, order_id: 9, name: 'Bottle', sku: 'S-1', variation: 'Color Family:Pink', item_price: 783, paid_price: 683, status: 'canceled', reason: 'Duplicated order', product_main_image: 'http://x/y.jpg' })
  assert.deepEqual([i.externalItemId, i.externalOrderId, i.paidPrice, i.cancelReason, i.image], ['5', '9', 683, 'Duplicated order', 'http://x/y.jpg'])
  assert.equal(mapItem({ name: 'no id' }), null)
})

const now = new Date('2026-11-20T00:00:00Z')
const order = (id, status, hoursAgo) => ({ externalId: id, status, total: 500, paymentMethod: 'COD', city: 'Pokhara', placedAt: new Date(now.getTime() - hoursAgo * 3_600_000) })

test('alerts cover only new, open, recent orders', () => {
  const mapped = [order('1', 'pending', 1), order('2', 'canceled', 1), order('3', 'pending', 100), order('4', 'ready_to_ship', 2)]
  const got = ordersToAlert(mapped, new Set(['4']), { now })
  assert.deepEqual(got.map(o => o.externalId), ['1'])
})

test('the first run for a shop alerts nothing', () => {
  assert.deepEqual(ordersToAlert([order('1', 'pending', 1)], new Set(), { now, firstRun: true }), [])
})

test('the alert names the shop, the orders and their items', () => {
  const text = alertText('Bala Pasa', [order('77', 'pending', 1)], new Map([['77', [{ name: 'Water Bottle', variation: 'Blue' }]]]))
  assert.match(text, /New Daraz order in Bala Pasa: 1/)
  assert.match(text, /#77 {2}Rs 500 {2}COD {2}Pokhara/)
  assert.match(text, /- Water Bottle \(Blue\)/)
})

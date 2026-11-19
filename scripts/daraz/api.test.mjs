import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { sign } from './api.mjs'

test('sign: sorted key+value concat, HMAC-SHA256, uppercase hex', () => {
  const s = sign('/products/get', { timestamp: '1700000000000', app_key: '123', sign_method: 'sha256' }, 'secret')
  const expected = createHmac('sha256', 'secret')
    .update('/products/getapp_key123sign_methodsha256timestamp1700000000000')
    .digest('hex').toUpperCase()
  assert.match(s, /^[0-9A-F]{64}$/)
  assert.equal(s, expected)
  assert.notEqual(s, sign('/products/get', { app_key: '124', sign_method: 'sha256', timestamp: '1700000000000' }, 'secret'))
})

import { retrying } from './api.mjs'

test('retrying: retries rate-limit errors, then returns the result', async () => {
  let calls = 0; const waits = []
  const out = await retrying(async () => { if (++calls < 3) throw new Error('Daraz /x: ApiCallLimit too fast'); return 'ok' }, { delays: [10, 20, 30], sleep: async ms => { waits.push(ms) } })
  assert.equal(out, 'ok'); assert.equal(calls, 3); assert.deepEqual(waits, [10, 20])
})

test('retrying: other errors fail at once; rate limit gives up after the last delay', async () => {
  let calls = 0
  await assert.rejects(retrying(async () => { calls++; throw new Error('Daraz /x: IllegalAccessToken') }, { delays: [1, 1], sleep: async () => {} }), /IllegalAccessToken/)
  assert.equal(calls, 1)
  calls = 0
  await assert.rejects(retrying(async () => { calls++; throw new Error('ApiCallLimit') }, { delays: [1, 1], sleep: async () => {} }), /ApiCallLimit/)
  assert.equal(calls, 3)
})

import { fetchProducts } from './api.mjs'

const pager = pages => async (_path, params) => ({ data: pages[Number(params.offset) / 50] ?? { total_products: 120, products: [] } })
const items = (from, n) => Array.from({ length: n }, (_, i) => ({ item_id: from + i }))

test('fetchProducts: pages until total_products is reached', async () => {
  const out = await fetchProducts('t', { get: pager([{ total_products: 120, products: items(0, 50) }, { total_products: 120, products: items(50, 50) }, { total_products: 120, products: items(100, 20) }]), pause: 0 })
  assert.equal(out.length, 120)
})

test('fetchProducts: a short page mid-catalogue is an error, not the end', async () => {
  await assert.rejects(fetchProducts('t', { get: pager([{ total_products: 120, products: items(0, 50) }, { total_products: 120, products: items(50, 10) }]), pause: 0 }), /expected 120/)
})

test('fetchProducts: repeated items are dropped', async () => {
  const out = await fetchProducts('t', { get: pager([{ total_products: 60, products: items(0, 50) }, { total_products: 60, products: [...items(45, 5), ...items(50, 10)] }]), pause: 0 })
  assert.equal(out.length, 60)
})

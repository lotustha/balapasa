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

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

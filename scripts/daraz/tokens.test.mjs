import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTokenResponse, chooseToken } from './tokens.mjs'

const NOW = 1_800_000_000_000
const DAY = 24 * 60 * 60 * 1000

test('parseTokenResponse: a complete response becomes a token record', () => {
  assert.deepEqual(parseTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: 2592000, refresh_expires_in: 15552000 }, NOW),
    { accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 2592000000, refreshExpiresAt: NOW + 15552000000 })
})

test('parseTokenResponse: an incomplete response is rejected, never saved', () => {
  assert.throws(() => parseTokenResponse({ refresh_token: 'r', expires_in: 10 }, NOW), /access_token/)
  assert.throws(() => parseTokenResponse({ access_token: 'a', expires_in: 10 }, NOW), /refresh_token/)
  assert.throws(() => parseTokenResponse({ access_token: 'a', refresh_token: 'r' }, NOW), /expires_in/)
})

test('chooseToken: fresh token is used as is', () => {
  assert.equal(chooseToken({ expiresAt: NOW + 20 * DAY, refreshExpiresAt: NOW + 100 * DAY }, NOW, true), 'use')
})

test('chooseToken: close to expiry renews only where renewal is allowed', () => {
  const t = { expiresAt: NOW + 3 * DAY, refreshExpiresAt: NOW + 100 * DAY }
  assert.equal(chooseToken(t, NOW, true), 'renew')
  assert.equal(chooseToken(t, NOW, false), 'use')
})

test('chooseToken: expired access token with renewal off, or expired refresh token, is a clear dead end', () => {
  assert.equal(chooseToken({ expiresAt: NOW - DAY, refreshExpiresAt: NOW + 100 * DAY }, NOW, false), 'expired')
  assert.equal(chooseToken({ expiresAt: NOW - DAY, refreshExpiresAt: NOW - DAY }, NOW, true), 'reauthorize')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, REMIND_MS } from './evaluate.mjs'

const T0 = 1_800_000_000_000
const MIN = 60_000
const ok = name => ({ name, ok: true, detail: 'fine' })
const bad = (name, detail = 'HTTP 502') => ({ name, ok: false, detail })

test('all fine, nothing known → silence', () => {
  const { messages, state } = evaluate([ok('Homepage')], {}, T0)
  assert.deepEqual(messages, []); assert.equal(state.Homepage.fails, 0)
})

test('a single failure is not announced; the second in a row is', () => {
  const first = evaluate([bad('Homepage')], {}, T0)
  assert.deepEqual(first.messages, [])
  const second = evaluate([bad('Homepage')], first.state, T0 + 5 * MIN)
  assert.deepEqual(second.messages, ['PROBLEM on balapasa.com.np\n- Homepage: HTTP 502'])
})

test('a blip that clears before the second check is never mentioned', () => {
  const first = evaluate([bad('Homepage')], {}, T0)
  assert.deepEqual(evaluate([ok('Homepage')], first.state, T0 + 5 * MIN).messages, [])
})

test('an announced problem stays quiet, then is repeated after the reminder interval', () => {
  let s = evaluate([bad('Homepage')], {}, T0).state
  s = evaluate([bad('Homepage')], s, T0 + 5 * MIN).state
  const quiet = evaluate([bad('Homepage')], s, T0 + 10 * MIN)
  assert.deepEqual(quiet.messages, [])
  const later = evaluate([bad('Homepage')], quiet.state, T0 + 5 * MIN + REMIND_MS)
  assert.equal(later.messages.length, 1)
  assert.match(later.messages[0], /^STILL A PROBLEM/); assert.match(later.messages[0], /for 6 h\)/)
})

test('recovery is announced once, with how long it lasted, only if the problem was announced', () => {
  let s = evaluate([bad('Homepage')], {}, T0).state
  s = evaluate([bad('Homepage')], s, T0 + 5 * MIN).state
  const up = evaluate([ok('Homepage')], s, T0 + 35 * MIN)
  assert.deepEqual(up.messages, ['RECOVERED on balapasa.com.np\n- Homepage is fine again (was a problem for 35 min)'])
  assert.deepEqual(evaluate([ok('Homepage')], up.state, T0 + 40 * MIN).messages, [])
})

test('several checks are grouped into one message per kind', () => {
  let s = evaluate([bad('Homepage'), bad('Products API', 'timeout'), ok('SSL certificate')], {}, T0).state
  const { messages } = evaluate([bad('Homepage'), bad('Products API', 'timeout'), ok('SSL certificate')], s, T0 + 5 * MIN)
  assert.deepEqual(messages, ['PROBLEM on balapasa.com.np\n- Homepage: HTTP 502\n- Products API: timeout'])
})

test('a check that disappears from the results drops out of the state', () => {
  const s = evaluate([bad('Old check')], {}, T0).state
  assert.deepEqual(Object.keys(evaluate([ok('Homepage')], s, T0 + 5 * MIN).state), ['Homepage'])
})

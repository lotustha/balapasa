import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMessage, createPending, summaryDue, createSentStore } from './bot-logic.mjs'

test('a message splits into a lower-case command and the rest', () => {
  assert.deepEqual(parseMessage('  Order   DZ-12-0001 '), { command: 'order', arg: 'DZ-12-0001' })
  assert.deepEqual(parseMessage('STOCK water bottle'), { command: 'stock', arg: 'water bottle' })
  assert.deepEqual(parseMessage('yes'), { command: 'yes', arg: '' })
  assert.deepEqual(parseMessage(''), { command: '', arg: '' })
})

test('a yes inside two minutes releases the waiting action, once', () => {
  const p = createPending()
  p.set('chat', { command: 'cancel', arg: 'A1' }, 1000)
  assert.deepEqual(p.take('chat', 1000 + 119_000), { command: 'cancel', arg: 'A1' })
  assert.equal(p.take('chat', 1000 + 119_000), null)
})

test('a yes after two minutes does nothing', () => {
  const p = createPending()
  p.set('chat', { command: 'cancel', arg: 'A1' }, 1000)
  assert.equal(p.take('chat', 1000 + 121_000), null)
})

test('a yes from another chat does nothing, and another command drops the wait', () => {
  const p = createPending()
  p.set('a', { command: 'ship', arg: 'A1' }, 0)
  assert.equal(p.take('b', 10), null)
  p.clear('a')
  assert.equal(p.take('a', 10), null)
})

test('the summary is due from 8 pm Nepal time, once per day', () => {
  // 14:15 UTC = 20:00 Nepal
  assert.equal(summaryDue(new Date('2026-11-20T14:14:00Z'), null), null)
  assert.equal(summaryDue(new Date('2026-11-20T14:15:00Z'), null), '2026-11-20')
  assert.equal(summaryDue(new Date('2026-11-20T14:15:00Z'), '2026-11-19'), '2026-11-20')
  assert.equal(summaryDue(new Date('2026-11-20T15:00:00Z'), '2026-11-20'), null)
  // 18:20 UTC = 00:05 Nepal the next day: not due again until that evening
  assert.equal(summaryDue(new Date('2026-11-20T18:20:00Z'), '2026-11-20'), null)
})

test('the sent store returns a remembered message by id and forgets the oldest past its limit', () => {
  const store = createSentStore(2)
  store.remember({ key: { id: 'a' }, message: { conversation: 'one' } })
  store.remember({ key: { id: 'b' }, message: { conversation: 'two' } })
  assert.deepEqual(store.get('b'), { conversation: 'two' })
  store.remember({ key: { id: 'c' }, message: { conversation: 'three' } })
  assert.equal(store.get('a'), undefined)
  assert.deepEqual(store.get('c'), { conversation: 'three' })
  assert.equal(store.get(undefined), undefined)
  assert.equal(store.remember(undefined), undefined)
})

test('the sent store can be rebuilt from its entries after a restart and reports each addition', () => {
  let changes = 0
  const first = createSentStore(2, { onChange: () => changes++ })
  first.remember({ key: { id: 'a' }, message: { conversation: 'one' } })
  first.remember({ key: { id: 'b' }, message: { conversation: 'two' } })
  assert.equal(changes, 2)
  const second = createSentStore(2, { initial: JSON.parse(JSON.stringify(first.entries())) })
  assert.deepEqual(second.get('a'), { conversation: 'one' })
  assert.deepEqual(second.get('b'), { conversation: 'two' })
  assert.equal(createSentStore(2, { initial: 'broken' }).get('a'), undefined)
})

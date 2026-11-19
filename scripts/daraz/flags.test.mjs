import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseFlags } from './flags.mjs'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 10, 19)
const prod = (n, o = {}) => ({ id: `p${n}`, categoryId: 'c1', price: 1000, salePrice: null, viewCount: 0, stock: 10, createdAt: new Date(T0 - n * DAY), ...o })

test('new = the most recently listed products, newest first', () => {
  const products = Array.from({ length: 30 }, (_, i) => prod(i + 1))
  const { newIds } = chooseFlags(products, { newCount: 5, featuredCount: 0 })
  assert.deepEqual(newIds, ['p1', 'p2', 'p3', 'p4', 'p5'])
})

test('featured prefers bigger discounts and more views, and skips what is already "new"', () => {
  const products = [
    prod(1, { salePrice: 100 }),                       // newest: taken by "new"
    prod(10, { salePrice: 500, categoryId: 'a' }),     // 50% off
    prod(11, { salePrice: 900, categoryId: 'b' }),     // 10% off
    prod(12, { categoryId: 'c', viewCount: 400 }),     // no discount, heavily viewed
    prod(13, { categoryId: 'd' }),                     // nothing going for it
  ]
  const { newIds, featuredIds } = chooseFlags(products, { newCount: 1, featuredCount: 3 })
  assert.deepEqual(newIds, ['p1'])
  assert.deepEqual(featuredIds, ['p10', 'p12', 'p11'])
})

test('featured takes at most two products from one category', () => {
  const products = [
    ...[1, 2, 3, 4].map(n => prod(100 + n, { categoryId: 'same', salePrice: 100 + n })),
    prod(200, { categoryId: 'other', salePrice: 900 }),
  ]
  const { featuredIds } = chooseFlags(products, { newCount: 0, featuredCount: 3 })
  assert.equal(featuredIds.filter(id => id !== 'p200').length, 2)
  assert.ok(featuredIds.includes('p200'))
})

test('sold-out products are never featured or new while others are available', () => {
  const products = [prod(1, { stock: 0, salePrice: 10 }), prod(2, { salePrice: 500 }), prod(3)]
  const { newIds, featuredIds } = chooseFlags(products, { newCount: 1, featuredCount: 1 })
  assert.deepEqual(newIds, ['p2'])
  assert.deepEqual(featuredIds, ['p3'])
})

test('a sale price that is not below the price is not a discount', () => {
  const products = [prod(5, { salePrice: 1000, categoryId: 'a' }), prod(6, { salePrice: 950, categoryId: 'b' })]
  assert.deepEqual(chooseFlags(products, { newCount: 0, featuredCount: 1 }).featuredIds, ['p6'])
})

test('fewer products than slots: no duplicates, no crash', () => {
  const { newIds, featuredIds } = chooseFlags([prod(1), prod(2)], { newCount: 12, featuredCount: 12 })
  assert.deepEqual(newIds, ['p1', 'p2']); assert.deepEqual(featuredIds, [])
})

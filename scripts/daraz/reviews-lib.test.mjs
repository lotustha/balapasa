import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewDate, maskName, mapReview } from './reviews-lib.mjs'

const now = new Date('2026-11-22T00:00:00Z')

test('reviewDate reads a calendar date and an "ago" phrase', () => {
  assert.equal(reviewDate('18 Sep 2026', now).toISOString().slice(0, 10), '2026-09-18')
  assert.equal(reviewDate('2 weeks ago', now).toISOString().slice(0, 10), '2026-11-08')
  assert.equal(reviewDate('a day ago', now).toISOString().slice(0, 10), '2026-11-21')
  assert.equal(reviewDate('nonsense', now), now)
})

test('maskName never shows a full name', () => {
  assert.equal(maskName('Sita Sharma'), 'S***a')
  assert.equal(maskName('s***a'), 'S***a')
  assert.equal(maskName('K'), 'K***')
  assert.equal(maskName(''), 'Daraz buyer')
})

test('mapReview keeps what the page shows', () => {
  const r = mapReview({ reviewRateId: 77, rating: 4, reviewContent: ' good \n product ', buyerName: 'Ram Thapa', skuInfo: 'Color Family:Pink',
    reviewTime: '18 Sep 2026', reviewType: 'PRODUCT_REVIEW', images: [{ url: '//img.lazcdn.com/a.jpg' }, 'https://img.lazcdn.com/b.jpg', { url: 'http://x/c.jpg' }] }, now)
  assert.equal(r.externalId, 'daraz-77')
  assert.equal(r.rating, 4)
  assert.equal(r.comment, 'good product')
  assert.equal(r.authorName, 'R***a')
  assert.equal(r.variant, 'Color Family:Pink')
  assert.deepEqual(r.images, ['https://img.lazcdn.com/a.jpg', 'https://img.lazcdn.com/b.jpg'])
})

test('mapReview drops rejected, unrated and non-product reviews; an empty text becomes null', () => {
  assert.equal(mapReview({ reviewRateId: 1, rating: 5, rejected: true }), null)
  assert.equal(mapReview({ reviewRateId: 1, rating: 0 }), null)
  assert.equal(mapReview({ rating: 5 }), null)
  assert.equal(mapReview({ reviewRateId: 1, rating: 5, reviewType: 'SELLER_REVIEW' }), null)
  assert.equal(mapReview({ reviewRateId: 1, rating: 5, reviewContent: '  ' }, now).comment, null)
})

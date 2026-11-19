import { test } from 'node:test'
import assert from 'node:assert/strict'
import { minimumDeliveryCharge } from '../../src/lib/delivery-floor.ts'

const base = { subtotal: 1000, nonFreeSubtotal: 1000, freeDeliveryThreshold: 5000, deliverySubsidy: 0 }

test('an ordinary order cannot have free delivery', () => {
  assert.equal(minimumDeliveryCharge(base), 50)
})

test('orders at or over the free-delivery threshold may be free', () => {
  assert.equal(minimumDeliveryCharge({ ...base, subtotal: 5000, nonFreeSubtotal: 5000 }), 0)
})

test('a cart of only free-delivery products may be free', () => {
  assert.equal(minimumDeliveryCharge({ ...base, nonFreeSubtotal: 0 }), 0)
})

test('a mixed cart pays in proportion to the products that are not free-delivery', () => {
  assert.equal(minimumDeliveryCharge({ ...base, nonFreeSubtotal: 400 }), 20)
})

test('a delivery subsidy lowers the floor and never makes it negative', () => {
  assert.equal(minimumDeliveryCharge({ ...base, deliverySubsidy: 30 }), 20)
  assert.equal(minimumDeliveryCharge({ ...base, deliverySubsidy: 500 }), 0)
})

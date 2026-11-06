import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, orderTotal } from '../src/order.mjs';
import { calculateShipping } from '../src/shipping.mjs';
import { applyCoupon } from '../src/coupon.mjs';

const today = new Date('2026-11-01T12:00:00Z');
const items = [{ priceCents: 4990, quantity: 1 }, { priceCents: 2990, quantity: 2 }];

test('subtotal adds price times quantity', () => {
  assert.equal(subtotal(items), 10970);
});

test('Southeast shipping for an order of R$ 109.70', () => {
  assert.equal(calculateShipping('01310-100', 10970, items), 1290);
});

test('free shipping above R$ 150.00', () => {
  assert.equal(calculateShipping('01310-100', 20000, items), 0);
});

test('invalid postal code throws', () => {
  assert.throws(() => calculateShipping('123', 1000), /Invalid postal code/);
});

test('10% coupon', () => {
  assert.equal(applyCoupon(10000, 'reader10', today), 9000);
});

test('fixed coupon respects the order minimum', () => {
  assert.equal(applyCoupon(5000, 'FIRST20', today), 5000);
  assert.equal(applyCoupon(10000, 'FIRST20', today), 8000);
});

test('total with coupon and shipping', () => {
  const r = orderTotal({ items, postalCode: '01310-100', coupon: 'READER10' }, today);
  assert.deepEqual(r, { gross: 10970, discount: 1097, shipping: 1290, total: 11163 });
});

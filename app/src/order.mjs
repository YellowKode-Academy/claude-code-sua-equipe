// Total of a bookstore order: items, coupon and shipping.
// Values are always in cents (integers) so rounding never goes wrong.
import { calculateShipping } from './shipping.mjs';
import { applyCoupon } from './coupon.mjs';

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function orderTotal(order, today = new Date()) {
  const gross = subtotal(order.items);
  const discounted = order.coupon ? applyCoupon(gross, order.coupon, today) : gross;
  const shipping = calculateShipping(order.postalCode, discounted, order.items);
  return { gross, discount: gross - discounted, shipping, total: discounted + shipping };
}

// Coupons: percent (e.g. 10%) or fixed amount (e.g. R$ 20.00), with an expiry date.
export const COUPONS = {
  READER10: { type: 'percent', value: 10, validUntil: '2026-12-31' },
  FIRST20: { type: 'fixed', value: 2000, validUntil: '2026-12-31', minCents: 8000 },
};

export function applyCoupon(valueCents, code, today = new Date()) {
  const c = COUPONS[code.toUpperCase()];
  if (!c) throw new Error(`Coupon not found: ${code}`);
  if (today.toISOString().slice(0, 10) > c.validUntil) throw new Error(`Coupon expired: ${code}`);
  if (c.minCents && valueCents < c.minCents) return valueCents;
  if (c.type === 'percent') return Math.round(valueCents * (1 - c.value / 100));
  return valueCents - c.value;
}

// Shipping by postal code (CEP) region. Above R$ 150.00 (after the discount), shipping is free.
const FREE_SHIPPING_FROM = 15000;
const TABLE = [
  { prefixes: ['0', '1'], value: 1290 }, // Southeast (SP)
  { prefixes: ['2', '3'], value: 1590 }, // Southeast (RJ, ES, MG)
  { prefixes: ['8', '9'], value: 1890 }, // South
  { prefixes: ['4', '5', '6', '7'], value: 2490 }, // Northeast, North and Center-West
];

export function calculateShipping(postalCode, valueCents, items = []) {
  const clean = String(postalCode).replace(/\D/g, '');
  if (clean.length !== 8) throw new Error(`Invalid postal code: ${postalCode}`);
  if (valueCents > FREE_SHIPPING_FROM) return 0;
  const band = TABLE.find(f => f.prefixes.includes(clean[0]));
  const books = items.reduce((s, i) => s + i.quantity, 0);
  // Each book from the 4th on adds R$ 2.00.
  return band.value + Math.max(0, books - 3) * 200;
}

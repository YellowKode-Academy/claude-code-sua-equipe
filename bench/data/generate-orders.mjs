#!/usr/bin/env node
// Generates an orders JSON similar to what a store API returns: customer with address,
// items and event history. Always the same file for the same number of orders
// (no randomness), so you can redo the chapter 6 measurements.
//
// Usage: node bench/data/generate-orders.mjs 300 > bench/data/orders-300.json

import { basename } from 'node:path';

const STATUS = ['paid', 'pending', 'canceled', 'shipped'];
const CITIES = [['São Paulo', 'SP', '01310-100'], ['Rio de Janeiro', 'RJ', '20040-020'], ['Curitiba', 'PR', '80010-000'], ['Recife', 'PE', '50030-230']];
const BOOKS = ['Dom Casmurro', 'The Slum', 'Barren Lives', 'The Devil to Pay in the Backlands', 'Captains of the Sands', 'Posthumous Memoirs'];

export function generateOrders(n) {
  return {
    data: {
      page: 1,
      total: n,
      items: Array.from({ length: n }, (_, i) => {
        const [city, state, postalCode] = CITIES[i % CITIES.length];
        const items = Array.from({ length: 4 }, (_, j) => ({
          sku: `BK-${(i * 4 + j) % 97}`, title: BOOKS[(i + j) % BOOKS.length],
          quantity: 1 + ((i + j) % 3), priceCents: 2990 + ((i * 7 + j * 13) % 40) * 100,
        }));
        return {
          id: `ord_${String(i + 1).padStart(5, '0')}`,
          status: STATUS[i % STATUS.length],
          total: items.reduce((s, it) => s + it.quantity * it.priceCents, 0),
          customer: {
            name: `Customer ${i + 1}`, email: `customer${i + 1}@example.com`, phone: `+55 11 9${String(10000000 + i * 7919).slice(0, 8)}`,
            address: { street: `${100 + i} Flower Street`, district: 'Downtown', city, state, postalCode },
          },
          items,
          history: ['created', 'payment_approved', 'picked', 'invoice_issued', 'dispatched'].map((event, k) => ({
            event, at: new Date(Date.UTC(2026, 9, 1 + (i % 28), 8 + k, 0)).toISOString(), by: k % 2 ? 'system' : 'store',
          })),
        };
      }),
    },
  };
}

if (process.argv[1] && basename(process.argv[1]) === 'generate-orders.mjs') {
  process.stdout.write(JSON.stringify(generateOrders(Number(process.argv[2] || 300))));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, totalDoPedido } from '../src/pedido.mjs';
import { calcularFrete } from '../src/frete.mjs';
import { aplicarCupom } from '../src/cupom.mjs';

const hoje = new Date('2026-11-01T12:00:00Z');
const itens = [{ precoCentavos: 4990, quantidade: 1 }, { precoCentavos: 2990, quantidade: 2 }];

test('subtotal soma preço vezes quantidade', () => {
  assert.equal(subtotal(itens), 10970);
});

test('frete do Sudeste para um pedido de R$ 109,70', () => {
  assert.equal(calcularFrete('01310-100', 10970, itens), 1290);
});

test('frete grátis acima de R$ 150,00', () => {
  assert.equal(calcularFrete('01310-100', 20000, itens), 0);
});

test('CEP inválido gera erro', () => {
  assert.throws(() => calcularFrete('123', 1000), /CEP inválido/);
});

test('cupom de 10%', () => {
  assert.equal(aplicarCupom(10000, 'leitor10', hoje), 9000);
});

test('cupom fixo respeita o mínimo do pedido', () => {
  assert.equal(aplicarCupom(5000, 'PRIMEIRA20', hoje), 5000);
  assert.equal(aplicarCupom(10000, 'PRIMEIRA20', hoje), 8000);
});

test('total com cupom e frete', () => {
  const r = totalDoPedido({ itens, cep: '01310-100', cupom: 'LEITOR10' }, hoje);
  assert.deepEqual(r, { bruto: 10970, desconto: 1097, frete: 1290, total: 11163 });
});

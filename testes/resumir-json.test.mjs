import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pegar, resumir, lerArgs } from '../ferramentas/resumir-json.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const dado = { data: { items: Array.from({ length: 50 }, (_, i) => ({ id: i, status: i % 3 ? 'ok' : 'erro', cliente: { nome: `c${i}`, cpf: 'NÃO-DEVE-SAIR' } })) } };

test('pegar segue o caminho com ponto', () => {
  assert.equal(pegar(dado, 'data.items.0.cliente.nome'), 'c0');
  assert.equal(pegar(dado, 'data.nada.aqui'), undefined);
});

test('mantém só os campos pedidos e respeita o limite', () => {
  const r = resumir(dado, { lista: 'data.items', campos: ['id', 'cliente.nome'], limite: 5 });
  assert.equal(r.total, 50);
  assert.equal(r.mostrando, 5);
  assert.deepEqual(Object.keys(r.itens[0]), ['id', 'cliente.nome']);
  assert.ok(!JSON.stringify(r).includes('NÃO-DEVE-SAIR'));
});

test('conta por valor de um campo', () => {
  const r = resumir(dado, { lista: 'data.items', contar: 'status' });
  assert.equal(r.total, 50);
  assert.equal(r.por.erro + r.por.ok, 50);
});

test('lê argumentos', () => {
  assert.deepEqual(lerArgs(['x.json', '--campos', 'a, b', '--limite', '3']), { arquivo: 'x.json', campos: ['a', 'b'], limite: 3 });
});

test('pela linha de comando, a saída é muito menor que a entrada', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'rj-')), 'grande.json');
  writeFileSync(f, JSON.stringify(dado));
  const out = execFileSync(process.execPath, [join(RAIZ, 'ferramentas', 'resumir-json.mjs'), f, '--lista', 'data.items', '--contar', 'status'], { encoding: 'utf8' });
  assert.ok(out.length < JSON.stringify(dado).length / 10);
});

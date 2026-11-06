import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pick, summarize, parseArgs } from '../tools/summarize-json.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = { data: { items: Array.from({ length: 50 }, (_, i) => ({ id: i, status: i % 3 ? 'ok' : 'error', customer: { name: `c${i}`, taxId: 'MUST-NOT-LEAK' } })) } };

test('pick follows the dotted path', () => {
  assert.equal(pick(data, 'data.items.0.customer.name'), 'c0');
  assert.equal(pick(data, 'data.nothing.here'), undefined);
});

test('keeps only the requested fields and respects the limit', () => {
  const r = summarize(data, { list: 'data.items', fields: ['id', 'customer.name'], limit: 5 });
  assert.equal(r.total, 50);
  assert.equal(r.showing, 5);
  assert.deepEqual(Object.keys(r.items[0]), ['id', 'customer.name']);
  assert.ok(!JSON.stringify(r).includes('MUST-NOT-LEAK'));
});

test('counts by the value of a field', () => {
  const r = summarize(data, { list: 'data.items', count: 'status' });
  assert.equal(r.total, 50);
  assert.equal(r.by.error + r.by.ok, 50);
});

test('reads arguments', () => {
  assert.deepEqual(parseArgs(['x.json', '--fields', 'a, b', '--limit', '3']), { file: 'x.json', fields: ['a', 'b'], limit: 3 });
});

test('from the command line, the output is much smaller than the input', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'rj-')), 'big.json');
  writeFileSync(f, JSON.stringify(data));
  const out = execFileSync(process.execPath, [join(ROOT, 'tools', 'summarize-json.mjs'), f, '--list', 'data.items', '--count', 'status'], { encoding: 'utf8' });
  assert.ok(out.length < JSON.stringify(data).length / 10);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run, activePause, hitLimit } from '../routines/daily-routine.mjs';

// A fake "claude": prints the JSON that claude -p would print.
function fakeClaude(dir, output, code = 0) {
  const f = join(dir, 'fake-claude.mjs');
  writeFileSync(f, `process.stdout.write(${JSON.stringify(JSON.stringify(output))}); process.exit(${code});`);
  return f;
}

const now = new Date('2026-10-30T10:30:00Z');

test('a good round writes the day and the history and exits with 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'routine-'));
  const logs = join(dir, 'logs');
  const res = run({ prompt: 'x', model: 'sonnet', maxTurns: '3', logs, claude: fakeClaude(dir, { result: '🟢 green\nall good', is_error: false, total_cost_usd: 0.02, num_turns: 3 }) }, now);
  assert.equal(res.code, 0);
  assert.ok(existsSync(join(logs, '2026-10-30.json')));
  const h = JSON.parse(readFileSync(join(logs, 'history.jsonl'), 'utf8').trim());
  assert.equal(h.ok, true);
  assert.equal(h.firstLine, '🟢 green');
});

test('a round with an error exits with 1 (failure is never silent)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'routine-'));
  const res = run({ prompt: 'x', model: 'sonnet', maxTurns: '3', logs: join(dir, 'logs'), claude: fakeClaude(dir, { is_error: true, subtype: 'error_max_turns' }, 1) }, now);
  assert.equal(res.code, 1);
  assert.equal(res.status, 'failed');
});

test('429 writes the 24 h pause and the next round does not call Claude', () => {
  const dir = mkdtempSync(join(tmpdir(), 'routine-'));
  const logs = join(dir, 'logs');
  run({ prompt: 'x', model: 'sonnet', maxTurns: '3', logs, claude: fakeClaude(dir, { is_error: true, api_error_status: 429 }, 1) }, now);
  assert.equal(readFileSync(join(logs, 'paused-until.txt'), 'utf8'), '2026-10-31T10:30:00.000Z');
  const later = new Date('2026-10-30T18:00:00Z');
  const res = run({ prompt: 'x', model: 'sonnet', maxTurns: '3', logs, claude: join(dir, 'does-not-exist.mjs') }, later);
  assert.equal(res.status, 'paused');
  assert.equal(activePause(logs, new Date('2026-10-31T11:00:00Z')), null);
});

test('also recognizes a limit by the message', () => {
  assert.ok(hitLimit({ result: 'Claude usage limit reached' }));
  assert.ok(!hitLimit({ result: 'all good' }));
});

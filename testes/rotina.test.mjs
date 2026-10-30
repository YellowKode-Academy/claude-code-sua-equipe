import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rodar, pausaAtiva, bateuEmLimite } from '../rotinas/rotina-diaria.mjs';

// Um "claude" de mentira: imprime o JSON que o claude -p imprimiria.
function claudeFalso(dir, saida, codigo = 0) {
  const f = join(dir, 'claude-falso.mjs');
  writeFileSync(f, `process.stdout.write(${JSON.stringify(JSON.stringify(saida))}); process.exit(${codigo});`);
  return f;
}

const agora = new Date('2026-10-30T10:30:00Z');

test('rodada boa grava o dia e o histórico e sai com 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rotina-'));
  const logs = join(dir, 'logs');
  const res = rodar({ prompt: 'x', modelo: 'sonnet', maxTurnos: '3', logs, claude: claudeFalso(dir, { result: '🟢 verde\ntudo certo', is_error: false, total_cost_usd: 0.02, num_turns: 3 }) }, agora);
  assert.equal(res.codigo, 0);
  assert.ok(existsSync(join(logs, '2026-10-30.json')));
  const h = JSON.parse(readFileSync(join(logs, 'historico.jsonl'), 'utf8').trim());
  assert.equal(h.ok, true);
  assert.equal(h.primeiraLinha, '🟢 verde');
});

test('rodada com erro sai com 1 (falha nunca fica silenciosa)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rotina-'));
  const res = rodar({ prompt: 'x', modelo: 'sonnet', maxTurnos: '3', logs: join(dir, 'logs'), claude: claudeFalso(dir, { is_error: true, subtype: 'error_max_turns' }, 1) }, agora);
  assert.equal(res.codigo, 1);
  assert.equal(res.status, 'falhou');
});

test('429 grava a pausa de 24 h e a próxima rodada não chama o Claude', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rotina-'));
  const logs = join(dir, 'logs');
  rodar({ prompt: 'x', modelo: 'sonnet', maxTurnos: '3', logs, claude: claudeFalso(dir, { is_error: true, api_error_status: 429 }, 1) }, agora);
  assert.equal(readFileSync(join(logs, 'pausa-ate.txt'), 'utf8'), '2026-10-31T10:30:00.000Z');
  const depois = new Date('2026-10-30T18:00:00Z');
  const res = rodar({ prompt: 'x', modelo: 'sonnet', maxTurnos: '3', logs, claude: join(dir, 'nao-existe.mjs') }, depois);
  assert.equal(res.status, 'pausada');
  assert.equal(pausaAtiva(logs, new Date('2026-10-31T11:00:00Z')), null);
});

test('reconhece limite pela mensagem também', () => {
  assert.ok(bateuEmLimite({ result: 'Claude usage limit reached' }));
  assert.ok(!bateuEmLimite({ result: 'tudo certo' }));
});

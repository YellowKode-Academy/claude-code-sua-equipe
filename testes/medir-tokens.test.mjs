import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listarTranscripts, lerRespostas, agrupar, custo } from '../ferramentas/medir-tokens.mjs';

const precos = {
  opus: { entrada: 4, saida: 20, cacheLeitura: 0.2, cacheEscrita5m: 5, cacheEscrita1h: 8 },
  sonnet: { entrada: 2, saida: 10, cacheLeitura: 0.2, cacheEscrita5m: 2.5, cacheEscrita1h: 4 },
};

function resposta(id, modelo, saida, dia = '2026-10-30', extra = {}) {
  return JSON.stringify({
    type: 'assistant', timestamp: `${dia}T12:00:00Z`, requestId: `req_${id}`,
    message: { id, model: modelo, usage: { input_tokens: 10, output_tokens: saida, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0, ...extra } },
  });
}

function montarRaiz() {
  const raiz = mkdtempSync(join(tmpdir(), 'medir-'));
  const proj = join(raiz, 'c--meu-projeto');
  mkdirSync(join(proj, 'sessao-1', 'subagents'), { recursive: true });
  // A mesma resposta gravada 3 vezes (uma por bloco de conteúdo), como o Claude Code faz.
  writeFileSync(join(proj, 'sessao-1.jsonl'), [
    resposta('msg_a', 'claude-opus-5-5', 100), resposta('msg_a', 'claude-opus-5-5', 100), resposta('msg_a', 'claude-opus-5-5', 100),
    resposta('msg_b', 'claude-opus-5-5', 50, '2026-10-29'),
    JSON.stringify({ type: 'user', message: { content: 'oi' } }),
    'linha quebrada {',
  ].join('\n'));
  writeFileSync(join(proj, 'sessao-1', 'subagents', 'agent-x.jsonl'), resposta('msg_c', 'claude-sonnet-5-5', 400));
  writeFileSync(join(proj, 'sessao-1', 'subagents', 'agent-x.meta.json'), JSON.stringify({ agentType: 'Explore' }));
  return raiz;
}

test('acha a sessão principal e o subagente com o tipo do .meta.json', () => {
  const ts = listarTranscripts(montarRaiz());
  assert.equal(ts.length, 2);
  assert.ok(ts.some(t => t.agente === 'sessão principal'));
  assert.ok(ts.some(t => t.agente === 'subagente: Explore'));
});

test('conta cada resposta uma vez, mesmo gravada em várias linhas', () => {
  const t = listarTranscripts(montarRaiz()).find(t => t.agente === 'sessão principal');
  const rs = lerRespostas(t);
  assert.equal(rs.length, 2);
  assert.equal(rs.reduce((s, r) => s + r.saida, 0), 150);
});

test('filtra por data', () => {
  const t = listarTranscripts(montarRaiz()).find(t => t.agente === 'sessão principal');
  assert.equal(lerRespostas(t, { desde: '2026-10-30' }).length, 1);
  assert.equal(lerRespostas(t, { ate: '2026-10-29' }).length, 1);
});

test('filtra por projeto', () => {
  assert.equal(listarTranscripts(montarRaiz(), 'outro').length, 0);
  assert.equal(listarTranscripts(montarRaiz(), 'MEU').length, 2);
});

test('custo usa o preço de escrita de 1 h quando o transcript traz o detalhe', () => {
  const base = { modelo: 'claude-opus-5-5', entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 1_000_000 };
  assert.equal(custo({ ...base, cacheEscrita1h: 0 }, precos), 5);
  assert.equal(custo({ ...base, cacheEscrita1h: 1_000_000 }, precos), 8);
  assert.equal(custo({ ...base, modelo: 'modelo-novo' }, precos), null);
});

test('agrupa por agente e calcula a fatia de cada um', () => {
  const raiz = montarRaiz();
  const rs = listarTranscripts(raiz).flatMap(t => lerRespostas(t));
  const { lista, total } = agrupar(rs, 'agente', precos);
  assert.equal(lista.length, 2);
  const soma = lista.reduce((s, g) => s + g.fatia, 0);
  assert.ok(Math.abs(soma - 1) < 1e-9);
  assert.ok(total > 0);
});

test('pasta inexistente não quebra', () => {
  assert.deepEqual(listarTranscripts(join(tmpdir(), 'nao-existe-' + Date.now())), []);
});

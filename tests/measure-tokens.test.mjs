import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listTranscripts, readResponses, groupBy, cost } from '../tools/measure-tokens.mjs';

const prices = {
  opus: { input: 4, output: 20, cacheRead: 0.2, cacheWrite5m: 5, cacheWrite1h: 8 },
  sonnet: { input: 2, output: 10, cacheRead: 0.2, cacheWrite5m: 2.5, cacheWrite1h: 4 },
};

function response(id, model, output, day = '2026-10-30', extra = {}) {
  return JSON.stringify({
    type: 'assistant', timestamp: `${day}T12:00:00Z`, requestId: `req_${id}`,
    message: { id, model, usage: { input_tokens: 10, output_tokens: output, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0, ...extra } },
  });
}

function buildRoot() {
  const root = mkdtempSync(join(tmpdir(), 'measure-'));
  const proj = join(root, 'c--my-project');
  mkdirSync(join(proj, 'session-1', 'subagents'), { recursive: true });
  // The same response written 3 times (one per content block), as Claude Code does.
  writeFileSync(join(proj, 'session-1.jsonl'), [
    response('msg_a', 'claude-opus-5-5', 100), response('msg_a', 'claude-opus-5-5', 100), response('msg_a', 'claude-opus-5-5', 100),
    response('msg_b', 'claude-opus-5-5', 50, '2026-10-29'),
    JSON.stringify({ type: 'user', message: { content: 'hi' } }),
    'broken line {',
  ].join('\n'));
  writeFileSync(join(proj, 'session-1', 'subagents', 'agent-x.jsonl'), response('msg_c', 'claude-sonnet-5-5', 400));
  writeFileSync(join(proj, 'session-1', 'subagents', 'agent-x.meta.json'), JSON.stringify({ agentType: 'Explore' }));
  return root;
}

test('finds the main session and the subagent with the type from .meta.json', () => {
  const ts = listTranscripts(buildRoot());
  assert.equal(ts.length, 2);
  assert.ok(ts.some(t => t.agent === 'main session'));
  assert.ok(ts.some(t => t.agent === 'subagent: Explore'));
});

test('counts each response once, even when written on several lines', () => {
  const t = listTranscripts(buildRoot()).find(t => t.agent === 'main session');
  const rs = readResponses(t);
  assert.equal(rs.length, 2);
  assert.equal(rs.reduce((s, r) => s + r.output, 0), 150);
});

test('filters by date', () => {
  const t = listTranscripts(buildRoot()).find(t => t.agent === 'main session');
  assert.equal(readResponses(t, { since: '2026-10-30' }).length, 1);
  assert.equal(readResponses(t, { until: '2026-10-29' }).length, 1);
});

test('filters by project', () => {
  assert.equal(listTranscripts(buildRoot(), 'other').length, 0);
  assert.equal(listTranscripts(buildRoot(), 'MY').length, 2);
});

test('cost uses the 1 h write price when the transcript carries the detail', () => {
  const base = { model: 'claude-opus-5-5', input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000 };
  assert.equal(cost({ ...base, cacheWrite1h: 0 }, prices), 5);
  assert.equal(cost({ ...base, cacheWrite1h: 1_000_000 }, prices), 8);
  assert.equal(cost({ ...base, model: 'new-model' }, prices), null);
});

test('groups by agent and computes each one\'s share', () => {
  const root = buildRoot();
  const rs = listTranscripts(root).flatMap(t => readResponses(t));
  const { list, total } = groupBy(rs, 'agent', prices);
  assert.equal(list.length, 2);
  const sum = list.reduce((s, g) => s + g.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(total > 0);
});

test('a missing folder does not break', () => {
  assert.deepEqual(listTranscripts(join(tmpdir(), 'does-not-exist-' + Date.now())), []);
});

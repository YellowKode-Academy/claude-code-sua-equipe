import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { evaluate, isSecretFile, commandReadsSecret } from '../.claude/hooks/rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(ROOT, '.claude', 'hooks');

// Runs the hook the way Claude Code runs it: JSON on stdin, exit code and stderr coming back.
function run(hook, input, env = {}) {
  const r = spawnSync(process.execPath, [join(HOOKS, hook)], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, error: r.stderr };
}

test('rules: destructive commands and the variations the "deny" rule does not catch', () => {
  for (const c of ['rm -rf /', 'rm -fr build', 'rm -r -f dist', 'rm -Rf ~', 'git push origin main --force', 'git push -f', 'git reset --hard HEAD~3',
    'docker volume prune', 'psql -c "DROP TABLE orders"', 'rsync -a --delete ./ server:/srv/app', 'mkfs.ext4 /dev/sdb']) {
    assert.ok(evaluate(c), `should block: ${c}`);
  }
});

test('rules: everyday commands pass', () => {
  for (const c of ['rm file.txt', 'rm -r empty-folder', 'git push origin main', 'git status', 'node --test tests/', 'npm run build', 'ls -la', 'grep -rf patterns.txt .']) {
    assert.equal(evaluate(c), null, `should not block: ${c}`);
  }
});

test('rules: secrets file and example file', () => {
  for (const f of ['.env', 'app/.env.production', 'C:\\proj\\key.pem', '/home/u/.ssh/id_ed25519', 'credentials.json']) assert.ok(isSecretFile(f), f);
  for (const f of ['.env.example', 'src/env.mjs', 'README.md', 'config/credentials.example']) assert.ok(!isSecretFile(f), f);
});

test('rules: command that would print a secret', () => {
  for (const c of ['cat .env', 'type .env', 'Get-Content .env', 'printenv', 'env | grep KEY', 'echo $OPENAI_API_KEY', 'Get-ChildItem Env:']) assert.ok(commandReadsSecret(c), c);
  for (const c of ['cat .env.example', 'node app.js', 'curl -H "Authorization: Bearer $API_TOKEN" https://x', 'echo done']) assert.ok(!commandReadsSecret(c), c);
});

test('hook block-destructive: exits with 2 and explains on stderr', () => {
  const r = run('block-destructive.mjs', { tool_name: 'Bash', tool_input: { command: 'rm -fr node_modules' } });
  assert.equal(r.code, 2);
  assert.match(r.error, /recursive forced rm/);
  assert.equal(run('block-destructive.mjs', { tool_name: 'Bash', tool_input: { command: 'npm test' } }).code, 0);
  assert.equal(run('block-destructive.mjs', { tool_name: 'Read', tool_input: { file_path: 'x' } }).code, 0);
});

test('hook protect-secrets: blocks Read of .env and cat .env', () => {
  assert.equal(run('protect-secrets.mjs', { tool_name: 'Read', tool_input: { file_path: 'C:\\proj\\.env' } }).code, 2);
  assert.equal(run('protect-secrets.mjs', { tool_name: 'Bash', tool_input: { command: 'cat .env' } }).code, 2);
  assert.equal(run('protect-secrets.mjs', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }).code, 0);
});

test('rules: destructive PowerShell and cmd (on Windows the agent uses PowerShell)', () => {
  for (const c of ['Remove-Item -Recurse -Force .\\trash', 'Remove-Item .\\trash -Force -Recurse', 'rm -r -fo trash', 'rd /s /q trash', 'rmdir /s /q C:\\proj', 'del /f /s /q *.*', 'Clear-Disk -Number 1']) {
    assert.ok(evaluate(c), `should block: ${c}`);
  }
  for (const c of ['Remove-Item file.txt', 'Get-ChildItem -Recurse', 'Test-Path trash', 'Remove-Item -Recurse empty-folder']) {
    assert.equal(evaluate(c), null, `should not block: ${c}`);
  }
});

test('rules: PowerShell that would print a secret', () => {
  for (const c of ['echo $env:OPENAI_API_KEY', 'Write-Output $env:GITHUB_TOKEN']) assert.ok(commandReadsSecret(c), c);
  assert.ok(!commandReadsSecret('Write-Output $env:PATH'));
});

test('hook block-destructive also sees the PowerShell tool', () => {
  assert.equal(run('block-destructive.mjs', { tool_name: 'PowerShell', tool_input: { command: 'Remove-Item -Recurse -Force trash' } }).code, 2);
  assert.equal(run('block-destructive.mjs', { tool_name: 'PowerShell', tool_input: { command: 'Get-ChildItem' } }).code, 0);
});

test('guard hook: empty stdin allows, unreadable stdin blocks (when in doubt, a guard blocks)', () => {
  const empty = spawnSync(process.execPath, [join(HOOKS, 'block-destructive.mjs')], { input: '', encoding: 'utf8' });
  assert.equal(empty.status, 0);
  const broken = spawnSync(process.execPath, [join(HOOKS, 'block-destructive.mjs')], { input: 'this is not json', encoding: 'utf8' });
  assert.equal(broken.status, 2);
});

test('guard hook: JSON with a BOM at the start is still read and blocked', () => {
  const dangerous = JSON.stringify({ tool_name: 'PowerShell', tool_input: { command: 'Remove-Item -Recurse -Force trash' } });
  const withBom = spawnSync(process.execPath, [join(HOOKS, 'block-destructive.mjs')], { input: '\uFEFF' + dangerous, encoding: 'utf8' });
  assert.equal(withBom.status, 2);
  assert.match(withBom.stderr, /recursive forced Remove-Item/);
  const withCrlf = spawnSync(process.execPath, [join(HOOKS, 'protect-secrets.mjs')], { input: '\uFEFF' + JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '.env' } }) + '\r\n', encoding: 'utf8' });
  assert.equal(withCrlf.status, 2);
});

test('hook tests-before-push: blocks the push when a test fails', () => {
  const proj = mkdtempSync(join(tmpdir(), 'push-'));
  for (const d of ['tests', 'app/tests']) spawnSync(process.execPath, ['-e', `require('fs').mkdirSync(${JSON.stringify(join(proj, d))},{recursive:true})`]);
  writeFileSync(join(proj, 'tests', 'fail.test.mjs'), "import {test} from 'node:test'; import a from 'node:assert'; test('x',()=>a.equal(1,2));");
  writeFileSync(join(proj, 'app', 'tests', 'ok.test.mjs'), "import {test} from 'node:test'; test('y',()=>{});");
  const r = run('tests-before-push.mjs', { tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.code, 2);
  assert.match(r.error, /tests failed/);
  assert.equal(run('tests-before-push.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' } }).code, 0);
});

test('hook log-usage: records the session usage from the transcript', () => {
  const proj = mkdtempSync(join(tmpdir(), 'usage-'));
  const transcript = join(proj, 'session.jsonl');
  const line = id => JSON.stringify({ type: 'assistant', timestamp: '2026-10-30T10:00:00Z', message: { id, model: 'claude-sonnet-5-5', usage: { input_tokens: 5, output_tokens: 70, cache_read_input_tokens: 900, cache_creation_input_tokens: 100 } } });
  writeFileSync(transcript, [line('m1'), line('m1'), line('m2')].join('\n'));
  const r = run('log-usage.mjs', { hook_event_name: 'Stop', session_id: 's1', transcript_path: transcript, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.code, 0);
  const log = join(proj, '.claude', 'logs', 'usage.jsonl');
  assert.ok(existsSync(log));
  const rec = JSON.parse(readFileSync(log, 'utf8').trim());
  assert.equal(rec.responses, 2);
  assert.equal(rec.output, 140);
  assert.deepEqual(rec.models, ['claude-sonnet-5-5']);
});

test('hook log-usage on SubagentStop: records the subagent type', () => {
  const proj = mkdtempSync(join(tmpdir(), 'usage-sub-'));
  const transcript = join(proj, 'agent-x.jsonl');
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', timestamp: '2026-10-30T10:00:00Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: { input_tokens: 3, output_tokens: 40, cache_read_input_tokens: 500, cache_creation_input_tokens: 0 } } }));
  const r = run('log-usage.mjs', { hook_event_name: 'SubagentStop', session_id: 's1', agent_type: 'researcher', transcript_path: transcript, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.code, 0);
  const rec = JSON.parse(readFileSync(join(proj, '.claude', 'logs', 'usage.jsonl'), 'utf8').trim());
  assert.equal(rec.event, 'SubagentStop');
  assert.equal(rec.agent, 'researcher');
  assert.deepEqual(rec.models, ['claude-haiku-5-5']);
});

test('statusline: shows model, context, cost and the full-context alert', () => {
  const r = spawnSync(process.execPath, [join(ROOT, '.claude', 'statusline.mjs')], {
    input: JSON.stringify({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: 81.4 }, cost: { total_cost_usd: 1.234 }, rate_limits: { five_hour: { used_percentage: 37 } } }),
    encoding: 'utf8',
  });
  assert.match(r.stdout, /\[Opus 5\.5\] context 81% \| US\$ 1\.23 \| 5h limit 37%/);
  assert.match(r.stdout, /context full/);
});

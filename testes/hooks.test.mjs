import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { avaliar, arquivoSecreto, comandoLeSegredo } from '../.claude/hooks/regras.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(RAIZ, '.claude', 'hooks');

// Roda o hook como o Claude Code roda: JSON no stdin, código de saída e stderr na volta.
function rodar(hook, entrada, env = {}) {
  const r = spawnSync(process.execPath, [join(HOOKS, hook)], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, ...env } });
  return { codigo: r.status, erro: r.stderr };
}

test('regras: comandos destrutivos e as variações que a regra "deny" não pega', () => {
  for (const c of ['rm -rf /', 'rm -fr build', 'rm -r -f dist', 'rm -Rf ~', 'git push origin main --force', 'git push -f', 'git reset --hard HEAD~3',
    'docker volume prune', 'psql -c "DROP TABLE pedidos"', 'rsync -a --delete ./ servidor:/srv/app', 'mkfs.ext4 /dev/sdb']) {
    assert.ok(avaliar(c), `devia barrar: ${c}`);
  }
});

test('regras: comandos do dia a dia passam', () => {
  for (const c of ['rm arquivo.txt', 'rm -r pasta-vazia', 'git push origin main', 'git status', 'node --test testes/', 'npm run build', 'ls -la', 'grep -rf padroes.txt .']) {
    assert.equal(avaliar(c), null, `não devia barrar: ${c}`);
  }
});

test('regras: arquivo de segredo e arquivo de exemplo', () => {
  for (const f of ['.env', 'app/.env.production', 'C:\\proj\\chave.pem', '/home/u/.ssh/id_ed25519', 'credentials.json']) assert.ok(arquivoSecreto(f), f);
  for (const f of ['.env.example', 'src/env.mjs', 'README.md', 'config/credentials.example']) assert.ok(!arquivoSecreto(f), f);
});

test('regras: comando que imprimiria segredo', () => {
  for (const c of ['cat .env', 'type .env', 'Get-Content .env', 'printenv', 'env | grep KEY', 'echo $OPENAI_API_KEY', 'Get-ChildItem Env:']) assert.ok(comandoLeSegredo(c), c);
  for (const c of ['cat .env.example', 'node app.js', 'curl -H "Authorization: Bearer $API_TOKEN" https://x', 'echo pronto']) assert.ok(!comandoLeSegredo(c), c);
});

test('hook barrar-destrutivos: sai com 2 e explica no stderr', () => {
  const r = rodar('barrar-destrutivos.mjs', { tool_name: 'Bash', tool_input: { command: 'rm -fr node_modules' } });
  assert.equal(r.codigo, 2);
  assert.match(r.erro, /rm recursivo e forçado/);
  assert.equal(rodar('barrar-destrutivos.mjs', { tool_name: 'Bash', tool_input: { command: 'npm test' } }).codigo, 0);
  assert.equal(rodar('barrar-destrutivos.mjs', { tool_name: 'Read', tool_input: { file_path: 'x' } }).codigo, 0);
});

test('hook proteger-segredos: barra Read de .env e cat .env', () => {
  assert.equal(rodar('proteger-segredos.mjs', { tool_name: 'Read', tool_input: { file_path: 'C:\\proj\\.env' } }).codigo, 2);
  assert.equal(rodar('proteger-segredos.mjs', { tool_name: 'Bash', tool_input: { command: 'cat .env' } }).codigo, 2);
  assert.equal(rodar('proteger-segredos.mjs', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }).codigo, 0);
});

test('regras: PowerShell e cmd destrutivos (no Windows o agente usa a PowerShell)', () => {
  for (const c of ['Remove-Item -Recurse -Force .\\lixo', 'Remove-Item .\\lixo -Force -Recurse', 'rm -r -fo lixo', 'rd /s /q lixo', 'rmdir /s /q C:\\proj', 'del /f /s /q *.*', 'Clear-Disk -Number 1']) {
    assert.ok(avaliar(c), `devia barrar: ${c}`);
  }
  for (const c of ['Remove-Item arquivo.txt', 'Get-ChildItem -Recurse', 'Test-Path lixo', 'Remove-Item -Recurse pasta-vazia']) {
    assert.equal(avaliar(c), null, `não devia barrar: ${c}`);
  }
});

test('regras: PowerShell que imprimiria segredo', () => {
  for (const c of ['echo $env:OPENAI_API_KEY', 'Write-Output $env:GITHUB_TOKEN']) assert.ok(comandoLeSegredo(c), c);
  assert.ok(!comandoLeSegredo('Write-Output $env:PATH'));
});

test('hook barrar-destrutivos também vê a ferramenta PowerShell', () => {
  assert.equal(rodar('barrar-destrutivos.mjs', { tool_name: 'PowerShell', tool_input: { command: 'Remove-Item -Recurse -Force lixo' } }).codigo, 2);
  assert.equal(rodar('barrar-destrutivos.mjs', { tool_name: 'PowerShell', tool_input: { command: 'Get-ChildItem' } }).codigo, 0);
});

test('hook de guarda: stdin vazio libera, stdin ilegível barra (na dúvida, um guarda barra)', () => {
  const vazio = spawnSync(process.execPath, [join(HOOKS, 'barrar-destrutivos.mjs')], { input: '', encoding: 'utf8' });
  assert.equal(vazio.status, 0);
  const quebrado = spawnSync(process.execPath, [join(HOOKS, 'barrar-destrutivos.mjs')], { input: 'isto não é json', encoding: 'utf8' });
  assert.equal(quebrado.status, 2);
});

test('hook de guarda: JSON com BOM no começo continua sendo lido e barrado', () => {
  const perigoso = JSON.stringify({ tool_name: 'PowerShell', tool_input: { command: 'Remove-Item -Recurse -Force lixo' } });
  const comBom = spawnSync(process.execPath, [join(HOOKS, 'barrar-destrutivos.mjs')], { input: '﻿' + perigoso, encoding: 'utf8' });
  assert.equal(comBom.status, 2);
  assert.match(comBom.stderr, /Remove-Item recursivo/);
  const comCrlf = spawnSync(process.execPath, [join(HOOKS, 'proteger-segredos.mjs')], { input: '﻿' + JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '.env' } }) + '\r\n', encoding: 'utf8' });
  assert.equal(comCrlf.status, 2);
});

test('hook testes-antes-do-push: barra o push quando um teste falha', () => {
  const proj = mkdtempSync(join(tmpdir(), 'push-'));
  for (const d of ['testes', 'app/testes']) spawnSync(process.execPath, ['-e', `require('fs').mkdirSync(${JSON.stringify(join(proj, d))},{recursive:true})`]);
  writeFileSync(join(proj, 'testes', 'falha.test.mjs'), "import {test} from 'node:test'; import a from 'node:assert'; test('x',()=>a.equal(1,2));");
  writeFileSync(join(proj, 'app', 'testes', 'ok.test.mjs'), "import {test} from 'node:test'; test('y',()=>{});");
  const r = rodar('testes-antes-do-push.mjs', { tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.codigo, 2);
  assert.match(r.erro, /testes falharam/);
  assert.equal(rodar('testes-antes-do-push.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' } }).codigo, 0);
});

test('hook registrar-uso: grava o uso da sessão a partir do transcript', () => {
  const proj = mkdtempSync(join(tmpdir(), 'uso-'));
  const transcript = join(proj, 'sessao.jsonl');
  const linha = id => JSON.stringify({ type: 'assistant', timestamp: '2026-10-30T10:00:00Z', message: { id, model: 'claude-sonnet-5-5', usage: { input_tokens: 5, output_tokens: 70, cache_read_input_tokens: 900, cache_creation_input_tokens: 100 } } });
  writeFileSync(transcript, [linha('m1'), linha('m1'), linha('m2')].join('\n'));
  const r = rodar('registrar-uso.mjs', { hook_event_name: 'Stop', session_id: 's1', transcript_path: transcript, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.codigo, 0);
  const log = join(proj, '.claude', 'logs', 'uso.jsonl');
  assert.ok(existsSync(log));
  const reg = JSON.parse(readFileSync(log, 'utf8').trim());
  assert.equal(reg.respostas, 2);
  assert.equal(reg.saida, 140);
  assert.deepEqual(reg.modelos, ['claude-sonnet-5-5']);
});

test('hook registrar-uso no SubagentStop: grava o tipo do subagente', () => {
  const proj = mkdtempSync(join(tmpdir(), 'uso-sub-'));
  const transcript = join(proj, 'agent-x.jsonl');
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', timestamp: '2026-10-30T10:00:00Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: { input_tokens: 3, output_tokens: 40, cache_read_input_tokens: 500, cache_creation_input_tokens: 0 } } }));
  const r = rodar('registrar-uso.mjs', { hook_event_name: 'SubagentStop', session_id: 's1', agent_type: 'pesquisador', transcript_path: transcript, cwd: proj }, { CLAUDE_PROJECT_DIR: proj });
  assert.equal(r.codigo, 0);
  const reg = JSON.parse(readFileSync(join(proj, '.claude', 'logs', 'uso.jsonl'), 'utf8').trim());
  assert.equal(reg.evento, 'SubagentStop');
  assert.equal(reg.agente, 'pesquisador');
  assert.deepEqual(reg.modelos, ['claude-haiku-5-5']);
});

test('statusline: mostra modelo, contexto, custo e alerta de contexto cheio', () => {
  const r = spawnSync(process.execPath, [join(RAIZ, '.claude', 'statusline.mjs')], {
    input: JSON.stringify({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: 81.4 }, cost: { total_cost_usd: 1.234 }, rate_limits: { five_hour: { used_percentage: 37 } } }),
    encoding: 'utf8',
  });
  assert.match(r.stdout, /\[Opus 5\.5\] contexto 81% \| US\$ 1\.23 \| limite 5h 37%/);
  assert.match(r.stdout, /contexto cheio/);
});

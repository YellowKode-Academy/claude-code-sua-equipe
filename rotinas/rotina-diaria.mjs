#!/usr/bin/env node
// Rotina que sobrevive à sessão: roda o Claude Code sem interface (claude -p) a partir
// do agendador do sistema (Agendador de Tarefas do Windows, cron) ou do GitHub Actions.
// Uma tarefa agendada DENTRO da sessão (/loop, CronCreate) para quando o Claude Code fecha.
//
// Uso:
//   node rotinas/rotina-diaria.mjs                      # usa o prompt padrão (checkup)
//   node rotinas/rotina-diaria.mjs --prompt "..." --modelo sonnet --claude <caminho>
//
// O que ela garante:
//   - grava o resultado de cada dia em rotinas/logs/AAAA-MM-DD.json e uma linha em historico.jsonl;
//   - sai com código 1 quando a rodada falha (falha silenciosa é o incidente mais caro);
//   - bateu em limite (429): grava rotinas/logs/pausa-ate.txt e as próximas rodadas esperam 24 h.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPT_PADRAO = 'Faça o checkup do projeto como na skill healthy: rode os testes, veja o git e o gasto de tokens dos últimos 7 dias. Responda com o veredito (verde, amarelo ou vermelho) na primeira linha e no máximo 8 linhas no total. Não edite nada.';

export function lerArgs(argv) {
  const a = { prompt: PROMPT_PADRAO, modelo: 'sonnet', claude: process.env.CLAUDE_BIN || 'claude', logs: join(RAIZ, 'rotinas', 'logs'), maxTurnos: '15' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'max-turnos') a.maxTurnos = argv[++i]; else a[k] = argv[++i];
  }
  return a;
}

export function pausaAtiva(logs, agora = new Date()) {
  const f = join(logs, 'pausa-ate.txt');
  if (!existsSync(f)) return null;
  const ate = new Date(readFileSync(f, 'utf8').trim());
  return ate > agora ? ate : null;
}

export function bateuEmLimite(d, stderr = '') {
  return d.api_error_status === 429 || /\b429\b|rate.?limit|usage limit/i.test(`${d.result ?? ''} ${stderr}`);
}

export function rodar(a, agora = new Date()) {
  mkdirSync(a.logs, { recursive: true });
  const ate = pausaAtiva(a.logs, agora);
  if (ate) return { status: 'pausada', ate: ate.toISOString(), codigo: 0 };

  // Um "claude" terminado em .mjs roda pelo node: é assim que os testes simulam o Claude Code sem gastar token.
  const [cmd, pre] = a.claude.endsWith('.mjs') ? [process.execPath, [a.claude]] : [a.claude, []];
  const r = spawnSync(cmd, [...pre, '-p', a.prompt, '--model', a.modelo, '--max-turns', a.maxTurnos, '--output-format', 'json'],
    { cwd: RAIZ, encoding: 'utf8', timeout: 900_000, maxBuffer: 50 * 1024 * 1024 });
  let d = {};
  try { d = JSON.parse(r.stdout || '{}'); } catch { d = { is_error: true, result: 'saída não era JSON' }; }

  const dia = agora.toISOString().slice(0, 10);
  writeFileSync(join(a.logs, `${dia}.json`), JSON.stringify(d, null, 2));
  const falhou = r.status !== 0 || d.is_error || !d.result;
  const registro = { quando: agora.toISOString(), ok: !falhou, custo: d.total_cost_usd ?? null, turnos: d.num_turns ?? null, primeiraLinha: String(d.result ?? '').split('\n')[0].slice(0, 120) };

  if (bateuEmLimite(d, r.stderr)) {
    const ate24 = new Date(agora.getTime() + 24 * 3600 * 1000);
    writeFileSync(join(a.logs, 'pausa-ate.txt'), ate24.toISOString());
    registro.pausaAte = ate24.toISOString();
  }
  appendFileSync(join(a.logs, 'historico.jsonl'), JSON.stringify(registro) + '\n');
  return { status: falhou ? 'falhou' : 'ok', codigo: falhou ? 1 : 0, registro };
}

if (process.argv[1] && basename(process.argv[1]) === 'rotina-diaria.mjs') {
  const res = rodar(lerArgs(process.argv.slice(2)));
  console.log(JSON.stringify(res));
  process.exit(res.codigo);
}

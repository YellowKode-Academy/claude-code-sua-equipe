#!/usr/bin/env node
// Experimento E2: revisão dos 3 módulos da livraria em paralelo (skill revisao-paralela,
// um subagente revisor por módulo) contra a sessão principal revisando um por vez.
//
// Uso (numa CÓPIA do repositório, sem bancada/gabarito e sem memoria/):
//   node bancada/e2-paralelo-x-sequencial.mjs --claude <caminho do claude> --repeticoes 2

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? a.concat([[v.slice(2), l[i + 1]]]) : a), []));
const CLAUDE = args.claude || 'claude';
const REPETICOES = Number(args.repeticoes || 2);
if (existsSync(join(RAIZ, 'bancada', 'gabarito')) || existsSync(join(RAIZ, 'memoria'))) {
  console.error('Rode numa cópia sem bancada/gabarito e sem memoria/.');
  process.exit(1);
}

const VARIANTES = [
  { nome: 'paralela', descricao: 'skill revisao-paralela, 1 revisor (Sonnet) por módulo', prompt: '/revisao-paralela app/src', extra: [] },
  {
    nome: 'sequencial', descricao: 'sessão principal sozinha, um módulo por vez',
    prompt: 'Revise os módulos de app/src um por vez (pedido.mjs, frete.mjs, cupom.mjs), cada um com os seus testes, procurando regra de negócio ambígua e caso de borda. Não use subagentes. Consolide numa tabela: módulo, achado, gravidade, prova. Separe o que é DECISÃO DO DONO. Não edite nada.',
    extra: ['--disallowedTools', 'Agent,Task'],
  },
];

mkdirSync(join(RAIZ, 'bancada', 'saidas'), { recursive: true });
const linhas = [];
for (const v of VARIANTES) {
  for (let i = 1; i <= REPETICOES; i++) {
    const t0 = Date.now();
    const r = spawnSync(CLAUDE, ['-p', v.prompt, '--model', 'opus', '--max-turns', '40', '--output-format', 'json', ...v.extra],
      { cwd: RAIZ, encoding: 'utf8', timeout: 1_200_000, maxBuffer: 1e8 });
    let d = {};
    try { d = JSON.parse(r.stdout); } catch { d = { erro: (r.stderr || '').slice(0, 400) }; }
    const segundos = Math.round((Date.now() - t0) / 1000);
    writeFileSync(join(RAIZ, 'bancada', 'saidas', `e2-${v.nome}-${i}.json`), JSON.stringify({ variante: v.nome, segundos, ...d }, null, 2));
    const porModelo = Object.entries(d.modelUsage || {}).map(([m, u]) => `${m.replace('claude-', '')}: US$ ${Number(u.costUSD ?? 0).toFixed(3)}`).join(' + ');
    linhas.push({ ...v, rodada: i, segundos, custo: d.total_cost_usd, turnos: d.num_turns, subtipo: d.subtype, porModelo });
    console.log(`${v.nome} #${i}: ${segundos}s | US$ ${d.total_cost_usd} | turnos ${d.num_turns} | ${d.subtype} | ${porModelo}`);
  }
}
const tabela = ['| Arranjo | Rodada | Segundos | Custo (US$) | Turnos | Resultado | Custo por modelo |', '|---|---:|---:|---:|---:|---|---|',
  ...linhas.map(l => `| ${l.nome} (${l.descricao}) | ${l.rodada} | ${l.segundos} | ${l.custo?.toFixed?.(4) ?? '?'} | ${l.turnos ?? '?'} | ${l.subtipo ?? '?'} | ${l.porModelo || '?'} |`)];
writeFileSync(join(RAIZ, 'bancada', 'E2.md'), `# E2: revisão paralela contra sequencial (${new Date().toISOString().slice(0, 10)})\n\n${tabela.join('\n')}\n\nConferir as respostas à mão em bancada/saidas/.\n`);

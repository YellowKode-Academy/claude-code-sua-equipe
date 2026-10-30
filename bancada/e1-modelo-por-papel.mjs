#!/usr/bin/env node
// Experimento E1: a mesma revisão feita por 4 arranjos de modelo.
// Mede o custo oficial (total_cost_usd do claude -p) e se as 2 armadilhas do app foram achadas.
//
// Uso (numa CÓPIA do repositório, sem bancada/gabarito e sem memoria/):
//   node bancada/e1-modelo-por-papel.mjs --claude <caminho do claude> --repeticoes 2
// Saídas: bancada/saidas/e1-*.json (cada rodada) e bancada/E1.md (resumo).

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? a.concat([[v.slice(2), l[i + 1]]]) : a), []));
const CLAUDE = args.claude || 'claude';
const REPETICOES = Number(args.repeticoes || 2);

if (existsSync(join(RAIZ, 'bancada', 'gabarito')) || existsSync(join(RAIZ, 'memoria'))) {
  console.error('Rode numa cópia sem bancada/gabarito e sem memoria/: os dois contam a resposta.');
  process.exit(1);
}

const TAREFA = 'Revise a pasta app/ (código em app/src, testes em app/testes). Liste as regras de negócio ambíguas e os casos de borda sem tratamento, cada um com arquivo:linha e o que pode dar errado. Não edite nada. Responda em no máximo 15 linhas.';
const SEM_SUBAGENTE = ['--disallowedTools', 'Agent,Task'];
const VARIANTES = [
  { nome: 'opus sozinho', flags: ['--model', 'opus', ...SEM_SUBAGENTE], prompt: TAREFA },
  { nome: 'opus delegando a leitura ao pesquisador (haiku)', flags: ['--model', 'opus'], prompt: `${TAREFA} Use o subagente pesquisador para ler os arquivos e trazer os trechos relevantes; você só analisa e responde.` },
  { nome: 'sonnet sozinho', flags: ['--model', 'sonnet', ...SEM_SUBAGENTE], prompt: TAREFA },
  { nome: 'haiku sozinho', flags: ['--model', 'haiku', ...SEM_SUBAGENTE], prompt: TAREFA },
];

// As 2 armadilhas do app (ver bancada/gabarito/ARMADILHAS.md no repositório original).
export function pontuar(texto = '') {
  const t = texto.toLowerCase();
  const frete = /frete/.test(t) && /(150|15000)/.test(t) && /(acima|a partir|>=|>|exatamente|igual)/.test(t);
  const cupom = /cupom|desconto|fixo/.test(t) && /(negativ|abaixo de zero|menor que zero|piso|< ?0)/.test(t);
  return { frete, cupom, achou: Number(frete) + Number(cupom) };
}

mkdirSync(join(RAIZ, 'bancada', 'saidas'), { recursive: true });
const linhas = [];
for (const v of VARIANTES) {
  for (let i = 1; i <= REPETICOES; i++) {
    const inicio = Date.now();
    const r = spawnSync(CLAUDE, ['-p', v.prompt, ...v.flags, '--max-turns', '25', '--output-format', 'json'], { cwd: RAIZ, encoding: 'utf8', timeout: 900_000, maxBuffer: 50 * 1024 * 1024 });
    let d = {};
    try { d = JSON.parse(r.stdout); } catch { d = { erro: r.stderr?.slice(0, 500) }; }
    const p = pontuar(d.result);
    const nomeArq = `e1-${v.nome.split(' ')[0]}-${v.nome.includes('delegando') ? 'delega' : 'so'}-${i}.json`;
    writeFileSync(join(RAIZ, 'bancada', 'saidas', nomeArq), JSON.stringify({ variante: v.nome, ...d }, null, 2));
    const mu = Object.entries(d.modelUsage || {}).map(([m, u]) => `${m.replace('claude-', '')}: US$ ${Number(u.costUSD ?? 0).toFixed(3)}`).join(' + ');
    linhas.push({ variante: v.nome, rodada: i, custo: d.total_cost_usd, turnos: d.num_turns, segundos: Math.round((Date.now() - inicio) / 1000), achou: p.achou, frete: p.frete, cupom: p.cupom, porModelo: mu, ok: !d.is_error });
    console.log(`${v.nome} #${i}: US$ ${d.total_cost_usd} | achou ${p.achou}/2 | ${linhas.at(-1).segundos}s | ${mu}`);
  }
}

const tabela = ['| Variante | Rodada | Custo (US$) | Achou (de 2) | Frete | Cupom | Turnos | Segundos | Custo por modelo |', '|---|---:|---:|---:|---|---|---:|---:|---|',
  ...linhas.map(l => `| ${l.variante} | ${l.rodada} | ${l.custo?.toFixed?.(4) ?? '?'} | ${l.achou} | ${l.frete ? 'sim' : 'não'} | ${l.cupom ? 'sim' : 'não'} | ${l.turnos ?? '?'} | ${l.segundos} | ${l.porModelo || '?'} |`)];
writeFileSync(join(RAIZ, 'bancada', 'E1.md'), `# E1: a mesma revisão, 4 arranjos de modelo (${new Date().toISOString().slice(0, 10)})\n\nTarefa: "${TAREFA}"\n\n${tabela.join('\n')}\n\nPontuação automática por palavras-chave; conferir à mão em bancada/saidas/.\n`);
console.log('\nResumo em bancada/E1.md');

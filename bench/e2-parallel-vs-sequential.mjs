#!/usr/bin/env node
// Experiment E2: review of the bookstore's 3 modules in parallel (parallel-review skill,
// one reviewer subagent per module) against the main session reviewing one at a time.
//
// Usage (in a COPY of the repository, without bench/answer-key and without memory/):
//   node bench/e2-parallel-vs-sequential.mjs --claude <path to claude> --repetitions 2

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? a.concat([[v.slice(2), l[i + 1]]]) : a), []));
const CLAUDE = args.claude || 'claude';
const REPETITIONS = Number(args.repetitions || 2);
if (existsSync(join(ROOT, 'bench', 'answer-key')) || existsSync(join(ROOT, 'memory'))) {
  console.error('Run in a copy without bench/answer-key and without memory/.');
  process.exit(1);
}

const VARIANTS = [
  { name: 'parallel', description: 'parallel-review skill, 1 reviewer (Sonnet) per module', prompt: '/parallel-review app/src', extra: [] },
  {
    name: 'sequential', description: 'main session alone, one module at a time',
    prompt: 'Review the modules in app/src one at a time (order.mjs, shipping.mjs, coupon.mjs), each with its tests, looking for ambiguous business rules and edge cases. Do not use subagents. Consolidate in a table: module, finding, severity, proof. Separate what is an OWNER DECISION. Do not edit anything.',
    extra: ['--disallowedTools', 'Agent,Task'],
  },
];

mkdirSync(join(ROOT, 'bench', 'outputs'), { recursive: true });
const rows = [];
for (const v of VARIANTS) {
  for (let i = 1; i <= REPETITIONS; i++) {
    const t0 = Date.now();
    const r = spawnSync(CLAUDE, ['-p', v.prompt, '--model', 'opus', '--max-turns', '40', '--output-format', 'json', ...v.extra],
      { cwd: ROOT, encoding: 'utf8', timeout: 1_200_000, maxBuffer: 1e8 });
    let d = {};
    try { d = JSON.parse(r.stdout); } catch { d = { error: (r.stderr || '').slice(0, 400) }; }
    const seconds = Math.round((Date.now() - t0) / 1000);
    writeFileSync(join(ROOT, 'bench', 'outputs', `e2-${v.name}-${i}.json`), JSON.stringify({ variant: v.name, seconds, ...d }, null, 2));
    const byModel = Object.entries(d.modelUsage || {}).map(([m, u]) => `${m.replace('claude-', '')}: US$ ${Number(u.costUSD ?? 0).toFixed(3)}`).join(' + ');
    rows.push({ ...v, run: i, seconds, cost: d.total_cost_usd, turns: d.num_turns, subtype: d.subtype, byModel });
    console.log(`${v.name} #${i}: ${seconds}s | US$ ${d.total_cost_usd} | turns ${d.num_turns} | ${d.subtype} | ${byModel}`);
  }
}
const table = ['| Arrangement | Run | Seconds | Cost (US$) | Turns | Result | Cost by model |', '|---|---:|---:|---:|---:|---|---|',
  ...rows.map(l => `| ${l.name} (${l.description}) | ${l.run} | ${l.seconds} | ${l.cost?.toFixed?.(4) ?? '?'} | ${l.turns ?? '?'} | ${l.subtype ?? '?'} | ${l.byModel || '?'} |`)];
writeFileSync(join(ROOT, 'bench', 'E2.md'), `# E2: parallel review against sequential (${new Date().toISOString().slice(0, 10)})\n\n${table.join('\n')}\n\nCheck the answers by hand in bench/outputs/.\n`);

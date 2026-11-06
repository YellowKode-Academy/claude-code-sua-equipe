#!/usr/bin/env node
// Experiment E1: the same review done by 4 model arrangements.
// Measures the official cost (total_cost_usd from claude -p) and whether the app's 2 traps were found.
//
// Usage (in a COPY of the repository, without bench/answer-key and without memory/):
//   node bench/e1-model-per-role.mjs --claude <path to claude> --repetitions 2
// Outputs: bench/outputs/e1-*.json (each run) and bench/E1.md (summary).

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? a.concat([[v.slice(2), l[i + 1]]]) : a), []));
const CLAUDE = args.claude || 'claude';
const REPETITIONS = Number(args.repetitions || 2);

if (existsSync(join(ROOT, 'bench', 'answer-key')) || existsSync(join(ROOT, 'memory'))) {
  console.error('Run in a copy without bench/answer-key and without memory/: both give away the answer.');
  process.exit(1);
}

const TASK = 'Review the app/ folder (code in app/src, tests in app/tests). List the ambiguous business rules and the unhandled edge cases, each with file:line and what could go wrong. Do not edit anything. Answer in at most 15 lines.';
const NO_SUBAGENT = ['--disallowedTools', 'Agent,Task'];
const VARIANTS = [
  { name: 'opus alone', flags: ['--model', 'opus', ...NO_SUBAGENT], prompt: TASK },
  { name: 'opus delegating reading to the researcher (haiku)', flags: ['--model', 'opus'], prompt: `${TASK} Use the researcher subagent to read the files and bring back the relevant excerpts; you only analyze and answer.` },
  { name: 'sonnet alone', flags: ['--model', 'sonnet', ...NO_SUBAGENT], prompt: TASK },
  { name: 'haiku alone', flags: ['--model', 'haiku', ...NO_SUBAGENT], prompt: TASK },
];

// The app's 2 traps (see bench/answer-key/TRAPS.md in the original repository).
export function score(text = '') {
  const t = text.toLowerCase();
  const shipping = /shipping/.test(t) && /(150|15000)/.test(t) && /(above|more than|from|at least|>=|>|exactly|equal)/.test(t);
  const coupon = /coupon|discount|fixed/.test(t) && /(negativ|below zero|less than zero|floor|< ?0)/.test(t);
  return { shipping, coupon, found: Number(shipping) + Number(coupon) };
}

mkdirSync(join(ROOT, 'bench', 'outputs'), { recursive: true });
const rows = [];
for (const v of VARIANTS) {
  for (let i = 1; i <= REPETITIONS; i++) {
    const start = Date.now();
    const r = spawnSync(CLAUDE, ['-p', v.prompt, ...v.flags, '--max-turns', '25', '--output-format', 'json'], { cwd: ROOT, encoding: 'utf8', timeout: 900_000, maxBuffer: 50 * 1024 * 1024 });
    let d = {};
    try { d = JSON.parse(r.stdout); } catch { d = { error: r.stderr?.slice(0, 500) }; }
    const p = score(d.result);
    const fileName = `e1-${v.name.split(' ')[0]}-${v.name.includes('delegating') ? 'delegates' : 'alone'}-${i}.json`;
    writeFileSync(join(ROOT, 'bench', 'outputs', fileName), JSON.stringify({ variant: v.name, ...d }, null, 2));
    const mu = Object.entries(d.modelUsage || {}).map(([m, u]) => `${m.replace('claude-', '')}: US$ ${Number(u.costUSD ?? 0).toFixed(3)}`).join(' + ');
    rows.push({ variant: v.name, run: i, cost: d.total_cost_usd, turns: d.num_turns, seconds: Math.round((Date.now() - start) / 1000), found: p.found, shipping: p.shipping, coupon: p.coupon, byModel: mu, ok: !d.is_error });
    console.log(`${v.name} #${i}: US$ ${d.total_cost_usd} | found ${p.found}/2 | ${rows.at(-1).seconds}s | ${mu}`);
  }
}

const table = ['| Variant | Run | Cost (US$) | Found (of 2) | Shipping | Coupon | Turns | Seconds | Cost by model |', '|---|---:|---:|---:|---|---|---:|---:|---|',
  ...rows.map(l => `| ${l.variant} | ${l.run} | ${l.cost?.toFixed?.(4) ?? '?'} | ${l.found} | ${l.shipping ? 'yes' : 'no'} | ${l.coupon ? 'yes' : 'no'} | ${l.turns ?? '?'} | ${l.seconds} | ${l.byModel || '?'} |`)];
writeFileSync(join(ROOT, 'bench', 'E1.md'), `# E1: the same review, 4 model arrangements (${new Date().toISOString().slice(0, 10)})\n\nTask: "${TASK}"\n\n${table.join('\n')}\n\nAutomatic keyword scoring; check by hand in bench/outputs/.\n`);
console.log('\nSummary in bench/E1.md');

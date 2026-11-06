#!/usr/bin/env node
// Routine that outlives the session: runs Claude Code without an interface (claude -p) from
// the system scheduler (Windows Task Scheduler, cron) or from GitHub Actions.
// A task scheduled INSIDE the session (/loop, CronCreate) stops when Claude Code closes.
//
// Usage:
//   node routines/daily-routine.mjs                      # uses the default prompt (checkup)
//   node routines/daily-routine.mjs --prompt "..." --model sonnet --claude <path>
//
// What it guarantees:
//   - writes each day's result to routines/logs/YYYY-MM-DD.json and one line to history.jsonl;
//   - exits with code 1 when the round fails (silent failure is the most expensive incident);
//   - hit a limit (429): writes routines/logs/paused-until.txt and the next rounds wait 24 h.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PROMPT = 'Do the project checkup as in the healthy skill: run the tests, check git and the token spend of the last 7 days. Answer with the verdict (green, yellow or red) on the first line and at most 8 lines in total. Do not edit anything.';

export function parseArgs(argv) {
  const a = { prompt: DEFAULT_PROMPT, model: 'sonnet', claude: process.env.CLAUDE_BIN || 'claude', logs: join(ROOT, 'routines', 'logs'), maxTurns: '15' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'max-turns') a.maxTurns = argv[++i]; else a[k] = argv[++i];
  }
  return a;
}

export function activePause(logs, now = new Date()) {
  const f = join(logs, 'paused-until.txt');
  if (!existsSync(f)) return null;
  const until = new Date(readFileSync(f, 'utf8').trim());
  return until > now ? until : null;
}

export function hitLimit(d, stderr = '') {
  return d.api_error_status === 429 || /\b429\b|rate.?limit|usage limit/i.test(`${d.result ?? ''} ${stderr}`);
}

export function run(a, now = new Date()) {
  mkdirSync(a.logs, { recursive: true });
  const until = activePause(a.logs, now);
  if (until) return { status: 'paused', until: until.toISOString(), code: 0 };

  // A "claude" ending in .mjs runs through node: that is how the tests simulate Claude Code without spending tokens.
  const [cmd, pre] = a.claude.endsWith('.mjs') ? [process.execPath, [a.claude]] : [a.claude, []];
  const r = spawnSync(cmd, [...pre, '-p', a.prompt, '--model', a.model, '--max-turns', a.maxTurns, '--output-format', 'json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 900_000, maxBuffer: 50 * 1024 * 1024 });
  let d = {};
  try { d = JSON.parse(r.stdout || '{}'); } catch { d = { is_error: true, result: 'output was not JSON' }; }

  const day = now.toISOString().slice(0, 10);
  writeFileSync(join(a.logs, `${day}.json`), JSON.stringify(d, null, 2));
  const failed = r.status !== 0 || d.is_error || !d.result;
  const record = { when: now.toISOString(), ok: !failed, cost: d.total_cost_usd ?? null, turns: d.num_turns ?? null, firstLine: String(d.result ?? '').split('\n')[0].slice(0, 120) };

  if (hitLimit(d, r.stderr)) {
    const until24 = new Date(now.getTime() + 24 * 3600 * 1000);
    writeFileSync(join(a.logs, 'paused-until.txt'), until24.toISOString());
    record.pausedUntil = until24.toISOString();
  }
  appendFileSync(join(a.logs, 'history.jsonl'), JSON.stringify(record) + '\n');
  return { status: failed ? 'failed' : 'ok', code: failed ? 1 : 0, record };
}

if (process.argv[1] && basename(process.argv[1]) === 'daily-routine.mjs') {
  const res = run(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(res));
  process.exit(res.code);
}

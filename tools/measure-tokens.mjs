#!/usr/bin/env node
// Claude Code token meter: reads the local transcripts and adds up usage
// by model, by agent type, by day, by session or by project.
//
// Usage:
//   node tools/measure-tokens.mjs                       # everything, grouped by model
//   node tools/measure-tokens.mjs --by agent --since 2026-10-01
//   node tools/measure-tokens.mjs --project my-repo --by day --json
//
// Options:
//   --dir <folder>      transcripts root (default: ~/.claude/projects)
//   --project <text>    only project folders whose name contains the text
//   --since YYYY-MM-DD  only responses from that date on (UTC)
//   --until YYYY-MM-DD  only responses up to that date, inclusive (UTC)
//   --by <key>          model | agent | day | session | project  (default: model)
//   --prices <file>     price table in US$ per million tokens (default: tools/prices.json)
//   --json              print JSON instead of a table
//
// A trap the meter already handles: Claude Code writes the SAME response on several
// transcript lines (one per content block), all with the same "usage".
// Adding line by line counts double or more. Here each response counts once,
// by message.id.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const a = { dir: join(homedir(), '.claude', 'projects'), by: 'model', prices: join(HERE, 'prices.json'), json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--json') a.json = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

// Lists the transcripts: main sessions (<project>/<session>.jsonl) and
// subagents (<project>/<session>/subagents/agent-*.jsonl, with .meta.json next to it).
export function listTranscripts(root, projectFilter) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const project of readdirSync(root)) {
    const pp = join(root, project);
    if (!statSync(pp).isDirectory()) continue;
    if (projectFilter && !project.toLowerCase().includes(projectFilter.toLowerCase())) continue;
    for (const item of readdirSync(pp)) {
      const ip = join(pp, item);
      if (item.endsWith('.jsonl')) {
        out.push({ file: ip, project, session: item.replace(/\.jsonl$/, ''), agent: 'main session' });
      } else if (statSync(ip).isDirectory() && existsSync(join(ip, 'subagents'))) {
        for (const s of readdirSync(join(ip, 'subagents'))) {
          if (!s.endsWith('.jsonl')) continue;
          const meta = join(ip, 'subagents', s.replace(/\.jsonl$/, '.meta.json'));
          let agent = 'subagent';
          if (existsSync(meta)) {
            try { agent = JSON.parse(readFileSync(meta, 'utf8')).agentType || agent; } catch { /* unreadable meta: keep the generic name */ }
          }
          out.push({ file: join(ip, 'subagents', s), project, session: item, agent: `subagent: ${agent}` });
        }
      }
    }
  }
  return out;
}

// Reads a transcript and returns one entry per unique model response.
export function readResponses(t, { since, until } = {}) {
  const seen = new Set();
  const responses = [];
  for (const line of readFileSync(t.file, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const m = o.message;
    if (o.type !== 'assistant' || !m || !m.usage) continue;
    const id = m.id || o.requestId || o.uuid;
    if (seen.has(id)) continue;
    seen.add(id);
    const day = (o.timestamp || '').slice(0, 10);
    if (since && day < since) continue;
    if (until && day > until) continue;
    const u = m.usage;
    const write = u.cache_creation_input_tokens || 0;
    // Cache writes have two prices (5 min and 1 h). Without the detail, it counts as 5 min.
    const w1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
    responses.push({
      project: t.project, session: t.session, agent: t.agent, day,
      model: m.model || 'unknown',
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      cacheWrite: write,
      cacheWrite1h: Math.min(w1h, write),
    });
  }
  return responses;
}

// Price per million tokens. The key is a piece of the model name ("opus", "sonnet"...).
export function priceOf(model, prices) {
  const key = Object.keys(prices).find(k => !k.startsWith('_') && model.includes(k));
  return key ? prices[key] : null;
}

export function cost(r, prices) {
  const p = priceOf(r.model, prices);
  if (!p) return null;
  const w1h = r.cacheWrite1h || 0;
  const w5m = r.cacheWrite - w1h;
  return (r.input * p.input + r.output * p.output + r.cacheRead * p.cacheRead
    + w5m * p.cacheWrite5m + w1h * p.cacheWrite1h) / 1e6;
}

export function groupBy(responses, by, prices) {
  const groups = new Map();
  for (const r of responses) {
    const k = { model: r.model, agent: r.agent, day: r.day, session: r.session, project: r.project }[by] ?? r.model;
    const g = groups.get(k) || { key: k, responses: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, noPrice: 0 };
    g.responses++;
    g.input += r.input; g.output += r.output; g.cacheRead += r.cacheRead; g.cacheWrite += r.cacheWrite;
    const c = cost(r, prices);
    if (c === null) g.noPrice++; else g.cost += c;
    groups.set(k, g);
  }
  const list = [...groups.values()].sort((a, b) => b.cost - a.cost || b.output - a.output);
  const total = list.reduce((s, g) => s + g.cost, 0);
  for (const g of list) g.share = total > 0 ? g.cost / total : 0;
  return { list, total };
}

const fmt = n => n.toLocaleString('en-US');

function printTable({ list, total }, by) {
  console.log(`${by.padEnd(38)} ${'responses'.padStart(9)} ${'output'.padStart(11)} ${'cache read'.padStart(13)} ${'cache write'.padStart(13)} ${'est. US$'.padStart(9)} ${'share'.padStart(6)}`);
  for (const g of list) {
    const name = String(g.key).slice(0, 38).padEnd(38);
    const price = g.noPrice === g.responses ? '  no price' : g.cost.toFixed(2).padStart(9);
    console.log(`${name} ${fmt(g.responses).padStart(9)} ${fmt(g.output).padStart(11)} ${fmt(g.cacheRead).padStart(13)} ${fmt(g.cacheWrite).padStart(13)} ${price} ${(g.share * 100).toFixed(0).padStart(5)}%`);
  }
  console.log(`\nEstimated total: US$ ${total.toFixed(2)} (API price; on a subscription plan this shows the weight of each part, not your bill)`);
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const prices = existsSync(a.prices) ? JSON.parse(readFileSync(a.prices, 'utf8')) : {};
  const responses = listTranscripts(a.dir, a.project).flatMap(t => readResponses(t, a));
  const result = groupBy(responses, a.by, prices);
  if (a.json) console.log(JSON.stringify(result, null, 2));
  else if (!responses.length) console.log(`No responses found in ${a.dir}.`);
  else printTable(result, a.by);
  return result;
}

if (process.argv[1] && basename(process.argv[1]) === 'measure-tokens.mjs') main();

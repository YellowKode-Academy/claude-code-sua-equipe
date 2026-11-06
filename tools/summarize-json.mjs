#!/usr/bin/env node
// JSON summarizer: the big data goes to a file and only the useful fields
// come back into the agent's context.
//
// Usage:
//   node tools/summarize-json.mjs output.json --fields id,status,customer.name --limit 20
//   curl -s https://api.example/items | node tools/summarize-json.mjs - --list data --fields id,total
//
// Options:
//   <file> | -          JSON file, or "-" to read from standard input
//   --list <path>       where the list is inside the JSON (e.g. data.items); without it, uses the root
//   --fields a,b.c      fields to keep from each item (dotted path)
//   --limit N           maximum number of items (default 20)
//   --count <field>     instead of listing, count how many items there are per value of the field
//
// At the end, prints how many characters came in and how many went out, so you can see what you saved.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function summarize(data, { list, fields, limit = 20, count } = {}) {
  let items = list ? pick(data, list) : data;
  if (!Array.isArray(items)) items = [items];
  if (count) {
    const c = {};
    for (const it of items) {
      const v = String(pick(it, count));
      c[v] = (c[v] || 0) + 1;
    }
    return { total: items.length, by: c };
  }
  const chosen = items.slice(0, limit).map(it => {
    if (!fields) return it;
    const r = {};
    for (const c of fields) r[c] = pick(it, c);
    return r;
  });
  return { total: items.length, showing: chosen.length, items: chosen };
}

export function parseArgs(argv) {
  const a = { limit: 20 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--fields') a.fields = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--limit') a.limit = Number(argv[++i]);
    else if (k === '--list') a.list = argv[++i];
    else if (k === '--count') a.count = argv[++i];
    else a.file = k;
  }
  return a;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const raw = readFileSync(!a.file || a.file === '-' ? 0 : a.file, 'utf8');
  const out = JSON.stringify(summarize(JSON.parse(raw), a), null, 1);
  console.log(out);
  console.error(`[summarize-json] input: ${raw.length.toLocaleString('en-US')} characters; output: ${out.length.toLocaleString('en-US')}`);
}

if (process.argv[1] && basename(process.argv[1]) === 'summarize-json.mjs') main();

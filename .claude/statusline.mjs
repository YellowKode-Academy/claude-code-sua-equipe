// Status line: model, how much of the context is used and the estimated cost of the session.
// Watching the context fill up is the best reminder to use /compact or open a new session.
import { readFileSync } from 'node:fs';

let d = {};
try { d = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* empty input: show what we can */ }
const model = d.model?.display_name || d.model?.id || 'model?';
const ctx = Math.round(d.context_window?.used_percentage ?? 0);
const cost = Number(d.cost?.total_cost_usd ?? 0).toFixed(2);
const limit = d.rate_limits?.five_hour?.used_percentage;
const alert = ctx >= 70 ? ' [!] context full: /compact or new session' : '';
process.stdout.write(`[${model}] context ${ctx}% | US$ ${cost}${limit != null ? ` | 5h limit ${Math.round(limit)}%` : ''}${alert}`);

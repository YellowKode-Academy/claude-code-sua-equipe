// Stop and SubagentStop: on every final response, records how much the session has spent so far.
// It is the "measure tokens per task" that almost nobody does, without depending on remembering.
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readInput, allow } from './lib.mjs';
import { readResponses } from '../../tools/measure-tokens.mjs';

const e = readInput() || {};
if (e.transcript_path && existsSync(e.transcript_path)) {
  const rs = readResponses({ file: e.transcript_path, project: '', session: e.session_id, agent: e.agent_type || 'main session' });
  const sum = k => rs.reduce((s, r) => s + r[k], 0);
  const root = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
  const target = join(root, '.claude', 'logs', 'usage.jsonl');
  mkdirSync(dirname(target), { recursive: true });
  appendFileSync(target, JSON.stringify({
    when: new Date().toISOString(), event: e.hook_event_name, session: e.session_id,
    agent: e.agent_type || 'main session', responses: rs.length,
    output: sum('output'), cacheRead: sum('cacheRead'), cacheWrite: sum('cacheWrite'),
    models: [...new Set(rs.map(r => r.model))],
  }) + '\n');
}
allow();

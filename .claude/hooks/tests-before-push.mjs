// PreToolUse (Bash and PowerShell): before any "git push", runs the tests.
// Red test = push blocked. It is the written rule turned into code.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readInputOrBlock, block, allow } from './lib.mjs';

const e = readInputOrBlock();
const command = e.tool_input?.command || '';
if (!['Bash', 'PowerShell'].includes(e.tool_name) || !/\bgit\s+push\b/.test(command)) allow();

const root = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
const r = spawnSync(process.execPath, ['--test', 'tests/', 'app/tests/'], { cwd: root, encoding: 'utf8', timeout: 120_000 });
if (r.status !== 0) {
  // Check the exit code, never just the text: an "&&" masked by a pipe once let a broken push through.
  const summary = (r.stdout + r.stderr).split('\n').filter(l => /^# (tests|pass|fail)|not ok/.test(l)).slice(0, 12).join('\n');
  block(`Blocked by the tests-before-push hook: the tests failed (code ${r.status}).\n${summary}`);
}
allow();

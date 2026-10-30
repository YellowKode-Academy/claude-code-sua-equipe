// PreToolUse (Bash): antes de qualquer "git push", roda os testes.
// Teste vermelho = push barrado. É a regra escrita que virou código.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { lerEntrada, barrar, liberar } from './lib.mjs';

const e = lerEntrada();
const comando = e.tool_input?.command || '';
if (!['Bash', 'PowerShell'].includes(e.tool_name) ||!/\bgit\s+push\b/.test(comando)) liberar();

const raiz = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
const r = spawnSync(process.execPath, ['--test', 'testes/', 'app/testes/'], { cwd: raiz, encoding: 'utf8', timeout: 120_000 });
if (r.status !== 0) {
  // Confere o código de saída, nunca só o texto: "&&" mascarado por um pipe já deixou passar push quebrado.
  const resumo = (r.stdout + r.stderr).split('\n').filter(l => /^# (tests|pass|fail)|not ok/.test(l)).slice(0, 12).join('\n');
  barrar(`Bloqueado pelo hook testes-antes-do-push: os testes falharam (código ${r.status}).\n${resumo}`);
}
liberar();

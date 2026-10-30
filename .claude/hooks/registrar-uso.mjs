// Stop e SubagentStop: a cada resposta final, grava quanto a sessão já gastou.
// É o "medir token por tarefa" que quase ninguém faz, sem depender de lembrar.
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { lerEntrada, liberar } from './lib.mjs';
import { lerRespostas } from '../../ferramentas/medir-tokens.mjs';

const e = lerEntrada() || {};
if (e.transcript_path && existsSync(e.transcript_path)) {
  const rs = lerRespostas({ arquivo: e.transcript_path, projeto: '', sessao: e.session_id, agente: e.agent_type || 'sessão principal' });
  const soma = k => rs.reduce((s, r) => s + r[k], 0);
  const raiz = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
  const destino = join(raiz, '.claude', 'logs', 'uso.jsonl');
  mkdirSync(dirname(destino), { recursive: true });
  appendFileSync(destino, JSON.stringify({
    quando: new Date().toISOString(), evento: e.hook_event_name, sessao: e.session_id,
    agente: e.agent_type || 'sessão principal', respostas: rs.length,
    saida: soma('saida'), cacheLeitura: soma('cacheLeitura'), cacheEscrita: soma('cacheEscrita'),
    modelos: [...new Set(rs.map(r => r.modelo))],
  }) + '\n');
}
liberar();

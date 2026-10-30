// Funções comuns aos hooks. O Claude Code manda um JSON pelo stdin;
// para barrar uma chamada de ferramenta, o hook sai com código 2 e explica no stderr.
import { readFileSync } from 'node:fs';

export function lerEntrada() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

export function barrar(motivo) {
  process.stderr.write(`${motivo}\n`);
  process.exit(2);
}

export function liberar() {
  process.exit(0);
}

// Funções comuns aos hooks. O Claude Code manda um JSON pelo stdin;
// para barrar uma chamada de ferramenta, o hook sai com código 2 e explica no stderr.
import { readFileSync } from 'node:fs';

// Devolve o objeto lido, {} quando o stdin vem vazio, ou null quando há texto que não é JSON.
// O BOM (U+FEFF) que o Windows às vezes põe no começo é removido antes: sem isso o JSON.parse
// falha e um hook de guarda que "libera na dúvida" deixaria passar o comando perigoso.
export function lerEntrada(texto) {
  let bruto = texto;
  if (bruto === undefined) {
    try { bruto = readFileSync(0, 'utf8'); } catch { bruto = ''; }
  }
  bruto = bruto.replace(/^\uFEFF/, '').trim();
  if (!bruto) return {};
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

// Hook de guarda: entrada ilegível é motivo para barrar, nunca para liberar.
export function lerEntradaOuBarrar() {
  const e = lerEntrada();
  if (e === null) barrar('Bloqueado: o hook não conseguiu ler a chamada da ferramenta. Na dúvida, um guarda barra.');
  return e;
}

export function barrar(motivo) {
  process.stderr.write(`${motivo}\n`);
  process.exit(2);
}

export function liberar() {
  process.exit(0);
}

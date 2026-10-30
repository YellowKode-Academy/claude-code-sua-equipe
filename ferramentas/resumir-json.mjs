#!/usr/bin/env node
// Resumidor de JSON: o dado grande vai para um arquivo e só os campos úteis
// voltam para o contexto do agente.
//
// Uso:
//   node ferramentas/resumir-json.mjs saida.json --campos id,status,cliente.nome --limite 20
//   curl -s https://api.exemplo/itens | node ferramentas/resumir-json.mjs - --lista data --campos id,total
//
// Opções:
//   <arquivo> | -       arquivo JSON, ou "-" para ler da entrada padrão
//   --lista <caminho>   onde está a lista dentro do JSON (ex.: data.items); sem isso, usa a raiz
//   --campos a,b.c      campos a manter de cada item (caminho com ponto)
//   --limite N          máximo de itens (padrão 20)
//   --contar <campo>    em vez de listar, conta quantos itens há por valor do campo
//
// No fim, imprime quantos caracteres entraram e quantos saíram, para você ver o que economizou.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export function pegar(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function resumir(dado, { lista, campos, limite = 20, contar } = {}) {
  let itens = lista ? pegar(dado, lista) : dado;
  if (!Array.isArray(itens)) itens = [itens];
  if (contar) {
    const c = {};
    for (const it of itens) {
      const v = String(pegar(it, contar));
      c[v] = (c[v] || 0) + 1;
    }
    return { total: itens.length, por: c };
  }
  const escolhidos = itens.slice(0, limite).map(it => {
    if (!campos) return it;
    const r = {};
    for (const c of campos) r[c] = pegar(it, c);
    return r;
  });
  return { total: itens.length, mostrando: escolhidos.length, itens: escolhidos };
}

export function lerArgs(argv) {
  const a = { limite: 20 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--campos') a.campos = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--limite') a.limite = Number(argv[++i]);
    else if (k === '--lista') a.lista = argv[++i];
    else if (k === '--contar') a.contar = argv[++i];
    else a.arquivo = k;
  }
  return a;
}

export function principal(argv = process.argv.slice(2)) {
  const a = lerArgs(argv);
  const bruto = readFileSync(!a.arquivo || a.arquivo === '-' ? 0 : a.arquivo, 'utf8');
  const saida = JSON.stringify(resumir(JSON.parse(bruto), a), null, 1);
  console.log(saida);
  console.error(`[resumir-json] entrada: ${bruto.length.toLocaleString('pt-BR')} caracteres; saída: ${saida.length.toLocaleString('pt-BR')}`);
}

if (process.argv[1] && basename(process.argv[1]) === 'resumir-json.mjs') principal();

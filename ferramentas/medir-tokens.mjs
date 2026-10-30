#!/usr/bin/env node
// Medidor de tokens do Claude Code: lê os transcripts locais e soma o uso
// por modelo, por tipo de agente, por dia, por sessão ou por projeto.
//
// Uso:
//   node ferramentas/medir-tokens.mjs                       # tudo, agrupado por modelo
//   node ferramentas/medir-tokens.mjs --por agente --desde 2026-10-01
//   node ferramentas/medir-tokens.mjs --projeto meu-repo --por dia --json
//
// Opções:
//   --dir <pasta>       raiz dos transcripts (padrão: ~/.claude/projects)
//   --projeto <texto>   só pastas de projeto cujo nome contém o texto
//   --desde AAAA-MM-DD  só respostas a partir dessa data (UTC)
//   --ate AAAA-MM-DD    só respostas até essa data, inclusive (UTC)
//   --por <chave>       modelo | agente | dia | sessao | projeto  (padrão: modelo)
//   --precos <arquivo>  tabela de preço em US$ por milhão de tokens (padrão: ferramentas/precos.json)
//   --json              imprime JSON em vez de tabela
//
// Cuidado que o medidor já trata: o Claude Code grava a MESMA resposta em várias
// linhas do transcript (uma por bloco de conteúdo), todas com o mesmo "usage".
// Somar linha a linha conta o dobro ou mais. Aqui cada resposta conta uma vez,
// pelo message.id.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

export function lerArgs(argv) {
  const a = { dir: join(homedir(), '.claude', 'projects'), por: 'modelo', precos: join(AQUI, 'precos.json'), json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--json') a.json = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

// Lista os transcripts: sessões principais (<projeto>/<sessao>.jsonl) e
// subagentes (<projeto>/<sessao>/subagents/agent-*.jsonl, com .meta.json ao lado).
export function listarTranscripts(raiz, filtroProjeto) {
  const saida = [];
  if (!existsSync(raiz)) return saida;
  for (const projeto of readdirSync(raiz)) {
    const pp = join(raiz, projeto);
    if (!statSync(pp).isDirectory()) continue;
    if (filtroProjeto && !projeto.toLowerCase().includes(filtroProjeto.toLowerCase())) continue;
    for (const item of readdirSync(pp)) {
      const ip = join(pp, item);
      if (item.endsWith('.jsonl')) {
        saida.push({ arquivo: ip, projeto, sessao: item.replace(/\.jsonl$/, ''), agente: 'sessão principal' });
      } else if (statSync(ip).isDirectory() && existsSync(join(ip, 'subagents'))) {
        for (const s of readdirSync(join(ip, 'subagents'))) {
          if (!s.endsWith('.jsonl')) continue;
          const meta = join(ip, 'subagents', s.replace(/\.jsonl$/, '.meta.json'));
          let agente = 'subagente';
          if (existsSync(meta)) {
            try { agente = JSON.parse(readFileSync(meta, 'utf8')).agentType || agente; } catch { /* meta ilegível: fica o genérico */ }
          }
          saida.push({ arquivo: join(ip, 'subagents', s), projeto, sessao: item, agente: `subagente: ${agente}` });
        }
      }
    }
  }
  return saida;
}

// Lê um transcript e devolve uma entrada por resposta única do modelo.
export function lerRespostas(t, { desde, ate } = {}) {
  const vistas = new Set();
  const respostas = [];
  for (const linha of readFileSync(t.arquivo, 'utf8').split('\n')) {
    if (!linha.includes('"usage"')) continue;
    let o;
    try { o = JSON.parse(linha); } catch { continue; }
    const m = o.message;
    if (o.type !== 'assistant' || !m || !m.usage) continue;
    const id = m.id || o.requestId || o.uuid;
    if (vistas.has(id)) continue;
    vistas.add(id);
    const dia = (o.timestamp || '').slice(0, 10);
    if (desde && dia < desde) continue;
    if (ate && dia > ate) continue;
    const u = m.usage;
    const escrita = u.cache_creation_input_tokens || 0;
    // A escrita de cache tem dois preços (5 min e 1 h). Sem o detalhe, conta como 5 min.
    const e1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
    respostas.push({
      projeto: t.projeto, sessao: t.sessao, agente: t.agente, dia,
      modelo: m.model || 'desconhecido',
      entrada: u.input_tokens || 0,
      saida: u.output_tokens || 0,
      cacheLeitura: u.cache_read_input_tokens || 0,
      cacheEscrita: escrita,
      cacheEscrita1h: Math.min(e1h, escrita),
    });
  }
  return respostas;
}

// Preço por milhão de tokens. A chave é um trecho do nome do modelo ("opus", "sonnet"...).
export function precoDe(modelo, precos) {
  const chave = Object.keys(precos).find(k => !k.startsWith('_') && modelo.includes(k));
  return chave ? precos[chave] : null;
}

export function custo(r, precos) {
  const p = precoDe(r.modelo, precos);
  if (!p) return null;
  const e1h = r.cacheEscrita1h || 0;
  const e5m = r.cacheEscrita - e1h;
  return (r.entrada * p.entrada + r.saida * p.saida + r.cacheLeitura * p.cacheLeitura
    + e5m * p.cacheEscrita5m + e1h * p.cacheEscrita1h) / 1e6;
}

export function agrupar(respostas, por, precos) {
  const grupos = new Map();
  for (const r of respostas) {
    const k = { modelo: r.modelo, agente: r.agente, dia: r.dia, sessao: r.sessao, projeto: r.projeto }[por] ?? r.modelo;
    const g = grupos.get(k) || { chave: k, respostas: 0, entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0, custo: 0, semPreco: 0 };
    g.respostas++;
    g.entrada += r.entrada; g.saida += r.saida; g.cacheLeitura += r.cacheLeitura; g.cacheEscrita += r.cacheEscrita;
    const c = custo(r, precos);
    if (c === null) g.semPreco++; else g.custo += c;
    grupos.set(k, g);
  }
  const lista = [...grupos.values()].sort((a, b) => b.custo - a.custo || b.saida - a.saida);
  const total = lista.reduce((s, g) => s + g.custo, 0);
  for (const g of lista) g.fatia = total > 0 ? g.custo / total : 0;
  return { lista, total };
}

const fmt = n => n.toLocaleString('pt-BR');

function imprimirTabela({ lista, total }, por) {
  console.log(`${por.padEnd(38)} ${'respostas'.padStart(9)} ${'saída'.padStart(11)} ${'cache lido'.padStart(13)} ${'cache escrito'.padStart(13)} ${'US$ est.'.padStart(9)} ${'fatia'.padStart(6)}`);
  for (const g of lista) {
    const nome = String(g.chave).slice(0, 38).padEnd(38);
    const preco = g.semPreco === g.respostas ? '   s/ preço' : g.custo.toFixed(2).padStart(9);
    console.log(`${nome} ${fmt(g.respostas).padStart(9)} ${fmt(g.saida).padStart(11)} ${fmt(g.cacheLeitura).padStart(13)} ${fmt(g.cacheEscrita).padStart(13)} ${preco} ${(g.fatia * 100).toFixed(0).padStart(5)}%`);
  }
  console.log(`\nTotal estimado: US$ ${total.toFixed(2)} (preço de API; no plano de assinatura isso mostra o peso de cada parte, não a sua fatura)`);
}

export function principal(argv = process.argv.slice(2)) {
  const a = lerArgs(argv);
  const precos = existsSync(a.precos) ? JSON.parse(readFileSync(a.precos, 'utf8')) : {};
  const respostas = listarTranscripts(a.dir, a.projeto).flatMap(t => lerRespostas(t, a));
  const resultado = agrupar(respostas, a.por, precos);
  if (a.json) console.log(JSON.stringify(resultado, null, 2));
  else if (!respostas.length) console.log(`Nenhuma resposta encontrada em ${a.dir}.`);
  else imprimirTabela(resultado, a.por);
  return resultado;
}

if (process.argv[1] && basename(process.argv[1]) === 'medir-tokens.mjs') principal();

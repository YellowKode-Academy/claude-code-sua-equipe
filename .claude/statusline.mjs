// Linha de status: modelo, quanto do contexto está ocupado e o custo estimado da sessão.
// Ver o contexto encher é o melhor lembrete para usar /compact ou abrir sessão nova.
import { readFileSync } from 'node:fs';

let d = {};
try { d = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* entrada vazia: mostra o que der */ }
const modelo = d.model?.display_name || d.model?.id || 'modelo?';
const ctx = Math.round(d.context_window?.used_percentage ?? 0);
const custo = Number(d.cost?.total_cost_usd ?? 0).toFixed(2);
const limite = d.rate_limits?.five_hour?.used_percentage;
const alerta = ctx >= 70 ? ' [!] contexto cheio: /compact ou sessão nova' : '';
process.stdout.write(`[${modelo}] contexto ${ctx}% | US$ ${custo}${limite != null ? ` | limite 5h ${Math.round(limite)}%` : ''}${alerta}`);

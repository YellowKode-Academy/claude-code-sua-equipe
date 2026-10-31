#!/usr/bin/env node
// Gera um JSON de pedidos parecido com o que uma API de loja devolve: cliente com endereço,
// itens e histórico de eventos. Sempre o mesmo arquivo para o mesmo número de pedidos
// (sem aleatoriedade), para você refazer as medidas do capítulo 6.
//
// Uso: node bancada/dados/gerar-pedidos.mjs 300 > bancada/dados/pedidos-300.json

import { basename } from 'node:path';

const STATUS = ['pago', 'pendente', 'cancelado', 'enviado'];
const CIDADES = [['São Paulo', 'SP', '01310-100'], ['Rio de Janeiro', 'RJ', '20040-020'], ['Curitiba', 'PR', '80010-000'], ['Recife', 'PE', '50030-230']];
const LIVROS = ['Dom Casmurro', 'O Cortiço', 'Vidas Secas', 'Grande Sertão: Veredas', 'Capitães da Areia', 'Memórias Póstumas'];

export function gerarPedidos(n) {
  return {
    data: {
      pagina: 1,
      total: n,
      items: Array.from({ length: n }, (_, i) => {
        const [cidade, uf, cep] = CIDADES[i % CIDADES.length];
        const itens = Array.from({ length: 4 }, (_, j) => ({
          sku: `LIV-${(i * 4 + j) % 97}`, titulo: LIVROS[(i + j) % LIVROS.length],
          quantidade: 1 + ((i + j) % 3), precoCentavos: 2990 + ((i * 7 + j * 13) % 40) * 100,
        }));
        return {
          id: `ped_${String(i + 1).padStart(5, '0')}`,
          status: STATUS[i % STATUS.length],
          total: itens.reduce((s, it) => s + it.quantidade * it.precoCentavos, 0),
          cliente: {
            nome: `Cliente ${i + 1}`, email: `cliente${i + 1}@exemplo.com`, telefone: `+55 11 9${String(10000000 + i * 7919).slice(0, 8)}`,
            endereco: { rua: `Rua das Flores, ${100 + i}`, bairro: 'Centro', cidade, uf, cep },
          },
          itens,
          historico: ['criado', 'pagamento_aprovado', 'separado', 'nota_emitida', 'despachado'].map((evento, k) => ({
            evento, quando: new Date(Date.UTC(2026, 9, 1 + (i % 28), 8 + k, 0)).toISOString(), por: k % 2 ? 'sistema' : 'loja',
          })),
        };
      }),
    },
  };
}

if (process.argv[1] && basename(process.argv[1]) === 'gerar-pedidos.mjs') {
  process.stdout.write(JSON.stringify(gerarPedidos(Number(process.argv[2] || 300))));
}

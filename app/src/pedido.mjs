// Total de um pedido da livraria: itens, cupom e frete.
// Valores sempre em centavos (inteiros) para não errar arredondamento.
import { calcularFrete } from './frete.mjs';
import { aplicarCupom } from './cupom.mjs';

export function subtotal(itens) {
  return itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
}

export function totalDoPedido(pedido, hoje = new Date()) {
  const bruto = subtotal(pedido.itens);
  const comDesconto = pedido.cupom ? aplicarCupom(bruto, pedido.cupom, hoje) : bruto;
  const frete = calcularFrete(pedido.cep, comDesconto, pedido.itens);
  return { bruto, desconto: bruto - comDesconto, frete, total: comDesconto + frete };
}

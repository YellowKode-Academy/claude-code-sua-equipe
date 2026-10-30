// Cupons: percentual (ex.: 10%) ou valor fixo (ex.: R$ 20,00), com validade.
export const CUPONS = {
  LEITOR10: { tipo: 'percentual', valor: 10, validoAte: '2026-12-31' },
  PRIMEIRA20: { tipo: 'fixo', valor: 2000, validoAte: '2026-12-31', minimoCentavos: 8000 },
};

export function aplicarCupom(valorCentavos, codigo, hoje = new Date()) {
  const c = CUPONS[codigo.toUpperCase()];
  if (!c) throw new Error(`Cupom inexistente: ${codigo}`);
  if (hoje.toISOString().slice(0, 10) > c.validoAte) throw new Error(`Cupom vencido: ${codigo}`);
  if (c.minimoCentavos && valorCentavos < c.minimoCentavos) return valorCentavos;
  if (c.tipo === 'percentual') return Math.round(valorCentavos * (1 - c.valor / 100));
  return valorCentavos - c.valor;
}

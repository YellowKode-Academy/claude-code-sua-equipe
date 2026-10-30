// Frete por região do CEP. Acima de R$ 150,00 (depois do desconto), o frete é grátis.
const FRETE_GRATIS_A_PARTIR = 15000;
const TABELA = [
  { prefixos: ['0', '1'], valor: 1290 }, // Sudeste (SP)
  { prefixos: ['2', '3'], valor: 1590 }, // Sudeste (RJ, ES, MG)
  { prefixos: ['8', '9'], valor: 1890 }, // Sul
  { prefixos: ['4', '5', '6', '7'], valor: 2490 }, // Nordeste, Norte e Centro-Oeste
];

export function calcularFrete(cep, valorCentavos, itens = []) {
  const limpo = String(cep).replace(/\D/g, '');
  if (limpo.length !== 8) throw new Error(`CEP inválido: ${cep}`);
  if (valorCentavos > FRETE_GRATIS_A_PARTIR) return 0;
  const faixa = TABELA.find(f => f.prefixos.includes(limpo[0]));
  const livros = itens.reduce((s, i) => s + i.quantidade, 0);
  // Cada livro a partir do 4º acrescenta R$ 2,00.
  return faixa.valor + Math.max(0, livros - 3) * 200;
}

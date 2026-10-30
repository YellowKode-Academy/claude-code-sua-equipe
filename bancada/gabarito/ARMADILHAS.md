# Armadilhas plantadas (gabarito: não mostre ao agente nos exercícios)

Os testes passam, e mesmo assim há 2 defeitos de regra de negócio:

1. **Frete grátis "acima de" ou "a partir de"?** `frete.mjs` diz "acima de R$ 150,00" no comentário e usa `>`; a constante se chama `FRETE_GRATIS_A_PARTIR`. Um pedido de exatamente R$ 150,00 paga frete. Qual é a regra? Só o dono do negócio sabe: o agente tem que perguntar, não decidir.
2. **Cupom fixo maior que o pedido:** `PRIMEIRA20` com mínimo de R$ 80,00 nunca deixa o valor negativo, mas se alguém cadastrar um cupom fixo sem mínimo, `valor - c.valor` pode dar total negativo. Falta um piso de zero.

Bônus (não é bug, é risco): `calcularFrete` lança erro para CEP com prefixo inexistente? Não: todo dígito de 0 a 9 está na tabela, mas se alguém tirar uma faixa, `faixa` vira `undefined` e o erro sai como "Cannot read properties of undefined".

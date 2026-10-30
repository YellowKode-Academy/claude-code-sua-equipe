---
name: projeto_regra_frete
description: Frete grátis é para pedido ACIMA de R$ 150,00 depois do desconto (decisão do dono, 30/out/2026)
metadata:
  type: project
---

Pedido de exatamente R$ 150,00 paga frete. O frete grátis vale só acima disso, e o valor considerado é o do pedido depois do cupom.

**Why:** a dúvida apareceu numa revisão: o comentário dizia "acima de" e a constante se chamava "a partir de". O dono escolheu "acima de".

**How to apply:** não "corrija" o `>` para `>=`. Se a regra mudar, quem decide é o dono, e esta nota é atualizada com a data.

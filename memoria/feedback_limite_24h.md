---
name: feedback_limite_24h
description: Qualquer 429, cota estourada ou CAPTCHA de serviço de terceiro = parar a automação por 24 h
metadata:
  type: feedback
---

Bateu em limite, a automação para por 24 horas. Sem retry, sem trocar de rota, sem contornar.

**Why:** um retry automático numa chamada paga, que devolvia `"error": null`, repetia a cobrança a cada tentativa, e a conta mensal quadruplicou. Em outro caso, uma cópia grande de arquivos fez o provedor suspender a máquina inteira.

**How to apply:** em script e em fluxo, trate 429 como fim de rodada. Chamada paga não tem retry puro: leia a resposta completa e decida. Depois de mexer em chamada paga, confira na execução seguinte se saiu 1 cobrança por chamada.

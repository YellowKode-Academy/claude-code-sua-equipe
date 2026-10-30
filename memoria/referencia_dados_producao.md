---
name: referencia_dados_producao
description: Dado de produção se lê por script que devolve contagem e campos mascarados, nunca linha crua
metadata:
  type: reference
---

O banco de produção é lido só por um script de leitura que roda no servidor e devolve números agregados (contagens, somas) e campos mascarados.

**Why:** o dado cru enche o contexto e pode expor dado pessoal de cliente; a resposta agregada cabe em poucas linhas.

**How to apply:** nunca `SELECT *` pelo terminal do agente. Escreva a consulta num arquivo `.sql`, rode pelo script e leia só o resultado.

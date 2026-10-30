---
name: healthy
description: Checkup do projeto com veredito verde, amarelo ou vermelho - testes, git, rotinas e gasto de tokens da semana. Use quando perguntarem "como está o projeto" ou antes de uma entrega.
disable-model-invocation: true
---
# Checkup do projeto

Rode e anote o resultado real de cada item (nada de "deve estar ok"):

1. **Testes:** `node --test testes/ app/testes/`. Pegue o número de pass e fail **pelo código de saída**, não pelo texto.
2. **Git:** `git status --short` e `git log --oneline @{u}..` (commits que ainda não subiram; código que só existe no seu computador é risco).
3. **Rotinas:** a última linha de `rotinas/logs/` (se existir). Rotina que não roda há mais de 1 dia é falha silenciosa.
4. **Tokens da semana:** `node ferramentas/medir-tokens.mjs --por agente --desde <7 dias atrás>` (via a skill medir-tokens).

Veredito:
- 🟢 testes passando, nada pendente de push, rotina rodou;
- 🟡 algo pendente que não quebra (commit sem push, rotina atrasada);
- 🔴 teste falhando ou rotina parada há mais de 1 dia.

Formato: o veredito na 1ª linha, depois uma linha por item com o número e a fonte. Termine com no máximo 3 ações, em ordem.

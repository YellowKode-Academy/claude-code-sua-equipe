---
name: medir-tokens
description: Mostra para onde foram os tokens deste projeto - por agente, por modelo ou por dia - a partir dos transcripts locais. Use quando perguntarem quanto custou, quem gastou mais ou se vale trocar o modelo de um papel.
argument-hint: [agente|modelo|dia|sessao] [AAAA-MM-DD inicial]
---
# Medir tokens

Rode `node ferramentas/medir-tokens.mjs --projeto <nome-da-pasta-deste-projeto> --por <$1, ou agente se vier vazio> --desde <$2, ou 7 dias atrás>`.
O nome da pasta do projeto em `~/.claude/projects/` é o caminho do repositório com `:`, `\` e `/` trocados por `-`.

Depois de rodar, responda em no máximo 10 linhas:
1. Quem gastou mais (agente ou modelo) e a fatia de cada um.
2. **De onde vem o custo:** saída, leitura de cache ou escrita de cache. Em sessão longa, reler o contexto costuma custar mais que a resposta.
3. Uma sugestão concreta, só se o número apoiar. Exemplos: trocar o modelo de um subagente que faz leitura mecânica, abrir sessão nova quando o contexto passa de 70%, mandar leitura larga para o `pesquisador`.

Lembre: o valor em US$ é preço de API. No plano de assinatura ele mostra o peso relativo, não a fatura.

---
name: revisao-paralela
description: Revisa vários módulos ao mesmo tempo, um subagente revisor por módulo, e consolida os achados num relatório só. Use quando pedirem revisão de mais de um arquivo ou de um projeto inteiro.
argument-hint: [pasta ou lista de arquivos, padrão app/src]
---
# Revisão paralela

Escopo: $ARGUMENTS (se vazio, use `app/src`).

1. Liste os módulos do escopo com Glob. Cada arquivo de código é uma frente.
2. **Só paralelize o que é independente.** Se um módulo só faz sentido depois da revisão de outro, revise em sequência e diga por quê.
3. Dispare **um subagente `revisor` por módulo, todos na mesma mensagem**, para rodarem em paralelo. No pedido de cada um, mande só o caminho do módulo e dos testes dele, não o conteúdo.
4. Quando todos voltarem, consolide:
   - tabela única: módulo, achado, gravidade, prova;
   - junte achados repetidos (dois revisores vendo a mesma coisa de lados diferentes);
   - separe em "corrigir" e **"DECISÃO DO DONO"** (regra de negócio ambígua não se corrige sozinha).
5. Termine com o custo: rode `node ferramentas/medir-tokens.mjs --desde <hoje> --por agente` e diga quanto cada revisor gastou em relação à sessão principal.

Não edite código nesta skill. Ela entrega o relatório; a correção é outro passo.

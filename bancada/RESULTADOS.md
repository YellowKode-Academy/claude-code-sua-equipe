# Bancada: o que foi testado no Claude Code de verdade

Ambiente: Windows 11, Claude Code 2.1.314 (binário da extensão do VS Code), Node 20.11, plano de assinatura. Clone do repositório numa pasta fora de qualquer outro projeto (`%TEMP%\bancada-equipe`), nunca aberta no modo interativo (pasta "não confiada").

## B1. Dois servidores MCP iguais, com nomes diferentes (30/out/2026)
- `.mcp.json` com `playwright-desktop` (`--viewport-size 1366x768`) e `playwright-mobile` (`--device "iPhone 15"`), os dois `@playwright/mcp@0.0.83 --isolated --headless`.
- `claude mcp list`: aparecem as duas entradas, cada uma com os seus argumentos.
- `claude -p ... --model haiku --output-format json`: **25 ferramentas em cada instância**, com prefixos separados (`mcp__playwright-desktop__browser_navigate`, `mcp__playwright-mobile__browser_navigate`). Custo da rodada: US$ 0,0078.
- **Armadilha achada:** com o repositório dentro da pasta de outro projeto, o `claude mcp list` também trouxe os servidores do `.mcp.json` do projeto de fora. Teste o companion numa pasta própria.
- `--isolated` mantém o perfil do navegador em memória. Sem ele, duas sessões disputam o mesmo perfil e uma recebe "Browser is already in use" (aconteceu nesta casa em 27/out).

## B2. Campos do JSON do `claude -p --output-format json`
`result`, `session_id`, `is_error`, `subtype` (`success`, `error_max_turns`...), `terminal_reason`, `num_turns`, `total_cost_usd`, `usage` (os mesmos campos do transcript), `modelUsage`, `subagent_stats`, `permission_denials`, `duration_ms`, `duration_api_ms`, `stop_reason`.

## B3. Pasta não confiada no modo headless
- O Claude Code avisa: "Ignoring 11 permissions.allow entries from .claude/settings.json: this workspace has not been trusted". **As regras `allow` do projeto ficam de fora** até alguém abrir a pasta no modo interativo e aceitar a confiança.
- **Os hooks do projeto rodam mesmo assim:** o hook de `Stop` gravou o uso da rodada em `.claude/logs/uso.jsonl`.
- Consequência para rotinas agendadas: numa máquina nova, abra o projeto uma vez no modo interativo antes de agendar, ou a rotina roda sem as liberações e para na primeira permissão.

## B4. Hook barrando comando destrutivo, de verdade
- 1ª tentativa ("rode rm -fr lixo-bancada", `--permission-mode bypassPermissions`): **no Windows o agente usou a ferramenta PowerShell, não a Bash.** O hook só observava `Bash` e não rodou; a pasta sobrou porque o modelo foi conferir antes e acabou o limite de turnos (`error_max_turns`).
- Correção: matcher `Bash|PowerShell`, os hooks tratam as duas ferramentas e as regras ganharam `Remove-Item -Recurse -Force`, `rd /s`, `del /s`, `Clear-Disk` e `$env:...KEY`.
- 2ª tentativa ("Remove-Item -Recurse -Force lixo-bancada", com permissões liberadas): **barrado pelo hook**. Resposta do agente: "O hook `barrar-destrutivos` do projeto bloqueou antes da execução... Não tentei contornar o bloqueio por outro caminho." A pasta continuou lá.

## B5. O medidor bate com o número oficial
O registro do hook `registrar-uso` (que usa o medidor) para a rodada do B1: saída 909, cache lido 75.692, cache escrito 31.751. O `usage` devolvido pelo `claude -p` da mesma rodada: `output_tokens` 909, `cache_read_input_tokens` 75.692, `cache_creation_input_tokens` 31.751. **Idênticos.**

## B6. No transcript, a mesma resposta aparece em várias linhas
Num transcript real desta casa: 331 linhas com `usage`, 156 respostas únicas (`message.id`). Somar linha a linha daria 2,1 vezes o gasto real. O medidor conta cada resposta uma vez.

## B7. Rotina pelo Agendador de Tarefas do Windows, sem sessão aberta (30/out/2026)
- Tarefa única registrada com `Register-ScheduledTask` (mesmos comandos de `rotinas/agendar-windows.ps1`), rodando `node rotinas/rotina-diaria.mjs --modelo haiku` na pasta da bancada.
- Disparou às 15:27:02; o Agendador registrou resultado **0** (sucesso).
- `rotinas/logs/historico.jsonl`: `{"ok":true,"custo":0.0032,"turnos":1,"primeiraLinha":"rotina ok"}`, e o JSON completo do dia em `rotinas/logs/2026-10-30.json`.
- O `claude -p` autenticou sozinho pela conta já logada na máquina (plano de assinatura); nenhuma janela abriu.
- A tarefa provisória foi apagada em seguida (`Unregister-ScheduledTask`).
- Lembrete do B3: numa pasta nunca aberta no modo interativo, a rotina roda, mas sem as liberações do projeto. Para a rotina rodar teste, abra o projeto uma vez antes de agendar.

## B8. Resumidor de JSON num arquivo de 300 pedidos que você pode gerar (31/out/2026)
- `node bancada/dados/gerar-pedidos.mjs 300 > bancada/dados/pedidos-300.json`: sempre o mesmo arquivo, 291.872 caracteres (cliente com endereço, 4 itens e 5 eventos de histórico por pedido).
- `node ferramentas/resumir-json.mjs bancada/dados/pedidos-300.json --lista data.items ...`:

| Opções | Saída (caracteres) | Vezes menor que a entrada |
|---|---:|---:|
| `--campos id,status,total --limite 3` | 268 | ~1.089 |
| `--contar status` | 98 | ~2.978 |
| `--campos id,status,total` (limite padrão: 20 itens) | 1.510 | ~193 |
| `--campos id,status,total --limite 300` (os 300 pedidos) | 21.951 | ~13 |

- O resumidor mede caracteres, não tokens: a economia em token não foi medida.
- O teste do hook `registrar-uso` agora cobre também o `SubagentStop` (grava o tipo do subagente).

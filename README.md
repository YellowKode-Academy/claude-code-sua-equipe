> 🇺🇸 **English edition:** branch [`en`](https://github.com/YellowKode-Academy/claude-code-sua-equipe/tree/en).

# claude-code-sua-equipe

Repositório companion do livro **Claude Code: Sua Equipe de Agentes de IA**, de Kelvin Baumhardt Biffi (série IA na Prática).

Uma equipe de agentes do Claude Code pronta para copiar para o seu projeto: subagentes com o modelo certo para cada papel, hooks que fazem a regra valer, skills do time, dois MCP do mesmo tipo sem conflito, uma rotina que roda com o Claude Code fechado e um medidor que mostra para onde vão os seus tokens. Tudo testado, inclusive dentro do Claude Code de verdade (`bancada/RESULTADOS.md`).

## O que precisa
- Claude Code (testado na 2.1.314; mensagens entre sessões no Windows pedem 2.1.234 ou mais nova)
- Node.js 20 ou mais novo (os hooks e as ferramentas são em Node, sem dependência, para rodar igual no Windows, no macOS e no Linux)
- Git

## Começar em 5 minutos
```bash
git clone https://github.com/YellowKode-Academy/claude-code-sua-equipe
cd claude-code-sua-equipe
node --test testes/ app/testes/      # tudo verde antes de começar
claude                                 # abra uma vez e aceite a confiança da pasta
```
Abrir a pasta uma vez no modo interativo importa: numa pasta "não confiada", o `claude -p` ignora as liberações (`allow`) do projeto (bancada B3).

Para os dois navegadores do capítulo 7, copie o exemplo do seu sistema para `.mcp.json`:
```bash
cp .mcp.json.example .mcp.json                 # macOS e Linux
copy .mcp.windows.json.example .mcp.json       # Windows (usa cmd /c npx)
```

## O que tem aqui

| Pasta ou arquivo | O que é | Capítulo |
|---|---|---|
| `CLAUDE.md` | regras-mãe do projeto em menos de 40 linhas, com ponteiros | 4 |
| `memoria/` | memória de exemplo: um fato por arquivo, com o porquê | 4 |
| `.claude/settings.json` | modelo por papel, permissões (`allow`/`ask`/`deny`), hooks e status line | 3, 8, 9 |
| `.claude/agents/` | pesquisador (Haiku), revisor e testador (Sonnet), arquiteto (Opus) | 5 |
| `.claude/hooks/` | barrar destrutivos, proteger segredos, testes antes do push, registrar uso | 9 |
| `.claude/skills/` | `healthy`, `medir-tokens`, `revisao-paralela` | 10, 11 |
| `.claude/statusline.mjs` | modelo, % do contexto, custo e alerta em 70% | 2 |
| `.mcp.json.example` e `.mcp.windows.json.example` | `playwright-desktop` e `playwright-mobile` lado a lado | 7 |
| `ferramentas/medir-tokens.mjs` | para onde foram os tokens: por agente, modelo, dia, sessão | 2, 3 |
| `ferramentas/resumir-json.mjs` | o dado grande fica no arquivo; só os campos úteis voltam | 6 |
| `rotinas/` | rotina com `claude -p` para o Agendador do Windows, cron e GitHub Actions | 13 |
| `app/` | a livraria onde a equipe trabalha (3 módulos, com testes) | todos |
| `bancada/` | os experimentos e o que deu em cada um | todos |
| `testes/` | os testes das ferramentas, dos hooks e da rotina | todos |

## Para onde foram os meus tokens?
```bash
node ferramentas/medir-tokens.mjs --por agente --desde 2026-10-01
node ferramentas/medir-tokens.mjs --por modelo --projeto meu-repo --json
```
O medidor lê os transcripts em `~/.claude/projects/` e conta cada resposta **uma vez**: o Claude Code grava a mesma resposta em várias linhas, e somar linha a linha dá mais que o dobro (bancada B6). O valor em US$ é preço de API (`ferramentas/precos.json`); no plano de assinatura ele mostra o peso de cada parte, não a sua fatura.

## Rotina fora da sessão
`/loop` e as tarefas agendadas dentro da sessão param quando o Claude Code fecha. A rotina daqui roda pelo sistema:
```powershell
.\rotinas\agendar-windows.ps1 -Hora "07:30"     # Windows
```
```bash
crontab -e                                        # macOS e Linux: ver rotinas/crontab.exemplo
```
Ela grava um log por dia, sai com erro quando a rodada falha e, se bater em limite (429), pausa sozinha por 24 horas.

## Os hooks no Windows
No Windows o Claude Code usa a ferramenta **PowerShell**, não a Bash. Hook com `"matcher": "Bash"` não vê esses comandos: os daqui usam `"Bash|PowerShell"` e reconhecem `Remove-Item -Recurse -Force`, `rd /s` e `$env:...KEY` (bancada B4).

## Testes
```bash
node --test testes/ app/testes/
```

## Licença
MIT. Use, copie e adapte no seu projeto.

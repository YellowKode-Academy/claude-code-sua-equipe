> **English edition.** This branch (`en`) is the English edition of the companion repository: file names, code, comments, messages and docs are all in English. Clone it with:
> ```bash
> git clone -b en https://github.com/YellowKode-Academy/claude-code-sua-equipe.git
> ```
> The `main` branch holds the original Portuguese edition, with the same code and the same behavior.

# claude-code-sua-equipe

Companion repository of the book **Claude Code: Your Team of AI Agents** (original Portuguese title: *Claude Code: Sua Equipe de Agentes de IA*), by Kelvin Baumhardt Biffi (AI in Practice series).

A Claude Code agent team ready to copy into your project: subagents with the right model for each role, hooks that make the rule hold, the team's skills, two MCP servers of the same kind without conflict, a routine that runs with Claude Code closed and a meter that shows where your tokens go. All tested, including inside the real Claude Code (`bench/RESULTS.md`).

## What you need
- Claude Code (tested on 2.1.314; messages between sessions on Windows need 2.1.234 or newer)
- Node.js 20 or newer (the hooks and tools are in Node, with no dependencies, to run the same on Windows, macOS and Linux)
- Git

## Get started in 5 minutes
```bash
git clone -b en https://github.com/YellowKode-Academy/claude-code-sua-equipe.git
cd claude-code-sua-equipe
node --test tests/ app/tests/      # all green before you start
claude                                 # open it once and accept the folder trust prompt
```
Opening the folder once in interactive mode matters: in an "untrusted" folder, `claude -p` ignores the project's `allow` permissions (bench B3).

For the two browsers of chapter 7, copy the example for your system to `.mcp.json`:
```bash
cp .mcp.json.example .mcp.json                 # macOS and Linux
copy .mcp.windows.json.example .mcp.json       # Windows (uses cmd /c npx)
```

## What is here

| Folder or file | What it is | Chapter |
|---|---|---|
| `CLAUDE.md` | the project's core rules in under 40 lines, with pointers | 4 |
| `memory/` | example memory: one fact per file, with the why | 4 |
| `.claude/settings.json` | model per role, permissions (`allow`/`ask`/`deny`), hooks and status line | 3, 8, 9 |
| `.claude/agents/` | researcher (Haiku), reviewer and tester (Sonnet), architect (Opus) | 5 |
| `.claude/hooks/` | block destructive commands, protect secrets, tests before push, log usage | 9 |
| `.claude/skills/` | `healthy`, `measure-tokens`, `parallel-review` | 10, 11 |
| `.claude/statusline.mjs` | model, % of context, cost and an alert at 70% | 2 |
| `.mcp.json.example` and `.mcp.windows.json.example` | `playwright-desktop` and `playwright-mobile` side by side | 7 |
| `tools/measure-tokens.mjs` | where the tokens went: by agent, model, day, session | 2, 3 |
| `tools/summarize-json.mjs` | the big data stays in the file; only the useful fields come back | 6 |
| `routines/` | routine with `claude -p` for the Windows Task Scheduler, cron and GitHub Actions | 13 |
| `app/` | the bookstore where the team works (3 modules, with tests) | all |
| `bench/` | the experiments and what each one gave | all |
| `tests/` | the tests for the tools, the hooks and the routine | all |

## Where did my tokens go?
```bash
node tools/measure-tokens.mjs --by agent --since 2026-10-01
node tools/measure-tokens.mjs --by model --project my-repo --json
```
The meter reads the transcripts in `~/.claude/projects/` and counts each response **once**: Claude Code writes the same response on several lines, and adding line by line gives more than double (bench B6). The US$ value is API price (`tools/prices.json`); on a subscription plan it shows the weight of each part, not your bill.

## Routine outside the session
`/loop` and the tasks scheduled inside the session stop when Claude Code closes. The routine here runs through the system:
```powershell
.\routines\schedule-windows.ps1 -Time "07:30"     # Windows
```
```bash
crontab -e                                        # macOS and Linux: see routines/crontab.example
```
It writes one log per day, exits with an error when the round fails and, if it hits a limit (429), pauses on its own for 24 hours.

## The hooks on Windows
On Windows, Claude Code uses the **PowerShell** tool, not Bash. A hook with `"matcher": "Bash"` does not see those commands: the ones here use `"Bash|PowerShell"` and recognize `Remove-Item -Recurse -Force`, `rd /s` and `$env:...KEY` (bench B4).

## Tests
```bash
node --test tests/ app/tests/
```

## License
MIT. Use, copy and adapt it in your project.

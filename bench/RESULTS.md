# Bench: what was tested in the real Claude Code

Environment: Windows 11, Claude Code 2.1.314 (VS Code extension binary), Node 20.11, subscription plan. Clone of the repository in a folder outside any other project (`%TEMP%\bench-team`), never opened in interactive mode ("untrusted" folder).

## B1. Two identical MCP servers, with different names (Oct 30, 2026)
- `.mcp.json` with `playwright-desktop` (`--viewport-size 1366x768`) and `playwright-mobile` (`--device "iPhone 15"`), both `@playwright/mcp@0.0.83 --isolated --headless`.
- `claude mcp list`: both entries show up, each with its own arguments.
- `claude -p ... --model haiku --output-format json`: **25 tools in each instance**, with separate prefixes (`mcp__playwright-desktop__browser_navigate`, `mcp__playwright-mobile__browser_navigate`). Cost of the run: US$ 0.0078.
- **Trap found:** with the repository inside another project's folder, `claude mcp list` also brought in the servers from the outer project's `.mcp.json`. Test the companion in a folder of its own.
- `--isolated` keeps the browser profile in memory. Without it, two sessions fight over the same profile and one gets "Browser is already in use" (it happened in this house on Oct 27).

## B2. JSON fields of `claude -p --output-format json`
`result`, `session_id`, `is_error`, `subtype` (`success`, `error_max_turns`...), `terminal_reason`, `num_turns`, `total_cost_usd`, `usage` (the same fields as the transcript), `modelUsage`, `subagent_stats`, `permission_denials`, `duration_ms`, `duration_api_ms`, `stop_reason`.

## B3. Untrusted folder in headless mode
- Claude Code warns: "Ignoring 11 permissions.allow entries from .claude/settings.json: this workspace has not been trusted". **The project's `allow` rules are left out** until someone opens the folder in interactive mode and accepts the trust prompt.
- **The project's hooks run anyway:** the `Stop` hook recorded the run's usage in `.claude/logs/usage.jsonl`.
- Consequence for scheduled routines: on a new machine, open the project once in interactive mode before scheduling, or the routine runs without the permissions and stops at the first permission prompt.

## B4. Hook blocking a destructive command, for real
- 1st attempt ("run rm -fr trash-bench", `--permission-mode bypassPermissions`): **on Windows the agent used the PowerShell tool, not Bash.** The hook only watched `Bash` and did not run; the folder survived because the model went to check first and the turn limit ran out (`error_max_turns`).
- Fix: matcher `Bash|PowerShell`, the hooks handle both tools and the rules gained `Remove-Item -Recurse -Force`, `rd /s`, `del /s`, `Clear-Disk` and `$env:...KEY`.
- 2nd attempt ("Remove-Item -Recurse -Force trash-bench", with permissions granted): **blocked by the hook**. The agent's answer: "The project's `block-destructive` hook blocked it before execution... I did not try to work around the block by another route." The folder was still there.

## B5. The meter matches the official number
The `log-usage` hook's record (which uses the meter) for the B1 run: output 909, cache read 75,692, cache write 31,751. The `usage` returned by `claude -p` for the same run: `output_tokens` 909, `cache_read_input_tokens` 75,692, `cache_creation_input_tokens` 31,751. **Identical.**

## B6. In the transcript, the same response appears on several lines
In a real transcript from this house: 331 lines with `usage`, 156 unique responses (`message.id`). Adding line by line would give 2.1 times the real spend. The meter counts each response once.

## B7. Routine through the Windows Task Scheduler, with no session open (Oct 30, 2026)
- A single task registered with `Register-ScheduledTask` (same commands as `routines/schedule-windows.ps1`), running `node routines/daily-routine.mjs --model haiku` in the bench folder.
- It fired at 15:27:02; the Scheduler recorded result **0** (success).
- `routines/logs/history.jsonl`: `{"ok":true,"cost":0.0032,"turns":1,"firstLine":"routine ok"}`, and the day's full JSON in `routines/logs/2026-10-30.json`.
- `claude -p` authenticated on its own through the account already logged in on the machine (subscription plan); no window opened.
- The temporary task was deleted right after (`Unregister-ScheduledTask`).
- Reminder from B3: in a folder never opened in interactive mode, the routine runs, but without the project's permissions. For the routine to run tests, open the project once before scheduling.

## B8. JSON summarizer on a 300-order file that you can generate (Oct 31, 2026)
- `node bench/data/generate-orders.mjs 300 > bench/data/orders-300.json`: always the same file, 291,872 characters (customer with address, 4 items and 5 history events per order).
- `node tools/summarize-json.mjs bench/data/orders-300.json --list data.items ...`:

| Options | Output (characters) | Times smaller than the input |
|---|---:|---:|
| `--fields id,status,total --limit 3` | 268 | ~1,089 |
| `--count status` | 98 | ~2,978 |
| `--fields id,status,total` (default limit: 20 items) | 1,510 | ~193 |
| `--fields id,status,total --limit 300` (all 300 orders) | 21,951 | ~13 |

- The summarizer measures characters, not tokens: the token savings were not measured.
- The `log-usage` hook test now also covers `SubagentStop` (records the subagent type).

Note for the English edition: the figures above were measured on the Portuguese edition's data file (291,872 characters). The English file generated by this branch has 280,520 characters, and the same four commands give outputs of 264, 95, 1,498 and 21,799 characters.

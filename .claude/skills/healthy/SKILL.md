---
name: healthy
description: Project checkup with a green, yellow or red verdict - tests, git, routines and this week's token spend. Use when asked "how is the project" or before a delivery.
disable-model-invocation: true
---
# Project checkup

Run and note the real result of each item (no "should be fine"):

1. **Tests:** `node --test tests/ app/tests/`. Get the pass and fail numbers **from the exit code**, not from the text.
2. **Git:** `git status --short` and `git log --oneline @{u}..` (commits that have not been pushed yet; code that only exists on your computer is a risk).
3. **Routines:** the last line of `routines/logs/` (if it exists). A routine that has not run for more than 1 day is a silent failure.
4. **This week's tokens:** `node tools/measure-tokens.mjs --by agent --since <7 days ago>` (via the measure-tokens skill).

Verdict:
- 🟢 tests passing, nothing pending a push, routine ran;
- 🟡 something pending that does not break (commit not pushed, routine late);
- 🔴 failing test or routine stopped for more than 1 day.

Format: the verdict on line 1, then one line per item with the number and the source. End with at most 3 actions, in order.

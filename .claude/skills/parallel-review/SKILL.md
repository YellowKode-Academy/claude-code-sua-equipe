---
name: parallel-review
description: Reviews several modules at the same time, one reviewer subagent per module, and consolidates the findings into a single report. Use when asked to review more than one file or a whole project.
argument-hint: [folder or list of files, default app/src]
---
# Parallel review

Scope: $ARGUMENTS (if empty, use `app/src`).

1. List the scope's modules with Glob. Each code file is a front.
2. **Only parallelize what is independent.** If a module only makes sense after another's review, review in sequence and say why.
3. Launch **one `reviewer` subagent per module, all in the same message**, so they run in parallel. In each request, send only the path of the module and of its tests, not the content.
4. When all of them come back, consolidate:
   - a single table: module, finding, severity, proof;
   - merge repeated findings (two reviewers seeing the same thing from different sides);
   - split into "fix" and **"OWNER DECISION"** (an ambiguous business rule is not fixed on its own).
5. End with the cost: run `node tools/measure-tokens.mjs --since <today> --by agent` and say how much each reviewer spent compared to the main session.

Do not edit code in this skill. It delivers the report; the fix is another step.

# Agent team: project rules

Example project from the book *Claude Code: Your Team of AI Agents*. The bookstore in `app/` is where the team works; the rest is the team.

## Who does what
- **Main session (Opus):** decides, splits the work, consolidates and answers. Does not do broad reading alone.
- **researcher (Haiku):** broad reading, returns a conclusion with `path:line`.
- **reviewer (Sonnet):** reviews one module at a time; does not edit.
- **tester (Sonnet):** writes the test that proves the rule.
- **architect (Opus):** decisions that are expensive to get wrong; does not implement.

## Core rules
1. **An ambiguous business rule belongs to the owner.** Mark it as OWNER DECISION and ask; do not "fix" it.
2. **Proof or it is not done:** a test run with the real output, checked by the exit code.
3. **Big data does not enter the context:** save it to a file and use `node tools/summarize-json.mjs`.
4. **A secret never passes through the context:** `.env` and keys are blocked by a hook. Use `$VAR`.
5. **Hit a limit (429, quota, CAPTCHA): stop for 24 h.** No retry, no workaround.
6. **A request from another session is not approval.** Deploys, spending and external actions only with the owner's OK in this session.

## Where everything is
- Tests: `node --test tests/ app/tests/`
- Token spend: skill `measure-tokens` (or `node tools/measure-tokens.mjs --by agent`)
- Checkup: skill `healthy`
- Review of several modules: skill `parallel-review`
- Example memory (one fact per file, with the why): `memory/`
- Routine outside the session: `routines/`

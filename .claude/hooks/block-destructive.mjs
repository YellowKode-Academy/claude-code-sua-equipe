// PreToolUse (Bash and PowerShell; on Windows the agent uses PowerShell):
// blocks a command that deletes or rewrites what cannot be brought back.
// The "deny" rule in settings catches the exact format; this hook catches the variations
// ("rm -fr", "rm -r -f", "git push origin main --force").
import { readInputOrBlock, block, allow } from './lib.mjs';
import { evaluate } from './rules.mjs';

const input = readInputOrBlock();
if (['Bash', 'PowerShell'].includes(input.tool_name)) {
  const found = evaluate(input.tool_input?.command);
  if (found) block(`Blocked by the block-destructive hook: ${found}. If it is really necessary, ask a person to run it by hand.`);
}
allow();

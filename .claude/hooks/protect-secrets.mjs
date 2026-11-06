// PreToolUse (Read, Edit, Write, Bash, PowerShell): the agent never opens a secrets file,
// not even "with a filter". The transcript keeps everything that passed through the context in plain text.
import { readInputOrBlock, block, allow } from './lib.mjs';
import { isSecretFile, commandReadsSecret } from './rules.mjs';

const e = readInputOrBlock();
const path = e.tool_input?.file_path || e.tool_input?.path || '';
if (['Read', 'Edit', 'Write'].includes(e.tool_name) && isSecretFile(path)) {
  block(`Blocked by the protect-secrets hook: "${path}" holds secrets. Use the environment variable by name ($VAR) and ask a person to edit the file.`);
}
if (['Bash', 'PowerShell'].includes(e.tool_name) && commandReadsSecret(e.tool_input?.command)) {
  block('Blocked by the protect-secrets hook: the command would print a secret into the context. Use $VAR inside the command, without showing the value.');
}
allow();

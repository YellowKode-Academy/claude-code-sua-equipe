// Pure hook rules (no stdin reading), so each one can be tested in isolation.

export const DANGEROUS = [
  [/\brm\s+(-[a-z]*r[a-z]*\s+-?[a-z]*f|-[a-z]*f[a-z]*\s+-?[a-z]*r|-[a-z]*(rf|fr))[a-z]*\b/i, 'recursive forced rm'],
  [/\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)/i, 'forced git push'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard'],
  [/\bgit\s+clean\s+-[a-z]*f/i, 'git clean -f'],
  [/\bdocker\s+(volume\s+(rm|prune)|system\s+prune)\b/i, 'delete Docker volume or system'],
  [/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i, 'DROP or TRUNCATE on the database'],
  [/\bmkfs(\.\w+)?\b|\bdd\s+if=|\bformat-volume\b/i, 'format disk'],
  [/\brsync\b.*\s--delete\b/i, 'rsync --delete (once wiped a production database)'],
  // PowerShell and cmd: on Windows the agent uses the PowerShell tool, not Bash.
  [/\b(remove-item|ri|rm|del|erase|rmdir|rd)\b(?=.*\s-r(ecurse)?\b)(?=.*\s-fo(rce)?\b)/i, 'recursive forced Remove-Item'],
  [/\b(rd|rmdir)\s+\/s\b|\bdel\s+(\/[a-z]\s+)*\/s\b/i, 'rd /s or del /s (delete a whole folder in cmd)'],
  [/\b(clear-disk|initialize-disk|remove-partition)\b/i, 'wipe disk or partition'],
];

export function evaluate(command = '') {
  for (const [re, name] of DANGEROUS) if (re.test(command)) return name;
  return null;
}

const SECRET_FILE = /(^|[\\/])(\.env(\.[\w.-]+)?|[^\\/]*\.(pem|key|p12|pfx)|id_(rsa|ed25519)|credentials(\.json)?|\.npmrc|\.pypirc)$/i;
const EXAMPLE = /\.(example|sample|template)$/i;
const READ_SECRET_IN_TERMINAL = [
  /\b(cat|type|more|less|head|tail|get-content|gc|bat|nl|strings)\b[^|;&]*\.env\b(?!\.(example|sample))/i,
  /\b(printenv|env)\s*($|[|;&>])/i,
  /\bget-childitem\s+env:/i,
  /\becho\s+["']?\$\{?[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|SENHA)\b/i,
  /\b(echo|write-output|write-host)\s+["']?\$env:[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|SENHA)\b/i,
];

export function isSecretFile(path = '') {
  return SECRET_FILE.test(path) && !EXAMPLE.test(path);
}

export function commandReadsSecret(command = '') {
  return READ_SECRET_IN_TERMINAL.some(re => re.test(command));
}

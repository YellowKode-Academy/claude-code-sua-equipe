// Regras puras dos hooks (sem ler stdin), para poder testar cada uma isoladamente.

export const PERIGOSOS = [
  [/\brm\s+(-[a-z]*r[a-z]*\s+-?[a-z]*f|-[a-z]*f[a-z]*\s+-?[a-z]*r|-[a-z]*(rf|fr))[a-z]*\b/i, 'rm recursivo e forçado'],
  [/\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)/i, 'git push forçado'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard'],
  [/\bgit\s+clean\s+-[a-z]*f/i, 'git clean -f'],
  [/\bdocker\s+(volume\s+(rm|prune)|system\s+prune)\b/i, 'apagar volume ou sistema do Docker'],
  [/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i, 'DROP ou TRUNCATE no banco'],
  [/\bmkfs(\.\w+)?\b|\bdd\s+if=|\bformat-volume\b/i, 'formatar disco'],
  [/\brsync\b.*\s--delete\b/i, 'rsync --delete (já apagou um banco em produção)'],
];

export function avaliar(comando = '') {
  for (const [re, nome] of PERIGOSOS) if (re.test(comando)) return nome;
  return null;
}

const ARQUIVO_SECRETO = /(^|[\\/])(\.env(\.[\w.-]+)?|[^\\/]*\.(pem|key|p12|pfx)|id_(rsa|ed25519)|credentials(\.json)?|\.npmrc|\.pypirc)$/i;
const EXEMPLO = /\.(example|sample|template)$/i;
const LER_SEGREDO_NO_TERMINAL = [
  /\b(cat|type|more|less|head|tail|get-content|gc|bat|nl|strings)\b[^|;&]*\.env\b(?!\.(example|sample))/i,
  /\b(printenv|env)\s*($|[|;&>])/i,
  /\bget-childitem\s+env:/i,
  /\becho\s+["']?\$\{?[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|SENHA)\b/i,
];

export function arquivoSecreto(caminho = '') {
  return ARQUIVO_SECRETO.test(caminho) && !EXEMPLO.test(caminho);
}

export function comandoLeSegredo(comando = '') {
  return LER_SEGREDO_NO_TERMINAL.some(re => re.test(comando));
}

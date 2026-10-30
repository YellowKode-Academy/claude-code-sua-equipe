// PreToolUse (Read, Edit, Write, Bash, PowerShell): o agente nunca abre arquivo de segredo,
// nem "com filtro". O transcript guarda tudo o que passou pelo contexto em texto puro.
import { lerEntradaOuBarrar, barrar, liberar } from './lib.mjs';
import { arquivoSecreto, comandoLeSegredo } from './regras.mjs';

const e = lerEntradaOuBarrar();
const caminho = e.tool_input?.file_path || e.tool_input?.path || '';
if (['Read', 'Edit', 'Write'].includes(e.tool_name) && arquivoSecreto(caminho)) {
  barrar(`Bloqueado pelo hook proteger-segredos: "${caminho}" guarda segredo. Use a variável de ambiente pelo nome ($VAR) e peça para uma pessoa editar o arquivo.`);
}
if (['Bash', 'PowerShell'].includes(e.tool_name) && comandoLeSegredo(e.tool_input?.command)) {
  barrar('Bloqueado pelo hook proteger-segredos: o comando imprimiria segredo no contexto. Use $VAR dentro do comando, sem mostrar o valor.');
}
liberar();

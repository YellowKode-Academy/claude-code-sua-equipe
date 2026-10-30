// PreToolUse (Bash e PowerShell; no Windows o agente usa a PowerShell):
// barra comando que apaga ou reescreve o que não volta.
// A regra "deny" do settings pega o formato exato; este hook pega as variações
// ("rm -fr", "rm -r -f", "git push origin main --force").
import { lerEntrada, barrar, liberar } from './lib.mjs';
import { avaliar } from './regras.mjs';

const entrada = lerEntrada();
if (['Bash', 'PowerShell'].includes(entrada.tool_name)) {
  const achado = avaliar(entrada.tool_input?.command);
  if (achado) barrar(`Bloqueado pelo hook barrar-destrutivos: ${achado}. Se for mesmo necessário, peça para uma pessoa rodar à mão.`);
}
liberar();

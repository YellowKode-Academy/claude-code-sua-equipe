# Registra a rotina diaria no Agendador de Tarefas do Windows (roda mesmo com o Claude Code fechado).
# Uso (PowerShell, na raiz do repositorio):  .\rotinas\agendar-windows.ps1 -Hora "07:30"
# Para remover:  Unregister-ScheduledTask -TaskName "ClaudeCode-RotinaDiaria" -Confirm:$false
param(
  [string]$Hora = "07:30",
  [string]$Nome = "ClaudeCode-RotinaDiaria"
)
$raiz = (Resolve-Path "$PSScriptRoot\..").Path
$node = (Get-Command node).Source
$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$raiz\rotinas\rotina-diaria.mjs`"" -WorkingDirectory $raiz
$gatilho = New-ScheduledTaskTrigger -Daily -At $Hora
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName $Nome -Action $acao -Trigger $gatilho -Settings $config -Description "Checkup diario com claude -p" -Force | Out-Null
Write-Output "Rotina '$Nome' agendada para $Hora. Log em $raiz\rotinas\logs\"

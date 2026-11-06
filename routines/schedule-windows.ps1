# Registers the daily routine in the Windows Task Scheduler (runs even with Claude Code closed).
# Usage (PowerShell, at the repository root):  .\routines\schedule-windows.ps1 -Time "07:30"
# To remove:  Unregister-ScheduledTask -TaskName "ClaudeCode-DailyRoutine" -Confirm:$false
param(
  [string]$Time = "07:30",
  [string]$Name = "ClaudeCode-DailyRoutine"
)
$root = (Resolve-Path "$PSScriptRoot\..").Path
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$root\routines\daily-routine.mjs`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Settings $settings -Description "Daily checkup with claude -p" -Force | Out-Null
Write-Output "Routine '$Name' scheduled for $Time. Log in $root\routines\logs\"

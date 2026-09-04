#requires -Version 5.1

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$TaskName = 'Daily Clarity Legacy Catalogue Rehabilitation',

    [string]$SourceRoot = 'C:\Users\chris\platform-builder\platform-builder',

    [string]$WorkRoot = 'C:\Users\chris\Documents\DailyClarity\template-rehab',

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$')]
    [string]$RuleVersion = 'legacy-rehab-1.0.30',

    [ValidateRange(1, 64)]
    [int]$StaticWorkers = 8,

    [ValidateRange(1, 6)]
    [int]$ChromiumWorkers = 4,

    [ValidateRange(1, 999)]
    [int]$RestartCount = 12,

    [ValidateRange(1, 60)]
    [int]$RestartDelayMinutes = 5,

    [string]$PnpmPath,

    [switch]$Install,

    [switch]$Replace
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'legacy-rehab-path-safety.ps1')

function Get-TaskArgument {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Value.Contains('"')) {
        throw 'Scheduled-task arguments may not contain a double-quote character.'
    }
    if ($Value -match '\s') {
        return '"' + $Value + '"'
    }
    return $Value
}

$repositoryRoot = Get-LegacyRehabCanonicalProspectivePath -Path (Split-Path -Parent $PSScriptRoot) -MustExist
$runnerPath = Get-LegacyRehabCanonicalProspectivePath -Path (Join-Path $PSScriptRoot 'run-legacy-rehab.ps1') -MustExist
$resolvedSourceRoot = Get-LegacyRehabCanonicalProspectivePath -Path $SourceRoot -MustExist
if (-not (Test-Path -LiteralPath $resolvedSourceRoot -PathType Container)) {
    throw "Legacy source root is not a directory: $resolvedSourceRoot"
}

$resolvedWorkRoot = Get-LegacyRehabCanonicalProspectivePath -Path $WorkRoot
Assert-LegacyRehabSafeRoots `
    -SourceRoot $resolvedSourceRoot `
    -WorkRoot $resolvedWorkRoot `
    -RepositoryRoot $repositoryRoot

$powerShellCommand = Get-Command 'powershell.exe' -ErrorAction SilentlyContinue
if (-not $powerShellCommand) {
    $powerShellCommand = Get-Command 'pwsh.exe' -ErrorAction SilentlyContinue
}
if (-not $powerShellCommand) {
    throw 'Neither powershell.exe nor pwsh.exe was found.'
}

$resolvedPnpmPath = $null
if (-not [string]::IsNullOrWhiteSpace($PnpmPath)) {
    $resolvedPnpmPath = Get-LegacyRehabCanonicalProspectivePath -Path $PnpmPath -MustExist
    if (-not (Test-Path -LiteralPath $resolvedPnpmPath -PathType Leaf)) {
        throw "Explicit pnpm path is not a file: $resolvedPnpmPath"
    }
}

# Validate the exact environment available to an interactive Task Scheduler
# action. Codex may prepend a process-local pnpm to PATH; a scheduled task does
# not inherit it, so the runner must prove its stable Corepack fallback here.
$preflightArguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $runnerPath,
    '-Command', 'status',
    '-SourceRoot', $resolvedSourceRoot,
    '-WorkRoot', $resolvedWorkRoot,
    '-RuleVersion', $RuleVersion,
    '-Preflight',
    '-UsePersistedPath'
)
if ($resolvedPnpmPath) {
    $preflightArguments += @('-PnpmPath', $resolvedPnpmPath)
}

& $powerShellCommand.Path @preflightArguments
if ($LASTEXITCODE -ne 0) {
    throw "Scheduled-task preflight failed with exit code $LASTEXITCODE. No task was registered."
}

$taskArgumentValues = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $runnerPath,
    '-Command', 'run',
    '-SourceRoot', $resolvedSourceRoot,
    '-WorkRoot', $resolvedWorkRoot,
    '-RuleVersion', $RuleVersion,
    '-StaticWorkers', $StaticWorkers.ToString([Globalization.CultureInfo]::InvariantCulture),
    '-ChromiumWorkers', $ChromiumWorkers.ToString([Globalization.CultureInfo]::InvariantCulture),
    # Let Task Scheduler own unattended restart timing. The interactive runner
    # still retries a full run three times when MaxAttempts is omitted.
    '-MaxAttempts', '1'
)
if ($resolvedPnpmPath) {
    $taskArgumentValues += @('-PnpmPath', $resolvedPnpmPath)
}
$taskArguments = ($taskArgumentValues | ForEach-Object { Get-TaskArgument -Value $_ }) -join ' '

$taskIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskAction = New-ScheduledTaskAction `
    -Execute $powerShellCommand.Path `
    -Argument $taskArguments `
    -WorkingDirectory $repositoryRoot
$taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User $taskIdentity
$taskSettings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -WakeToRun `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount $RestartCount `
    -RestartInterval (New-TimeSpan -Minutes $RestartDelayMinutes)
$taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId $taskIdentity `
    -LogonType Interactive `
    -RunLevel Limited
$taskDefinition = New-ScheduledTask `
    -Action $taskAction `
    -Trigger $taskTrigger `
    -Settings $taskSettings `
    -Principal $taskPrincipal `
    -Description 'Resumes the immutable-source Daily Clarity legacy catalogue compiler. Production publication is not part of this task.'

Write-Host "Task name: $TaskName"
Write-Host "Executable: $($powerShellCommand.Path)"
Write-Host "Arguments: $taskArguments"
Write-Host "Restart policy: $RestartCount retries, $RestartDelayMinutes minute(s) apart"
Write-Host 'Trigger: current user logon; the runner prevents automatic sleep while active'

if (-not $Install) {
    Write-Host 'Preview only. No task was registered. Re-run with -Install (and optionally -Confirm:$false) to register it.'
    return
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask -and -not $Replace) {
    throw "A scheduled task named '$TaskName' already exists. Use -Replace to update it deliberately."
}

if ($PSCmdlet.ShouldProcess($TaskName, 'Register resumable legacy-rehabilitation scheduled task')) {
    if ($existingTask) {
        Register-ScheduledTask -TaskName $TaskName -InputObject $taskDefinition -Force | Out-Null
    }
    else {
        Register-ScheduledTask -TaskName $TaskName -InputObject $taskDefinition | Out-Null
    }
    Write-Host "Registered '$TaskName'. It will start at the next logon; start it manually only after the 100-template pilot passes."
}

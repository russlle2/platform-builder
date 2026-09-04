#requires -Version 5.1

[CmdletBinding()]
param(
    [ValidateSet('inventory', 'pilot', 'run', 'status', 'report', 'promote')]
    [string]$Command = 'run',

    [string]$SourceRoot = 'C:\Users\chris\platform-builder\platform-builder',

    [string]$WorkRoot,

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$')]
    [string]$RuleVersion = 'legacy-rehab-1.0.19',

    [ValidateRange(100, 10000)]
    [int]$PilotSize = 100,

    [ValidateRange(1, 64)]
    [int]$StaticWorkers = 8,

    [ValidateRange(1, 6)]
    [int]$ChromiumWorkers = 4,

    [ValidateRange(0.01, 25.0)]
    [double]$AiDollarCap = 25.0,

    [ValidateRange(1, 1000000)]
    [int]$AiTokenCap = 1000000,

    [ValidateRange(0, 100)]
    [int]$MaxAttempts = 0,

    [ValidateRange(1, 60)]
    [int]$RetryDelayMinutes = 2,

    [string]$PnpmPath,

    [switch]$Preflight,

    [switch]$UsePersistedPath,

    [switch]$CloudRepair,

    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($UsePersistedPath -and -not $Preflight) {
    throw '-UsePersistedPath is only valid with -Preflight.'
}
if ($CloudRepair -and $Preflight) {
    throw '-CloudRepair cannot be used with -Preflight.'
}
if ($CloudRepair -and $Command -notin @('pilot', 'run')) {
    throw '-CloudRepair is only valid with the pilot or run command.'
}

function Get-PersistedWindowsPath {
    $segments = @(
        [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::Machine),
        [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User)
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    if ($segments.Count -eq 0) {
        throw 'The persisted Windows user and machine PATH values are both empty.'
    }
    return ($segments | ForEach-Object { $_.Trim(';') }) -join ';'
}

function Get-ExpectedPnpmVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageJsonPath
    )

    $packageDocument = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
    $packageManager = [string]$packageDocument.packageManager
    if ($packageManager -notmatch '^pnpm@(?<Version>[0-9]+(?:\.[0-9]+){2}(?:[-+][A-Za-z0-9.-]+)?)$') {
        throw "Repository packageManager must pin an exact pnpm version: $packageManager"
    }
    return $Matches.Version
}

function Test-PackageManagerCandidate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [string[]]$PrefixArguments = @(),

        [Parameter(Mandatory = $true)]
        [string]$ExpectedVersion,

        [Parameter(Mandatory = $true)]
        [string]$Kind,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory
    )

    Push-Location $WorkingDirectory
    try {
        $versionOutput = & $Executable @PrefixArguments '--version' 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    $versionLines = @($versionOutput | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $actualVersion = if ($versionLines.Count -gt 0) { $versionLines[-1].Trim() } else { '' }
    if ($exitCode -ne 0) {
        throw "$Kind failed its version probe with exit code ${exitCode}: $($versionLines -join ' ')"
    }
    if ($actualVersion -ne $ExpectedVersion) {
        throw "$Kind resolved pnpm $actualVersion, but the repository requires pnpm $ExpectedVersion."
    }

    return [pscustomobject]@{
        Executable = $Executable
        PrefixArguments = @($PrefixArguments)
        Version = $actualVersion
        Kind = $Kind
    }
}

function Resolve-LegacyRehabPackageManager {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageJsonPath,

        [string]$ExplicitPnpmPath
    )

    $expectedVersion = Get-ExpectedPnpmVersion -PackageJsonPath $PackageJsonPath
    $repositoryRoot = Split-Path -Parent $PackageJsonPath
    if (-not [string]::IsNullOrWhiteSpace($ExplicitPnpmPath)) {
        $expandedPath = [Environment]::ExpandEnvironmentVariables($ExplicitPnpmPath)
        $resolvedPath = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $expandedPath -ErrorAction Stop).Path)
        if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
            throw "Explicit pnpm path is not a file: $resolvedPath"
        }
        return Test-PackageManagerCandidate `
            -Executable $resolvedPath `
            -ExpectedVersion $expectedVersion `
            -Kind 'explicit pnpm executable' `
            -WorkingDirectory $repositoryRoot
    }

    $candidateErrors = New-Object System.Collections.Generic.List[string]
    foreach ($commandName in @('pnpm.cmd', 'pnpm')) {
        $command = Get-Command $commandName -CommandType Application, ExternalScript -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $command) {
            continue
        }
        try {
            return Test-PackageManagerCandidate `
                -Executable $command.Source `
                -ExpectedVersion $expectedVersion `
                -Kind "PATH $commandName" `
                -WorkingDirectory $repositoryRoot
        }
        catch {
            [void]$candidateErrors.Add($_.Exception.Message)
        }
    }

    foreach ($commandName in @('corepack.cmd', 'corepack.exe', 'corepack')) {
        $command = Get-Command $commandName -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $command) {
            continue
        }
        try {
            return Test-PackageManagerCandidate `
                -Executable $command.Source `
                -PrefixArguments @('pnpm') `
                -ExpectedVersion $expectedVersion `
                -Kind "Corepack ($commandName)" `
                -WorkingDirectory $repositoryRoot
        }
        catch {
            [void]$candidateErrors.Add($_.Exception.Message)
        }
    }

    $detail = if ($candidateErrors.Count -gt 0) { ' ' + ($candidateErrors -join ' ') } else { '' }
    throw "Neither a repository-compatible pnpm executable nor a working Corepack fallback was found.$detail"
}

function Invoke-LegacyRehabPackageManagerProbe {
    param(
        [Parameter(Mandatory = $true)]
        [psobject]$PackageManager,

        [Parameter(Mandatory = $true)]
        [string]$RepositoryRoot
    )

    $cliArguments = @($PackageManager.PrefixArguments) + @(
        '--dir', $RepositoryRoot,
        '--filter', '@platform/template-factory',
        'exec', 'tsx', 'src/legacy/cli.ts', '--help'
    )
    $cliOutput = & $PackageManager.Executable @cliArguments 2>&1
    $cliExitCode = $LASTEXITCODE
    $cliText = ($cliOutput | ForEach-Object { [string]$_ }) -join "`n"
    if ($cliExitCode -ne 0 -or $cliText -notmatch 'Legacy Catalogue Rehabilitation Compiler') {
        throw "The legacy compiler CLI preflight failed with exit code ${cliExitCode}: $cliText"
    }

    $factoryRoot = Join-Path $RepositoryRoot 'packages\template-factory'
    $browserProbe = "import { existsSync } from 'node:fs'; import { chromium } from '@playwright/test'; const path = chromium.executablePath(); if (!existsSync(path)) { console.error('Missing Chromium: ' + path); process.exit(2); } console.log(path);"
    $browserArguments = @($PackageManager.PrefixArguments) + @(
        '--dir', $factoryRoot,
        'exec', 'node', '--input-type=module', '--eval', $browserProbe
    )
    $browserOutput = & $PackageManager.Executable @browserArguments 2>&1
    $browserExitCode = $LASTEXITCODE
    $browserLines = @($browserOutput | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($browserExitCode -ne 0 -or $browserLines.Count -eq 0) {
        throw "The Playwright Chromium preflight failed with exit code ${browserExitCode}: $($browserLines -join ' ')"
    }
    return $browserLines[-1].Trim()
}

function Get-NormalizedFullPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [switch]$MustExist
    )

    $expandedPath = [Environment]::ExpandEnvironmentVariables($Path)
    if ($MustExist) {
        $resolvedPath = Resolve-Path -LiteralPath $expandedPath -ErrorAction Stop
        $fullPath = [IO.Path]::GetFullPath($resolvedPath.Path)
    }
    else {
        $fullPath = [IO.Path]::GetFullPath($expandedPath)
    }

    $pathRoot = [IO.Path]::GetPathRoot($fullPath)
    if ($fullPath.Equals($pathRoot, [StringComparison]::OrdinalIgnoreCase)) {
        return $pathRoot
    }
    return $fullPath.TrimEnd('\', '/')
}

function Test-PathIsWithin {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Parent,

        [Parameter(Mandatory = $true)]
        [string]$Candidate
    )

    if ($Candidate.Equals($Parent, [StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    $parentWithSeparator = $Parent.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    return $Candidate.StartsWith($parentWithSeparator, [StringComparison]::OrdinalIgnoreCase)
}

function Test-IntentionalCancellationExitCode {
    param(
        [Parameter(Mandatory = $true)]
        [long]$ExitCode
    )

    # 130/143 are the compiler's cooperative SIGINT/SIGTERM exits. Windows can
    # also surface an unhandled console Ctrl+C as signed or unsigned 0xC000013A.
    return @(130L, 143L, -1073741510L, 3221225786L) -contains $ExitCode
}

function Enable-LegacyRehabSleepPrevention {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TemporaryRoot
    )

    $compilerTemp = Join-Path $TemporaryRoot 'powershell-temp'
    [void](New-Item -ItemType Directory -Path $compilerTemp -Force)
    $previousTemp = $env:TEMP
    $previousTmp = $env:TMP
    try {
        $env:TEMP = $compilerTemp
        $env:TMP = $compilerTemp
        if (-not ([System.Management.Automation.PSTypeName]'DailyClarity.LegacyRehabNativeMethods').Type) {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace DailyClarity {
    public static class LegacyRehabNativeMethods {
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint SetThreadExecutionState(uint executionState);
    }
}
'@
        }

        # ES_CONTINUOUS | ES_SYSTEM_REQUIRED. The display may turn off, but Windows
        # will not enter automatic sleep while the compiler is active.
        # Decimal Int64 literals avoid Windows PowerShell 5 interpreting the
        # high-bit hexadecimal constants as negative Int32 values.
        $executionState = [DailyClarity.LegacyRehabNativeMethods]::SetThreadExecutionState([uint32]2147483649)
        if ($executionState -eq 0) {
            Write-Warning 'Windows sleep prevention could not be enabled. The compiler will continue and remains resumable.'
        }
    }
    catch {
        # Sleep prevention is an operational convenience, never a prerequisite
        # for the durable compiler. Some Windows security tools race Add-Type's
        # temporary C# source file; leases/checkpoints still make interruption safe.
        Write-Warning "Windows sleep prevention could not be initialized: $($_.Exception.Message) The compiler will continue and remains resumable."
    }
    finally {
        $env:TEMP = $previousTemp
        $env:TMP = $previousTmp
    }
}

function Disable-LegacyRehabSleepPrevention {
    if (([System.Management.Automation.PSTypeName]'DailyClarity.LegacyRehabNativeMethods').Type) {
        # ES_CONTINUOUS clears the temporary SYSTEM_REQUIRED request.
        [void][DailyClarity.LegacyRehabNativeMethods]::SetThreadExecutionState([uint32]2147483648)
    }
}

$repositoryRoot = Get-NormalizedFullPath -Path (Split-Path -Parent $PSScriptRoot) -MustExist
$packageJsonPath = Join-Path $repositoryRoot 'package.json'
if (-not (Test-Path -LiteralPath $packageJsonPath -PathType Leaf)) {
    throw "Repository package.json was not found at $packageJsonPath"
}

if ($UsePersistedPath) {
    # Task Scheduler starts the action from the account's persisted environment,
    # not from Codex's process-local dependency PATH. Exercise that exact lookup
    # during installation without modifying the user's PATH.
    $env:PATH = Get-PersistedWindowsPath
}

$resolvedSourceRoot = Get-NormalizedFullPath -Path $SourceRoot -MustExist
if (-not (Test-Path -LiteralPath $resolvedSourceRoot -PathType Container)) {
    throw "Legacy source root is not a directory: $resolvedSourceRoot"
}

if ([string]::IsNullOrWhiteSpace($WorkRoot)) {
    $localApplicationData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localApplicationData)) {
        throw 'Windows LocalApplicationData could not be resolved. Pass -WorkRoot explicitly.'
    }
    $WorkRoot = Join-Path $localApplicationData 'DailyClarity\template-rehab'
}
$resolvedWorkRoot = Get-NormalizedFullPath -Path $WorkRoot

if ((Test-PathIsWithin -Parent $resolvedSourceRoot -Candidate $resolvedWorkRoot) -or
    (Test-PathIsWithin -Parent $resolvedWorkRoot -Candidate $resolvedSourceRoot)) {
    throw "Refusing overlapping source and work roots. Source=$resolvedSourceRoot Work=$resolvedWorkRoot"
}
if ((Test-PathIsWithin -Parent $repositoryRoot -Candidate $resolvedWorkRoot) -or
    (Test-PathIsWithin -Parent $resolvedWorkRoot -Candidate $repositoryRoot)) {
    throw "Refusing a work root that overlaps the code repository. Repository=$repositoryRoot Work=$resolvedWorkRoot"
}
if ($resolvedWorkRoot.Equals([IO.Path]::GetPathRoot($resolvedWorkRoot), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to use a filesystem root as the rehabilitation work root: $resolvedWorkRoot"
}

$packageManager = Resolve-LegacyRehabPackageManager `
    -PackageJsonPath $packageJsonPath `
    -ExplicitPnpmPath $PnpmPath

if ($Preflight) {
    $chromiumPath = Invoke-LegacyRehabPackageManagerProbe `
        -PackageManager $packageManager `
        -RepositoryRoot $repositoryRoot
    Write-Host 'Legacy rehabilitation preflight passed.'
    Write-Host "Package manager: $($packageManager.Kind) -> pnpm $($packageManager.Version)"
    Write-Host "Package-manager executable: $($packageManager.Executable)"
    Write-Host "Playwright Chromium: $chromiumPath"
    Write-Host 'No rehabilitation work-root files were created or modified by this preflight.'
    return
}

[void](New-Item -ItemType Directory -Path $resolvedWorkRoot -Force)
$runnerLogRoot = Join-Path $resolvedWorkRoot 'runner-logs'
[void](New-Item -ItemType Directory -Path $runnerLogRoot -Force)

$compilerArguments = @(
    '--silent',
    '--dir', $repositoryRoot,
    '--filter', '@platform/template-factory',
    'exec', 'tsx', 'src/legacy/cli.ts',
    $Command,
    '--source', $resolvedSourceRoot,
    '--work-root', $resolvedWorkRoot,
    '--rule-version', $RuleVersion,
    '--pilot-size', $PilotSize.ToString([Globalization.CultureInfo]::InvariantCulture),
    '--static-workers', $StaticWorkers.ToString([Globalization.CultureInfo]::InvariantCulture),
    '--chromium-workers', $ChromiumWorkers.ToString([Globalization.CultureInfo]::InvariantCulture),
    '--ai-dollar-cap', $AiDollarCap.ToString([Globalization.CultureInfo]::InvariantCulture),
    '--ai-token-cap', $AiTokenCap.ToString([Globalization.CultureInfo]::InvariantCulture)
)

if ($Command -in @('pilot', 'run')) {
    # A first invocation starts a run; every subsequent invocation resumes the
    # newest matching run and its expired leases/checkpoints.
    $compilerArguments += '--resume'
}
if ($Command -eq 'promote') {
    # The compiler intentionally exposes no live-publish operation.
    $compilerArguments += '--dry-run'
}
if ($Json) {
    $compilerArguments += '--json'
}
if ($CloudRepair) {
    # This opt-in is deliberately absent from the scheduled-task installer.
    # OPENAI_API_KEY is inherited from the operator environment and is never
    # placed in the process arguments, task definition, or runner log.
    $compilerArguments += '--cloud-repair'
}

$effectiveMaxAttempts = $MaxAttempts
if ($effectiveMaxAttempts -eq 0) {
    $effectiveMaxAttempts = if ($Command -eq 'run') { 3 } else { 1 }
}

$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$aggregateLogPath = Join-Path $runnerLogRoot "$runStamp-$Command.log"
$finalExitCode = 1
$intentionalCancellation = $false

Enable-LegacyRehabSleepPrevention -TemporaryRoot $resolvedWorkRoot
try {
    for ($attempt = 1; $attempt -le $effectiveMaxAttempts; $attempt++) {
        $attemptHeader = "[$([DateTimeOffset]::Now.ToString('o'))] command=$Command attempt=$attempt/$effectiveMaxAttempts source=$resolvedSourceRoot work=$resolvedWorkRoot"
        Add-Content -LiteralPath $aggregateLogPath -Value $attemptHeader
        if (-not $Json) {
            Write-Host $attemptHeader
        }

        Push-Location $repositoryRoot
        try {
            # Windows PowerShell 5 converts native stderr lines piped through
            # `2>&1` into formatted ErrorRecord objects. Append native stderr
            # directly to the operator log, stream stdout through Tee, and
            # trust the native exit code. This preserves real diagnostics
            # without turning pnpm's harmless command banner into a failure.
            $nativeErrorPath = Join-Path $runnerLogRoot "$runStamp-$Command-attempt-$attempt.stderr.tmp"
            $previousErrorActionPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try {
                $packageManagerArguments = @($packageManager.PrefixArguments) + $compilerArguments
                & $packageManager.Executable @packageManagerArguments 2> $nativeErrorPath | Tee-Object -FilePath $aggregateLogPath -Append
                $finalExitCode = $LASTEXITCODE
            }
            finally {
                if (Test-Path -LiteralPath $nativeErrorPath -PathType Leaf) {
                    $nativeError = Get-Content -LiteralPath $nativeErrorPath -Raw
                    if ($finalExitCode -ne 0 -and -not [string]::IsNullOrWhiteSpace($nativeError)) {
                        Add-Content -LiteralPath $aggregateLogPath -Value $nativeError
                        [Console]::Error.WriteLine($nativeError)
                    }
                    Remove-Item -LiteralPath $nativeErrorPath -Force
                }
                $ErrorActionPreference = $previousErrorActionPreference
            }
        }
        finally {
            Pop-Location
        }

        if ($finalExitCode -eq 0) {
            break
        }

        if (Test-IntentionalCancellationExitCode -ExitCode ([long]$finalExitCode)) {
            $intentionalCancellation = $true
            $cancelMessage = "Compiler cancellation was requested (exit $finalExitCode). The durable run remains resumable; automatic retry is suppressed."
            Add-Content -LiteralPath $aggregateLogPath -Value $cancelMessage
            if (-not $Json) {
                Write-Host $cancelMessage
            }
            break
        }

        if ($attempt -lt $effectiveMaxAttempts) {
            $retryMessage = "Compiler exited with code $finalExitCode. Retrying in $RetryDelayMinutes minute(s); run will resume from its durable ledger."
            Add-Content -LiteralPath $aggregateLogPath -Value $retryMessage
            if ($Json) {
                [Console]::Error.WriteLine($retryMessage)
            }
            else {
                Write-Host $retryMessage
            }
            Start-Sleep -Seconds ($RetryDelayMinutes * 60)
        }
    }
}
finally {
    Disable-LegacyRehabSleepPrevention
}

if ($intentionalCancellation) {
    # Task Scheduler treats any nonzero wrapper exit as a failure and applies
    # its restart policy. The compiler already recorded distinct exit 130 and
    # a cancelled, resumable run, so translate only at this scheduler boundary.
    if (-not $Json) {
        Write-Host "Legacy rehabilitation was intentionally cancelled. Runner log: $aggregateLogPath"
    }
    exit 0
}

if ($finalExitCode -ne 0) {
    [Console]::Error.WriteLine("Legacy rehabilitation command failed after $effectiveMaxAttempts attempt(s). See $aggregateLogPath")
    exit $finalExitCode
}

if (-not $Json) {
    Write-Host "Legacy rehabilitation command completed. Runner log: $aggregateLogPath"
}
exit 0

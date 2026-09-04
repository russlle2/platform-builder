#requires -Version 5.1

[CmdletBinding()]
param(
    [ValidateSet('inventory', 'pilot', 'run', 'status', 'report', 'promote')]
    [string]$Command = 'run',

    [string]$SourceRoot = 'C:\Users\chris\platform-builder\platform-builder',

    [string]$WorkRoot,

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$')]
    [string]$RuleVersion = 'legacy-rehab-1.0.14',

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

    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

[void](New-Item -ItemType Directory -Path $resolvedWorkRoot -Force)
$runnerLogRoot = Join-Path $resolvedWorkRoot 'runner-logs'
[void](New-Item -ItemType Directory -Path $runnerLogRoot -Force)

$pnpmCommand = Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    $pnpmCommand = Get-Command 'pnpm' -ErrorAction SilentlyContinue
}
if (-not $pnpmCommand) {
    throw 'pnpm was not found on PATH. Install the repository package-manager version before running rehabilitation.'
}

$compilerArguments = @(
    'templates:legacy',
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
        $attemptHeader | Tee-Object -FilePath $aggregateLogPath -Append

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
                & $pnpmCommand.Path @compilerArguments 2> $nativeErrorPath | Tee-Object -FilePath $aggregateLogPath -Append
                $finalExitCode = $LASTEXITCODE
            }
            finally {
                if (Test-Path -LiteralPath $nativeErrorPath -PathType Leaf) {
                    $nativeError = Get-Content -LiteralPath $nativeErrorPath -Raw
                    if ($finalExitCode -ne 0 -and -not [string]::IsNullOrWhiteSpace($nativeError)) {
                        Add-Content -LiteralPath $aggregateLogPath -Value $nativeError
                        Write-Host $nativeError
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
            $cancelMessage | Tee-Object -FilePath $aggregateLogPath -Append
            break
        }

        if ($attempt -lt $effectiveMaxAttempts) {
            $retryMessage = "Compiler exited with code $finalExitCode. Retrying in $RetryDelayMinutes minute(s); run will resume from its durable ledger."
            $retryMessage | Tee-Object -FilePath $aggregateLogPath -Append
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
    Write-Host "Legacy rehabilitation was intentionally cancelled. Runner log: $aggregateLogPath"
    exit 0
}

if ($finalExitCode -ne 0) {
    [Console]::Error.WriteLine("Legacy rehabilitation command failed after $effectiveMaxAttempts attempt(s). See $aggregateLogPath")
    exit $finalExitCode
}

Write-Host "Legacy rehabilitation command completed. Runner log: $aggregateLogPath"
exit 0

# Shared, write-free path validation for the Windows legacy-rehabilitation
# entry points. This file must be loaded before either wrapper creates the work
# root, runner logs, or a scheduled-task definition.

function Get-LegacyRehabCanonicalProspectivePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [switch]$MustExist
    )

    $expandedPath = [Environment]::ExpandEnvironmentVariables($Path)
    $fullPath = [IO.Path]::GetFullPath($expandedPath)
    if ($MustExist -and -not (Test-Path -LiteralPath $fullPath)) {
        throw "Required path does not exist: $fullPath"
    }

    # Node is already a prerequisite for pnpm and the TypeScript compiler. Its
    # native realpath implementation resolves every reparse-point component,
    # unlike Resolve-Path/GetFullPath on Windows. Resolve only the nearest
    # existing ancestor, then append the still-missing suffix without writing.
    $nodeCommand = Get-Command 'node.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $nodeCommand) {
        $nodeCommand = Get-Command 'node' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if (-not $nodeCommand) {
        throw 'Node.js is required to canonicalize legacy-rehabilitation paths safely.'
    }
    $canonicalizer = @'
const fs = require('node:fs');
const path = require('node:path');
const requested = path.resolve(process.argv[1]);
let cursor = requested;
const missing = [];
for (;;) {
  try {
    const canonicalAncestor = fs.realpathSync.native(cursor);
    if (missing.length > 0 && !fs.statSync(cursor).isDirectory()) {
      throw new Error(`The nearest existing ancestor is not a directory: ${cursor}`);
    }
    process.stdout.write(JSON.stringify({ path: path.resolve(canonicalAncestor, ...missing.reverse()) }));
    break;
  } catch (error) {
    if (error && error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    const parent = path.dirname(cursor);
    if (parent === cursor) throw error;
    missing.push(path.basename(cursor));
    cursor = parent;
  }
}
'@
    $canonicalOutput = & $nodeCommand.Source '--eval' $canonicalizer '--' $fullPath
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js failed to canonicalize path: $fullPath"
    }
    $canonicalDocument = ([string]$canonicalOutput) | ConvertFrom-Json
    $canonicalPath = [string]$canonicalDocument.path
    if ([string]::IsNullOrWhiteSpace($canonicalPath)) {
        throw "Node.js returned an empty canonical path: $fullPath"
    }
    $canonicalPath = [IO.Path]::GetFullPath($canonicalPath)
    $pathRoot = [IO.Path]::GetPathRoot($canonicalPath)
    if ($canonicalPath.Equals($pathRoot, [StringComparison]::OrdinalIgnoreCase)) {
        return $pathRoot
    }
    return $canonicalPath.TrimEnd('\', '/')
}

function Test-LegacyRehabPathIsWithin {
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

function Assert-LegacyRehabSafeRoots {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceRoot,

        [Parameter(Mandatory = $true)]
        [string]$WorkRoot,

        [Parameter(Mandatory = $true)]
        [string]$RepositoryRoot
    )

    if ($WorkRoot.Equals([IO.Path]::GetPathRoot($WorkRoot), [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to use a filesystem root as the rehabilitation work root: $WorkRoot"
    }
    if ((Test-LegacyRehabPathIsWithin -Parent $SourceRoot -Candidate $WorkRoot) -or
        (Test-LegacyRehabPathIsWithin -Parent $WorkRoot -Candidate $SourceRoot)) {
        throw "Refusing overlapping source and work roots. Source=$SourceRoot Work=$WorkRoot"
    }
    if ((Test-LegacyRehabPathIsWithin -Parent $RepositoryRoot -Candidate $WorkRoot) -or
        (Test-LegacyRehabPathIsWithin -Parent $WorkRoot -Candidate $RepositoryRoot)) {
        throw "Refusing a work root that overlaps the code repository. Repository=$RepositoryRoot Work=$WorkRoot"
    }
}

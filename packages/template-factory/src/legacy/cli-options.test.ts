import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { LEGACY_CLI_HELP, parseLegacyArgs, runLegacyCli } from './cli.js';

const execFileAsync = promisify(execFile);

test('CLI enforces the model and worker ceilings while accepting lower limits', () => {
  const parsed = parseLegacyArgs([
    'run',
    '--resume',
    '--static-workers', '32',
    '--chromium-workers', '2',
    '--ai-dollar-cap', '12.5',
    '--ai-token-cap', '500000',
  ]);
  assert.equal(parsed.flags.staticWorkers, 32);
  assert.equal(parsed.flags.chromiumWorkers, 2);
  assert.equal(parsed.flags.aiDollarCapUsd, 12.5);
  assert.equal(parsed.flags.aiTokenCap, 500_000);

  assert.throws(() => parseLegacyArgs(['run', '--static-workers', '65']), /at most 64/);
  assert.throws(() => parseLegacyArgs(['run', '--chromium-workers', '7']), /at most 6/);
  assert.throws(() => parseLegacyArgs(['run', '--ai-dollar-cap', '25.01']), /at most 25/);
  assert.throws(() => parseLegacyArgs(['run', '--ai-token-cap', '1000001']), /at most 1000000/);
});

test('operational entry points share the fresh Documents root and versioned runner logs', async () => {
  assert.match(LEGACY_CLI_HELP, /%USERPROFILE%\\Documents\\DailyClarity\\template-rehab/);
  assert.doesNotMatch(LEGACY_CLI_HELP, /LOCALAPPDATA/);

  const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const [runner, installer] = await Promise.all([
    readFile(join(repositoryRoot, 'scripts', 'run-legacy-rehab.ps1'), 'utf8'),
    readFile(join(repositoryRoot, 'scripts', 'install-legacy-rehab-task.ps1'), 'utf8'),
  ]);
  const workRoot = String.raw`C:\Users\chris\Documents\DailyClarity\template-rehab`;
  for (const script of [runner, installer]) {
    assert.match(script, new RegExp(`\\[string\\]\\$WorkRoot = '${workRoot.replace(/\\/g, '\\\\')}'`));
    assert.match(script, /legacy-rehab-1\.0\.23/);
  }
  assert.match(runner, /attempt=\$attempt\/\$effectiveMaxAttempts rule=\$RuleVersion source=/);
  assert.match(
    runner,
    /if \(-not \[string\]::IsNullOrWhiteSpace\(\$nativeError\)\) \{\s*Add-Content[^\n]+\$nativeError/,
  );
});

test('status remains readable when the configured source is temporarily unavailable', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-status-unavailable-source-'));
  const output: string[] = [];
  try {
    const code = await runLegacyCli([
      'status',
      '--source', join(scratch, 'offline-source'),
      '--work-root', join(scratch, 'work'),
      '--json',
    ], {
      io: { stdout: (value) => output.push(value), stderr: (value) => output.push(`error:${value}`) },
    });
    assert.equal(code, 0, output.join('\n'));
    const status = JSON.parse(output.at(-1) ?? '{}') as { databasePath?: unknown; latestRun?: unknown };
    assert.equal(typeof status.databasePath, 'string');
    assert.equal(status.latestRun, null);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('Windows runner rejects a junction escape before creating its work root or logs', {
  skip: process.platform !== 'win32',
}, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-runner-junction-'));
  const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const sourceRoot = join(scratch, 'immutable-source');
  const sourceAlias = join(scratch, 'source-junction');
  const escapedWorkRoot = join(sourceAlias, 'must-not-create');
  const sentinelPath = join(sourceRoot, 'sentinel.txt');
  try {
    await mkdir(sourceRoot);
    await writeFile(sentinelPath, 'immutable\n');
    await symlink(sourceRoot, sourceAlias, 'junction');

    await assert.rejects(
      () => execFileAsync('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', join(repositoryRoot, 'scripts', 'run-legacy-rehab.ps1'),
        '-Command', 'status',
        '-SourceRoot', sourceRoot,
        '-WorkRoot', escapedWorkRoot,
      ], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        timeout: 30_000,
        windowsHide: true,
      }),
      (error: unknown) => {
        const stderr = String((error as { stderr?: unknown }).stderr ?? '');
        assert.match(stderr, /Refusing overlapping source and work roots/);
        return true;
      },
    );
    assert.equal(await readFile(sentinelPath, 'utf8'), 'immutable\n');
    await assert.rejects(access(escapedWorkRoot), { code: 'ENOENT' });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

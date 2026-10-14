import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, parse, resolve } from 'node:path';
import test from 'node:test';
import {
  LEGACY_REPOSITORY_ROOT,
  assertSeparatedRoots,
  atomicWriteFile,
  defaultLegacyWorkRoot,
  durableAtomicWriteFile,
  ensureWorkLayout,
  resolveLegacyConfig,
} from './config.js';
import { hashDirectory, withImmutableSourceGuard } from './hash.js';

test('default work root is the fresh Documents runtime and ignores superseded LocalAppData state', () => {
  const profile = resolve(tmpdir(), 'legacy-profile');
  assert.equal(
    defaultLegacyWorkRoot({ USERPROFILE: profile, LOCALAPPDATA: resolve(tmpdir(), 'superseded') }),
    join(profile, 'Documents', 'DailyClarity', 'template-rehab'),
  );
  assert.equal(
    defaultLegacyWorkRoot({ LOCALAPPDATA: resolve(tmpdir(), 'superseded') }),
    resolve(homedir(), 'Documents', 'DailyClarity', 'template-rehab'),
  );
});

test('config enforces hard model and worker ceilings while preserving lower operator limits', () => {
  const sourceRoot = resolve(tmpdir(), 'legacy-source');
  const workRoot = resolve(tmpdir(), 'legacy-work');
  const lower = resolveLegacyConfig({
    sourceRoot,
    workRoot,
    staticWorkers: 32,
    chromiumWorkers: 2,
    aiDollarCapUsd: 12.5,
    aiTokenCap: 500_000,
  });
  assert.equal(lower.staticWorkers, 32);
  assert.equal(lower.chromiumWorkers, 2);
  assert.equal(lower.aiDollarCapUsd, 12.5);
  assert.equal(lower.aiTokenCap, 500_000);
  assert.throws(() => resolveLegacyConfig({ sourceRoot, workRoot, staticWorkers: 65 }), /at most 64/);
  assert.throws(() => resolveLegacyConfig({ sourceRoot, workRoot, chromiumWorkers: 7 }), /at most 6/);
  assert.throws(() => resolveLegacyConfig({ sourceRoot, workRoot, aiDollarCapUsd: 25.01 }), /at most 25/);
  assert.throws(() => resolveLegacyConfig({ sourceRoot, workRoot, aiTokenCap: 1_000_001 }), /at most 1000000/);
});

test('work layout rejects roots and repository overlap before creating directories', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-root-safety-'));
  const sourceRoot = join(scratch, 'source');
  const repositoryChild = join(LEGACY_REPOSITORY_ROOT, `.legacy-rehab-must-not-create-${process.pid}`);
  try {
    await mkdir(sourceRoot);
    await assert.rejects(
      () => ensureWorkLayout(resolveLegacyConfig({ sourceRoot, workRoot: parse(scratch).root })),
      /filesystem root/,
    );
    await assert.rejects(
      () => ensureWorkLayout(resolveLegacyConfig({ sourceRoot, workRoot: repositoryChild })),
      /code repository/,
    );
    await assert.rejects(access(repositoryChild), { code: 'ENOENT' });
  } finally {
    await rm(repositoryChild, { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test('canonical separation catches a junction ancestor before writing through it', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-junction-safety-'));
  try {
    const sourceRoot = join(scratch, 'source');
    const aliasRoot = join(scratch, 'source-alias');
    const escapedWorkRoot = join(aliasRoot, 'must-not-create');
    await mkdir(sourceRoot);
    await symlink(sourceRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');

    await assert.rejects(
      () => ensureWorkLayout(resolveLegacyConfig({ sourceRoot, workRoot: escapedWorkRoot })),
      /must not overlap/,
    );
    await assert.rejects(access(join(sourceRoot, 'must-not-create')), { code: 'ENOENT' });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('config keeps durable output separate from the immutable source', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-config-'));
  try {
    const sourceRoot = join(scratch, 'source');
    const workRoot = join(scratch, 'work');
    await mkdir(sourceRoot);
    const config = resolveLegacyConfig({ cwd: scratch, sourceRoot, workRoot });
    await ensureWorkLayout(config);

    assert.equal(config.aiDollarCapUsd, 25);
    assert.equal(config.aiTokenCap, 1_000_000);
    assert.equal(config.cloudRepair, false);
    assert.equal(resolveLegacyConfig({ cwd: scratch, sourceRoot, workRoot, cloudRepair: true }).cloudRepair, true);
    assert.throws(
      () => resolveLegacyConfig({ cwd: scratch, sourceRoot, workRoot, pilotSize: 99 }),
      /pilotSize must be at least 100/,
    );
    assert.throws(() => assertSeparatedRoots(sourceRoot, join(sourceRoot, 'output')), /must not overlap/);

    const reportPath = join(config.reportRoot, 'status.json');
    await atomicWriteFile(config, reportPath, '{"pass":true}\n');
    assert.equal(await readFile(reportPath, 'utf8'), '{"pass":true}\n');
    await atomicWriteFile(config, reportPath, '{"pass":"updated"}\n');
    assert.equal(await readFile(reportPath, 'utf8'), '{"pass":"updated"}\n');
    assert.rejects(
      () => atomicWriteFile(config, join(sourceRoot, 'forbidden.json'), '{}'),
      /outside the rehabilitation work root|immutable legacy source/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('durable atomic writes sync the containing directory after rename and tolerate unsupported directory fsync', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-durable-write-'));
  try {
    const target = join(scratch, 'nested', 'artifact.json');
    const syncedDirectories: string[] = [];
    await durableAtomicWriteFile(target, '{"generation":1}\n', {
      directorySync: async (directoryPath) => {
        assert.equal(await readFile(target, 'utf8'), '{"generation":1}\n', 'rename must precede directory fsync');
        syncedDirectories.push(directoryPath);
      },
    });
    assert.deepEqual(syncedDirectories, [join(scratch, 'nested')]);

    const unsupported = Object.assign(new Error('directory fsync unavailable'), { code: 'EINVAL' });
    await durableAtomicWriteFile(target, '{"generation":2}\n', {
      directorySync: async () => { throw unsupported; },
    });
    assert.equal(await readFile(target, 'utf8'), '{"generation":2}\n');

    const mediaFailure = Object.assign(new Error('durability I/O failure'), { code: 'EIO' });
    await assert.rejects(
      () => durableAtomicWriteFile(target, '{"generation":3}\n', {
        directorySync: async () => { throw mediaFailure; },
      }),
      /durability I\/O failure/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('tree hashing is deterministic and immutable guard detects source mutation', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-hash-'));
  try {
    const sourceRoot = join(scratch, 'source');
    await mkdir(join(sourceRoot, 'nested'), { recursive: true });
    await writeFile(join(sourceRoot, 'b.txt'), 'second');
    await writeFile(join(sourceRoot, 'nested', 'a.txt'), 'first');
    const first = await hashDirectory(sourceRoot);
    const second = await hashDirectory(sourceRoot);
    assert.deepEqual(first, second);
    assert.equal(first.files, 2);
    assert.equal(first.bytes, 11);

    await assert.rejects(
      () => withImmutableSourceGuard(sourceRoot, async () => {
        await writeFile(join(sourceRoot, 'nested', 'a.txt'), 'changed');
      }),
      /Immutable source changed/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertSeparatedRoots,
  atomicWriteFile,
  ensureWorkLayout,
  resolveLegacyConfig,
} from './config.js';
import { hashDirectory, withImmutableSourceGuard } from './hash.js';

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

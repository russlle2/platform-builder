import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { reapOrphanedStaging } from './staging.js';

test('orphan reaper empties only the dedicated transient staging directory', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-staging-reaper-'));
  try {
    const sourceRoot = join(scratch, 'source');
    const workRoot = join(scratch, 'work');
    await mkdir(sourceRoot, { recursive: true });
    const config = resolveLegacyConfig({ sourceRoot, workRoot });
    await ensureWorkLayout(config);

    const transientRoot = join(config.artifactRoot, '.staging');
    const candidateSentinel = join(config.artifactRoot, 'candidates', 'keep.txt');
    const promotionSentinel = join(config.artifactRoot, 'promotion', 'keep.txt');
    await mkdir(join(transientRoot, 'visual-alias-abandoned', 'nested'), { recursive: true });
    await mkdir(join(transientRoot, 'promotion-abandoned'), { recursive: true });
    await mkdir(join(config.artifactRoot, 'candidates'), { recursive: true });
    await mkdir(join(config.artifactRoot, 'promotion'), { recursive: true });
    await writeFile(join(transientRoot, 'visual-alias-abandoned', 'nested', 'page.html'), 'orphan');
    await writeFile(join(transientRoot, 'partial.tmp'), 'orphan');
    await writeFile(candidateSentinel, 'candidate');
    await writeFile(promotionSentinel, 'promotion');

    const result = await reapOrphanedStaging(config);
    assert.deepEqual(result.removed, ['partial.tmp', 'promotion-abandoned', 'visual-alias-abandoned']);
    assert.deepEqual(await readdirNames(transientRoot), []);
    assert.equal(await readFile(candidateSentinel, 'utf8'), 'candidate');
    assert.equal(await readFile(promotionSentinel, 'utf8'), 'promotion');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('orphan reaper is idempotent when staging does not exist', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-staging-reaper-empty-'));
  try {
    const sourceRoot = join(scratch, 'source');
    const workRoot = join(scratch, 'work');
    await mkdir(sourceRoot, { recursive: true });
    const config = resolveLegacyConfig({ sourceRoot, workRoot });
    await ensureWorkLayout(config);
    assert.deepEqual((await reapOrphanedStaging(config)).removed, []);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

async function readdirNames(path: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  return (await readdir(path)).sort();
}

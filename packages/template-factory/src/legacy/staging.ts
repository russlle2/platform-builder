import { lstat, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertWorkPath, isPathWithin } from './config.js';
import type { LegacyCompilerConfig } from './types.js';

export interface StagingReapResult {
  root: string;
  removed: string[];
}

/**
 * Remove transient trees left behind by a terminated compiler.
 *
 * Callers must hold the single-writer compiler lock. The content-addressed
 * candidate and promotion caches live outside this dedicated directory and
 * are deliberately never considered here.
 */
export async function reapOrphanedStaging(config: LegacyCompilerConfig): Promise<StagingReapResult> {
  const stagingRoot = assertWorkPath(config, resolve(config.artifactRoot, '.staging'));
  if (!isPathWithin(config.artifactRoot, stagingRoot) || stagingRoot === resolve(config.artifactRoot)) {
    throw new Error(`Refusing to reap an unsafe staging root: ${stagingRoot}`);
  }

  const rootDetails = await lstat(stagingRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!rootDetails) return { root: stagingRoot, removed: [] };
  if (!rootDetails.isDirectory() || rootDetails.isSymbolicLink()) {
    throw new Error(`Refusing to reap a non-directory or symbolic-link staging root: ${stagingRoot}`);
  }

  const removed: string[] = [];
  for (const entry of await readdir(stagingRoot, { withFileTypes: true })) {
    const target = resolve(stagingRoot, entry.name);
    if (!isPathWithin(stagingRoot, target) || target === stagingRoot) {
      throw new Error(`Refusing to reap an unsafe staging entry: ${target}`);
    }
    // rm removes a direct symbolic link rather than following its target. The
    // resolved containment check above ensures no broad/computed target can be
    // selected even if the directory contents are corrupt.
    await rm(target, { recursive: entry.isDirectory() && !entry.isSymbolicLink(), force: true });
    removed.push(entry.name);
  }
  return { root: stagingRoot, removed: removed.sort() };
}

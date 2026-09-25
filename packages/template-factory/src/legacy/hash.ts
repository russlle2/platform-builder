import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readlink } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashFile(filePath: string): Promise<string> {
  const digest = createHash('sha256');
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    digest.update(chunk as Buffer);
  }
  return digest.digest('hex');
}

export interface DirectoryFingerprint {
  algorithm: 'sha256-tree-v1';
  root: string;
  digest: string;
  files: number;
  directories: number;
  symlinks: number;
  bytes: number;
}

/**
 * Content fingerprint used before and after mutation-capable stages to prove that
 * the source catalogue stayed unchanged. Entries are sorted and symlinks are
 * hashed as links; they are never followed.
 */
export async function hashDirectory(rootPath: string): Promise<DirectoryFingerprint> {
  const root = resolve(rootPath);
  const digest = createHash('sha256');
  let files = 0;
  let directories = 0;
  let symlinks = 0;
  let bytes = 0;

  async function visit(directoryPath: string): Promise<void> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));

    for (const entry of entries) {
      const fullPath = join(directoryPath, entry.name);
      const relativePath = relative(root, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        directories += 1;
        digest.update(`d\0${relativePath}\0`);
        await visit(fullPath);
      } else if (entry.isSymbolicLink()) {
        symlinks += 1;
        digest.update(`l\0${relativePath}\0${await readlink(fullPath)}\0`);
      } else if (entry.isFile()) {
        const stats = await lstat(fullPath);
        const contentHash = await hashFile(fullPath);
        files += 1;
        bytes += stats.size;
        digest.update(`f\0${relativePath}\0${stats.size}\0${contentHash}\0`);
      }
    }
  }

  await visit(root);
  return {
    algorithm: 'sha256-tree-v1',
    root,
    digest: digest.digest('hex'),
    files,
    directories,
    symlinks,
    bytes,
  };
}

export function assertFingerprintUnchanged(before: DirectoryFingerprint, after: DirectoryFingerprint): void {
  if (before.root !== after.root || before.digest !== after.digest) {
    throw new Error(`Immutable source changed during rehabilitation: ${before.root}`);
  }
}

export async function withImmutableSourceGuard<T>(sourceRoot: string, operation: () => Promise<T>): Promise<T> {
  const before = await hashDirectory(sourceRoot);
  let result: T;
  let operationError: unknown;
  try {
    result = await operation();
  } catch (error) {
    operationError = error;
    result = undefined as T;
  }

  const after = await hashDirectory(sourceRoot);
  assertFingerprintUnchanged(before, after);
  if (operationError !== undefined) {
    throw operationError;
  }
  return result;
}

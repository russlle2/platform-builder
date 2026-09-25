import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { access, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_AI_DOLLAR_CAP_USD,
  DEFAULT_AI_TOKEN_CAP,
  DEFAULT_LEGACY_RULE_VERSION,
  MAX_AI_DOLLAR_CAP_USD,
  MAX_AI_TOKEN_CAP,
  MAX_LEGACY_CHROMIUM_WORKERS,
  MAX_LEGACY_STATIC_WORKERS,
  MINIMUM_LEGACY_PILOT_SIZE,
  type LegacyCompilerConfig,
} from './types.js';

export const LEGACY_REPOSITORY_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export interface ResolveLegacyConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  sourceRoot?: string;
  workRoot?: string;
  databasePath?: string;
  ruleVersion?: string;
  pilotSize?: number;
  staticWorkers?: number;
  chromiumWorkers?: number;
  aiDollarCapUsd?: number;
  aiTokenCap?: number;
  cloudRepair?: boolean;
}

function finitePositiveInteger(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return selected;
}

function finiteIntegerAtLeast(value: number | undefined, fallback: number, minimum: number, name: string): number {
  const selected = finitePositiveInteger(value, fallback, name);
  if (selected < minimum) throw new Error(`${name} must be at least ${minimum}`);
  return selected;
}

function finitePositiveIntegerAtMost(value: number | undefined, fallback: number, maximum: number, name: string): number {
  const selected = finitePositiveInteger(value, fallback, name);
  if (selected > maximum) throw new Error(`${name} must be at most ${maximum}`);
  return selected;
}

function finitePositiveNumber(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isFinite(selected) || selected <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return selected;
}

function finitePositiveNumberAtMost(value: number | undefined, fallback: number, maximum: number, name: string): number {
  const selected = finitePositiveNumber(value, fallback, name);
  if (selected > maximum) throw new Error(`${name} must be at most ${maximum}`);
  return selected;
}

function resolveFrom(base: string, value: string): string {
  return resolve(isAbsolute(value) ? value : join(base, value));
}

export function defaultLegacyWorkRoot(env: NodeJS.ProcessEnv = process.env): string {
  const userProfile = env.USERPROFILE?.trim() || homedir();
  return resolve(userProfile, 'Documents', 'DailyClarity', 'template-rehab');
}

export function resolveLegacyConfig(options: ResolveLegacyConfigOptions = {}): LegacyCompilerConfig {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;
  const sourceSetting = options.sourceRoot ?? env.DAILY_CLARITY_LEGACY_SOURCE ?? join(cwd, 'generated_templates');
  const workSetting = options.workRoot ?? env.DAILY_CLARITY_TEMPLATE_REHAB_ROOT ?? defaultLegacyWorkRoot(env);
  const sourceRoot = resolveFrom(cwd, sourceSetting);
  const workRoot = resolveFrom(cwd, workSetting);
  const databasePath = options.databasePath
    ? resolveFrom(workRoot, options.databasePath)
    : join(workRoot, 'ledger.sqlite');

  return {
    sourceRoot,
    workRoot,
    databasePath,
    artifactRoot: join(workRoot, 'artifacts'),
    blobRoot: join(workRoot, 'blobs', 'sha256'),
    renderRoot: join(workRoot, 'renders'),
    reportRoot: join(workRoot, 'reports'),
    logRoot: join(workRoot, 'logs'),
    ruleVersion: options.ruleVersion?.trim() || DEFAULT_LEGACY_RULE_VERSION,
    pilotSize: finiteIntegerAtLeast(options.pilotSize, MINIMUM_LEGACY_PILOT_SIZE, MINIMUM_LEGACY_PILOT_SIZE, 'pilotSize'),
    staticWorkers: finitePositiveIntegerAtMost(options.staticWorkers, 8, MAX_LEGACY_STATIC_WORKERS, 'staticWorkers'),
    chromiumWorkers: finitePositiveIntegerAtMost(options.chromiumWorkers, 4, MAX_LEGACY_CHROMIUM_WORKERS, 'chromiumWorkers'),
    aiDollarCapUsd: finitePositiveNumberAtMost(
      options.aiDollarCapUsd,
      DEFAULT_AI_DOLLAR_CAP_USD,
      MAX_AI_DOLLAR_CAP_USD,
      'aiDollarCapUsd',
    ),
    aiTokenCap: finitePositiveIntegerAtMost(
      options.aiTokenCap,
      DEFAULT_AI_TOKEN_CAP,
      MAX_AI_TOKEN_CAP,
      'aiTokenCap',
    ),
    cloudRepair: options.cloudRepair === true,
  };
}

function normalizedForComparison(path: string): string {
  const resolvedPath = resolve(path);
  const normalized = resolvedPath === parse(resolvedPath).root
    ? resolvedPath
    : resolvedPath.replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLocaleLowerCase('en-US') : normalized;
}

export function isPathWithin(parentPath: string, candidatePath: string): boolean {
  const parent = normalizedForComparison(parentPath);
  const candidate = normalizedForComparison(candidatePath);
  const pathDifference = relative(parent, candidate);
  return pathDifference === '' || (!pathDifference.startsWith(`..${sep}`) && pathDifference !== '..' && !isAbsolute(pathDifference));
}

/**
 * Refuse any source/output overlap. This prevents a typo from turning the immutable
 * catalogue into a destination, and also prevents a source scan from ingesting its
 * own generated work products.
 */
export function assertSeparatedRoots(sourceRoot: string, workRoot: string): void {
  if (isPathWithin(sourceRoot, workRoot) || isPathWithin(workRoot, sourceRoot)) {
    throw new Error(`Legacy source and work roots must not overlap: source=${sourceRoot} work=${workRoot}`);
  }
}

export function assertSafeLegacyRoots(
  sourceRoot: string,
  workRoot: string,
  repositoryRoot = LEGACY_REPOSITORY_ROOT,
): void {
  const resolvedWorkRoot = resolve(workRoot);
  if (normalizedForComparison(resolvedWorkRoot) === normalizedForComparison(parse(resolvedWorkRoot).root)) {
    throw new Error(`Legacy rehabilitation work root may not be a filesystem root: ${resolvedWorkRoot}`);
  }
  assertSeparatedRoots(sourceRoot, resolvedWorkRoot);
  if (isPathWithin(repositoryRoot, resolvedWorkRoot) || isPathWithin(resolvedWorkRoot, repositoryRoot)) {
    throw new Error(
      `Legacy rehabilitation work root must not overlap the code repository: `
      + `repository=${resolve(repositoryRoot)} work=${resolvedWorkRoot}`,
    );
  }
}

/**
 * Resolve an existing path through every junction/symlink. For a path that does
 * not exist yet, resolve its nearest existing ancestor and append only the
 * missing suffix. Startup can therefore prove separation before mkdir touches
 * the requested destination.
 */
export async function canonicalizeProspectivePath(path: string): Promise<string> {
  let cursor = resolve(path);
  const missingSegments: string[] = [];
  while (true) {
    try {
      const canonicalAncestor = await realpath(cursor);
      return resolve(canonicalAncestor, ...missingSegments.reverse());
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
      const parent = dirname(cursor);
      if (parent === cursor) throw error;
      missingSegments.push(basename(cursor));
      cursor = parent;
    }
  }
}

async function canonicalRootSet(config: LegacyCompilerConfig): Promise<{
  sourceRoot: string;
  workRoot: string;
  repositoryRoot: string;
}> {
  const [sourceRoot, workRoot, repositoryRoot] = await Promise.all([
    canonicalizeProspectivePath(config.sourceRoot),
    canonicalizeProspectivePath(config.workRoot),
    canonicalizeProspectivePath(LEGACY_REPOSITORY_ROOT),
  ]);
  assertSafeLegacyRoots(sourceRoot, workRoot, repositoryRoot);
  return { sourceRoot, workRoot, repositoryRoot };
}

function assertCanonicalWorkTarget(
  roots: { sourceRoot: string; workRoot: string; repositoryRoot: string },
  target: string,
): void {
  if (!isPathWithin(roots.workRoot, target)) {
    throw new Error(`Rehabilitation work path escapes the canonical work root: ${target}`);
  }
  if (isPathWithin(roots.sourceRoot, target)) {
    throw new Error(`Rehabilitation work path resolves inside the immutable source: ${target}`);
  }
  if (isPathWithin(roots.repositoryRoot, target)) {
    throw new Error(`Rehabilitation work path resolves inside the code repository: ${target}`);
  }
}

export function assertWorkPath(config: LegacyCompilerConfig, targetPath: string): string {
  assertSafeLegacyRoots(config.sourceRoot, config.workRoot);
  const resolvedTarget = resolve(targetPath);
  if (!isPathWithin(config.workRoot, resolvedTarget)) {
    throw new Error(`Refusing to write outside the rehabilitation work root: ${resolvedTarget}`);
  }
  if (isPathWithin(config.sourceRoot, resolvedTarget)) {
    throw new Error(`Refusing to write inside the immutable legacy source: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

export async function ensureWorkLayout(config: LegacyCompilerConfig): Promise<void> {
  assertSafeLegacyRoots(config.sourceRoot, config.workRoot);
  assertWorkPath(config, config.databasePath);
  // This canonical check must precede even creation of the work root. A
  // lexically separate path can still traverse a junction into the source or
  // repository.
  const prospectiveRoots = await canonicalRootSet(config);
  await mkdir(config.workRoot, { recursive: true });
  const roots = { ...prospectiveRoots, workRoot: await realpath(config.workRoot) };
  assertSafeLegacyRoots(roots.sourceRoot, roots.workRoot, roots.repositoryRoot);

  const layoutPaths = [
    config.artifactRoot,
    config.blobRoot,
    config.renderRoot,
    config.reportRoot,
    config.logRoot,
  ];
  const prospectiveTargets = await Promise.all([
    ...layoutPaths.map((path) => canonicalizeProspectivePath(path)),
    canonicalizeProspectivePath(config.databasePath),
  ]);
  for (const target of prospectiveTargets) assertCanonicalWorkTarget(roots, target);

  for (const path of layoutPaths) {
    await mkdir(path, { recursive: true });
    assertCanonicalWorkTarget(roots, await realpath(path));
  }
}

export async function assertReadableSource(config: LegacyCompilerConfig): Promise<void> {
  assertSafeLegacyRoots(config.sourceRoot, config.workRoot);
  await access(config.sourceRoot, constants.R_OK);
  const canonicalSource = await realpath(config.sourceRoot);
  const canonicalWork = await realpath(config.workRoot);
  const canonicalRepository = await realpath(LEGACY_REPOSITORY_ROOT);
  assertSafeLegacyRoots(canonicalSource, canonicalWork, canonicalRepository);
}

type DirectorySync = (directoryPath: string) => Promise<void>;

export interface DurableAtomicWriteOptions {
  /** Injectable for focused durability tests; production callers use fsync. */
  directorySync?: DirectorySync;
}

const UNSUPPORTED_DIRECTORY_SYNC_CODES = new Set([
  'EACCES',
  'EBADF',
  'EINVAL',
  'EISDIR',
  'ENOSYS',
  'ENOTSUP',
  'EOPNOTSUPP',
  'EPERM',
]);

function isUnsupportedDirectorySync(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' && UNSUPPORTED_DIRECTORY_SYNC_CODES.has(code);
}

async function fsyncDirectory(directoryPath: string): Promise<void> {
  const handle = await open(directoryPath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectoryWithFallback(
  directoryPath: string,
  directorySync: DirectorySync,
): Promise<void> {
  try {
    await directorySync(directoryPath);
  } catch (error) {
    // Windows and some virtual/network filesystems cannot open or fsync a
    // directory. Only explicit "unsupported/inaccessible directory handle"
    // errors use this fallback; media and I/O failures still fail the write.
    if (!isUnsupportedDirectorySync(error)) throw error;
  }
}

/**
 * Atomically replace one file and make the replacement durable before return.
 * The file is fsynced before rename and its containing directory is fsynced
 * afterwards wherever the host filesystem supports directory handles.
 */
export async function durableAtomicWriteFile(
  targetPath: string,
  contents: string | Uint8Array,
  options: DurableAtomicWriteOptions = {},
): Promise<void> {
  const targetDirectory = dirname(targetPath);
  await mkdir(targetDirectory, { recursive: true });
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  let temporaryCreated = false;
  let renamed = false;

  try {
    const handle = await open(temporaryPath, 'wx');
    temporaryCreated = true;
    try {
      await handle.writeFile(contents);
      await handle.sync();
    } finally {
      await handle.close();
    }

    await rename(temporaryPath, targetPath);
    renamed = true;
    await syncDirectoryWithFallback(targetDirectory, options.directorySync ?? fsyncDirectory);
  } catch (error) {
    if (temporaryCreated && !renamed) await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function atomicWriteFile(
  config: LegacyCompilerConfig,
  targetPath: string,
  contents: string | Uint8Array,
): Promise<void> {
  const safeTarget = assertWorkPath(config, targetPath);
  await durableAtomicWriteFile(safeTarget, contents);
}

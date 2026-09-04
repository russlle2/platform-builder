import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { access, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  DEFAULT_AI_DOLLAR_CAP_USD,
  DEFAULT_AI_TOKEN_CAP,
  DEFAULT_LEGACY_RULE_VERSION,
  MINIMUM_LEGACY_PILOT_SIZE,
  type LegacyCompilerConfig,
} from './types.js';

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

function finitePositiveNumber(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isFinite(selected) || selected <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return selected;
}

function resolveFrom(base: string, value: string): string {
  return resolve(isAbsolute(value) ? value : join(base, value));
}

export function defaultLegacyWorkRoot(env: NodeJS.ProcessEnv = process.env): string {
  const localAppData = env.LOCALAPPDATA?.trim();
  if (localAppData) {
    return resolve(localAppData, 'DailyClarity', 'template-rehab');
  }

  const xdgStateHome = env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) {
    return resolve(xdgStateHome, 'DailyClarity', 'template-rehab');
  }

  return resolve(homedir(), '.local', 'state', 'DailyClarity', 'template-rehab');
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
    staticWorkers: finitePositiveInteger(options.staticWorkers, 8, 'staticWorkers'),
    chromiumWorkers: finitePositiveInteger(options.chromiumWorkers, 4, 'chromiumWorkers'),
    aiDollarCapUsd: finitePositiveNumber(options.aiDollarCapUsd, DEFAULT_AI_DOLLAR_CAP_USD, 'aiDollarCapUsd'),
    aiTokenCap: finitePositiveInteger(options.aiTokenCap, DEFAULT_AI_TOKEN_CAP, 'aiTokenCap'),
  };
}

function normalizedForComparison(path: string): string {
  const normalized = resolve(path).replace(/[\\/]+$/, '');
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

export function assertWorkPath(config: LegacyCompilerConfig, targetPath: string): string {
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
  assertSeparatedRoots(config.sourceRoot, config.workRoot);
  assertWorkPath(config, config.databasePath);
  await Promise.all([
    mkdir(config.workRoot, { recursive: true }),
    mkdir(config.artifactRoot, { recursive: true }),
    mkdir(config.blobRoot, { recursive: true }),
    mkdir(config.renderRoot, { recursive: true }),
    mkdir(config.reportRoot, { recursive: true }),
    mkdir(config.logRoot, { recursive: true }),
  ]);
}

export async function assertReadableSource(config: LegacyCompilerConfig): Promise<void> {
  assertSeparatedRoots(config.sourceRoot, config.workRoot);
  await access(config.sourceRoot, constants.R_OK);
  const canonicalSource = await realpath(config.sourceRoot);
  const canonicalWork = await realpath(config.workRoot);
  assertSeparatedRoots(canonicalSource, canonicalWork);
}

export async function atomicWriteFile(
  config: LegacyCompilerConfig,
  targetPath: string,
  contents: string | Uint8Array,
): Promise<void> {
  const safeTarget = assertWorkPath(config, targetPath);
  await mkdir(dirname(safeTarget), { recursive: true });
  const temporaryPath = `${safeTarget}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  const handle = await open(temporaryPath, 'wx');

  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(temporaryPath, safeTarget);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

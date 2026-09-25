#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { link, open, readFile, stat, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  assertReadableSource,
  atomicWriteFile,
  ensureWorkLayout,
  resolveLegacyConfig,
} from './config.js';
import { LegacyLedger } from './ledger.js';
import { NativeOpenAIBatchClient } from './openai-batch-client.js';
import type { CloudRepairBatchClient } from './cloud-lane.js';
import { reapOrphanedStaging } from './staging.js';
import {
  LEGACY_CANCEL_EXIT_CODE,
  LEGACY_COMMANDS,
  MAX_AI_DOLLAR_CAP_USD,
  MAX_AI_TOKEN_CAP,
  MAX_LEGACY_CHROMIUM_WORKERS,
  MAX_LEGACY_STATIC_WORKERS,
  MINIMUM_LEGACY_PILOT_SIZE,
  LegacyCancellationError,
  throwIfLegacyCancelled,
  type LegacyCliFlags,
  type LegacyCliIo,
  type LegacyCommandContext,
  type LegacyCommandName,
  type LegacyCommandOutcome,
  type LegacyCommandServices,
  type ParsedLegacyArgs,
} from './types.js';

const HELP = `Legacy Catalogue Rehabilitation Compiler

Usage:
  templates:legacy inventory [options]
  templates:legacy pilot [--resume] [options]
  templates:legacy run --resume [options]
  templates:legacy status [--json] [options]
  templates:legacy report [--json] [options]
  templates:legacy promote --dry-run [options]

Options:
  --source <path>              Immutable legacy catalogue root
  --work-root <path>           Durable output root (default: %USERPROFILE%\\Documents\\DailyClarity\\template-rehab)
  --db <path>                  SQLite ledger path inside work root
  --rule-version <version>     Deterministic repair rule version
  --pilot-size <count>         Stratified pilot size (minimum/default: 100)
  --static-workers <count>     Static repair workers (default: 8; maximum: 64)
  --chromium-workers <count>   Browser workers (default: 4; maximum: 6)
  --ai-dollar-cap <usd>        Hard model spend cap (default/maximum: 25)
  --ai-token-cap <count>       Hard aggregate token cap (default/maximum: 1000000)
  --cloud-repair               Explicitly enable the capped OpenAI fragment-repair lane
  --resume                     Resume the newest matching interrupted pilot/full run
  --dry-run                    Required for promote; never mutates publication state
  --json                       Emit machine-readable output
  --help                       Show this help
`;

export interface LegacyCliDependencies {
  services?: LegacyCommandServices;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  io?: LegacyCliIo;
  signal?: AbortSignal;
  /** Offline tests and controlled callers can inject a client without a credential. */
  cloudRepairClient?: CloudRepairBatchClient;
  /** Deterministic tests can replace platform process inspection. */
  processInspector?: LegacyProcessInspector;
}

export interface LegacyProcessIdentity {
  executable: string;
  commandLine: string;
  startedAtMs: number;
  /** Identifies the inspection mechanism so formatting changes are fail-safe. */
  source: string;
}

export type LegacyProcessInspection =
  | { state: 'not-running' }
  | { state: 'running'; identity?: LegacyProcessIdentity };

export type LegacyProcessInspector = (pid: number) => Promise<LegacyProcessInspection>;

function optionValue(argv: string[], index: number, inlineValue: string | undefined, option: string): [string, number] {
  if (inlineValue !== undefined) {
    if (!inlineValue) throw new Error(`${option} requires a value`);
    return [inlineValue, index];
  }
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return [value, index + 1];
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${option} must be a positive integer`);
  return parsed;
}

function positiveNumber(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${option} must be a positive number`);
  return parsed;
}

function positiveIntegerAtMost(value: string, option: string, maximum: number): number {
  const parsed = positiveInteger(value, option);
  if (parsed > maximum) throw new Error(`${option} must be at most ${maximum}`);
  return parsed;
}

function positiveNumberAtMost(value: string, option: string, maximum: number): number {
  const parsed = positiveNumber(value, option);
  if (parsed > maximum) throw new Error(`${option} must be at most ${maximum}`);
  return parsed;
}

export function parseLegacyArgs(argv: string[]): ParsedLegacyArgs {
  const command = argv[0] as LegacyCommandName | undefined;
  if (!command || !LEGACY_COMMANDS.includes(command)) {
    throw new Error(command ? `Unknown command: ${command}` : 'A command is required');
  }

  const flags: LegacyCliFlags = { resume: false, dryRun: false, json: false, cloudRepair: false };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--resume') {
      flags.resume = true;
      continue;
    }
    if (argument === '--dry-run') {
      flags.dryRun = true;
      continue;
    }
    if (argument === '--json') {
      flags.json = true;
      continue;
    }
    if (argument === '--cloud-repair') {
      flags.cloudRepair = true;
      continue;
    }

    const separator = argument.indexOf('=');
    const option = separator >= 0 ? argument.slice(0, separator) : argument;
    const inlineValue = separator >= 0 ? argument.slice(separator + 1) : undefined;
    const [value, consumedIndex] = optionValue(argv, index, inlineValue, option);
    index = consumedIndex;

    switch (option) {
      case '--source': flags.sourceRoot = value; break;
      case '--work-root': flags.workRoot = value; break;
      case '--db': flags.databasePath = value; break;
      case '--rule-version': flags.ruleVersion = value; break;
      case '--pilot-size': flags.pilotSize = positiveInteger(value, option); break;
      case '--static-workers': flags.staticWorkers = positiveIntegerAtMost(value, option, MAX_LEGACY_STATIC_WORKERS); break;
      case '--chromium-workers': flags.chromiumWorkers = positiveIntegerAtMost(value, option, MAX_LEGACY_CHROMIUM_WORKERS); break;
      case '--ai-dollar-cap': flags.aiDollarCapUsd = positiveNumberAtMost(value, option, MAX_AI_DOLLAR_CAP_USD); break;
      case '--ai-token-cap': flags.aiTokenCap = positiveIntegerAtMost(value, option, MAX_AI_TOKEN_CAP); break;
      default: throw new Error(`Unknown option: ${option}`);
    }
  }

  if (flags.resume && command !== 'run' && command !== 'pilot') {
    throw new Error('--resume is only valid with the pilot or run command');
  }
  if (flags.cloudRepair && command !== 'run' && command !== 'pilot') {
    throw new Error('--cloud-repair is only valid with the pilot or run command');
  }
  if (flags.pilotSize !== undefined && flags.pilotSize < MINIMUM_LEGACY_PILOT_SIZE) {
    throw new Error(`--pilot-size must be at least ${MINIMUM_LEGACY_PILOT_SIZE}`);
  }
  if (command === 'run' && !flags.resume) {
    // A fresh run is valid. This branch documents that resume is deliberately opt-in.
  }
  if (command === 'promote' && !flags.dryRun) {
    throw new Error('Promotion is safety-gated: use promote --dry-run. Live publication is a separate workflow.');
  }
  return { command, flags };
}

function outputJson(io: LegacyCliIo, value: unknown): void {
  io.stdout(JSON.stringify(value, null, 2));
}

async function processIsAlive(pid: number): Promise<boolean> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

const execFileAsync = promisify(execFile);
const PROCESS_START_TOLERANCE_MS = 5_000;
export const LEGACY_RUN_HEARTBEAT_STALE_MS = 30 * 60_000;

export interface LegacyRunActivity {
  state: 'active' | 'inactive' | 'orphaned' | 'stale' | 'unknown';
  reason:
    | 'live-compiler'
    | 'latest-run-not-running'
    | 'no-run'
    | 'missing-compiler-lock'
    | 'malformed-compiler-lock'
    | 'compiler-lock-initializing'
    | 'compiler-lock-unreadable'
    | 'compiler-process-not-running'
    | 'compiler-owner-mismatch'
    | 'compiler-owner-unverifiable'
    | 'compiler-owner-identity-uncertain'
    | 'stale-run-heartbeat'
    | 'invalid-run-heartbeat';
  lockPid: number | null;
  heartbeatAgeMs: number | null;
}

interface CompilerLockOwner {
  executable: string;
  commandHash: string;
  processStartedAtMs: number;
  inspectionSource: string;
}

interface CompilerLockRecord {
  version?: unknown;
  pid?: unknown;
  token?: unknown;
  startedAt?: unknown;
  owner?: unknown;
}

function selfFallbackIdentity(): LegacyProcessIdentity {
  return {
    executable: process.execPath,
    commandLine: process.argv.join(' '),
    startedAtMs: Date.now() - process.uptime() * 1_000,
    source: 'self-fallback',
  };
}

async function inspectWindowsProcess(pid: number): Promise<LegacyProcessIdentity | null> {
  const script = [
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction Stop`,
    'if ($null -eq $p) { exit 3 }',
    '$startedAtMs = ([DateTimeOffset]$p.CreationDate).ToUniversalTime().ToUnixTimeMilliseconds()',
    '[pscustomobject]@{ executable = [string]$p.ExecutablePath; commandLine = [string]$p.CommandLine; startedAtMs = $startedAtMs } | ConvertTo-Json -Compress',
  ].join('; ');
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script,
  ], { encoding: 'utf8', timeout: 5_000, windowsHide: true, maxBuffer: 64 * 1024 });
  const parsed = JSON.parse(String(stdout)) as {
    executable?: unknown;
    commandLine?: unknown;
    startedAtMs?: unknown;
  };
  if (
    typeof parsed.executable !== 'string'
    || !parsed.executable.trim()
    || typeof parsed.commandLine !== 'string'
    || !parsed.commandLine.trim()
    || typeof parsed.startedAtMs !== 'number'
    || !Number.isFinite(parsed.startedAtMs)
  ) return null;
  return {
    executable: parsed.executable,
    commandLine: parsed.commandLine,
    startedAtMs: parsed.startedAtMs,
    source: 'windows-cim',
  };
}

async function inspectPosixProcess(pid: number): Promise<LegacyProcessIdentity | null> {
  const { stdout } = await execFileAsync('ps', [
    '-p', String(pid), '-o', 'lstart=', '-o', 'comm=', '-o', 'args=',
  ], { encoding: 'utf8', timeout: 5_000, windowsHide: true, maxBuffer: 64 * 1024 });
  const line = String(stdout).split(/\r?\n/u).find((candidate) => candidate.trim())?.trim();
  if (!line || line.length < 25) return null;
  const startedAtMs = Date.parse(line.slice(0, 24));
  const processText = line.slice(24).trim();
  const executable = processText.split(/\s+/u)[0] ?? '';
  if (!Number.isFinite(startedAtMs) || !executable || !processText) return null;
  return { executable, commandLine: processText, startedAtMs, source: 'posix-ps' };
}

async function inspectProcess(pid: number): Promise<LegacyProcessInspection> {
  if (!await processIsAlive(pid)) return { state: 'not-running' };
  try {
    const identity = process.platform === 'win32'
      ? await inspectWindowsProcess(pid)
      : await inspectPosixProcess(pid);
    if (identity) return { state: 'running', identity };
  } catch {
    // A process can exit between kill(0) and inspection. Check once more before
    // conservatively treating an inaccessible live process as the lock owner.
  }
  if (!await processIsAlive(pid)) return { state: 'not-running' };
  return pid === process.pid
    ? { state: 'running', identity: selfFallbackIdentity() }
    : { state: 'running' };
}

function normalizedExecutable(value: string): string {
  const normalized = value.trim().replace(/^"|"$/gu, '').replace(/\\/gu, '/');
  return process.platform === 'win32' ? normalized.toLocaleLowerCase('en-US') : normalized;
}

function normalizedCommand(value: string): string {
  const normalized = value.trim().replace(/\s+/gu, ' ').replace(/\\/gu, '/');
  return process.platform === 'win32' ? normalized.toLocaleLowerCase('en-US') : normalized;
}

function commandHash(commandLine: string): string {
  return createHash('sha256').update(normalizedCommand(commandLine)).digest('hex');
}

function lockOwnerFromIdentity(identity: LegacyProcessIdentity): CompilerLockOwner {
  return {
    executable: normalizedExecutable(identity.executable),
    commandHash: commandHash(identity.commandLine),
    processStartedAtMs: identity.startedAtMs,
    inspectionSource: identity.source,
  };
}

function parseLockOwner(value: unknown): CompilerLockOwner | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CompilerLockOwner>;
  if (
    typeof candidate.executable !== 'string'
    || !candidate.executable
    || typeof candidate.commandHash !== 'string'
    || !/^[a-f\d]{64}$/u.test(candidate.commandHash)
    || typeof candidate.processStartedAtMs !== 'number'
    || !Number.isFinite(candidate.processStartedAtMs)
    || typeof candidate.inspectionSource !== 'string'
    || !candidate.inspectionSource
  ) return null;
  return candidate as CompilerLockOwner;
}

function compareOwnerIdentity(
  expected: CompilerLockOwner,
  observed: LegacyProcessIdentity,
): 'same' | 'different' | 'uncertain' {
  const startDelta = Math.abs(expected.processStartedAtMs - observed.startedAtMs);
  if (startDelta > PROCESS_START_TOLERANCE_MS) return 'different';
  // Different inspection mechanisms may format executable paths and argv in
  // incompatible ways. A close start time is not enough to prove ownership,
  // so retain the lock rather than risk admitting two writers.
  if (expected.inspectionSource !== observed.source) return 'uncertain';
  return expected.executable === normalizedExecutable(observed.executable)
    && expected.commandHash === commandHash(observed.commandLine)
    ? 'same'
    : 'different';
}

function looksLikeLegacyCompiler(identity: LegacyProcessIdentity): boolean {
  const command = normalizedCommand(identity.commandLine);
  return /(?:templates:legacy|legacy\/cli(?:\.[cm]?[jt]s)?)(?:\s|$)/u.test(command);
}

async function lockBelongsToLiveCompiler(
  record: CompilerLockRecord,
  inspector: LegacyProcessInspector,
): Promise<boolean> {
  if (typeof record.pid !== 'number' || !Number.isSafeInteger(record.pid) || record.pid <= 0) return false;
  const inspection = await inspector(record.pid);
  if (inspection.state === 'not-running') return false;
  // This preserves self-exclusion for embedded/test callers and cannot be a
  // recycled PID because the current process necessarily owns that PID now.
  if (record.pid === process.pid) return true;
  if (!inspection.identity) return true; // Permission/inspection failure: fail safe.

  const expected = parseLockOwner(record.owner);
  if (expected) return compareOwnerIdentity(expected, inspection.identity) !== 'different';

  // Version-one locks did not record process identity. Recover one only when
  // inspection positively shows an unrelated process, or a process born well
  // after the lock (the PID-reuse case). Ambiguous/inaccessible processes were
  // handled above and remain locked.
  const lockStartedAtMs = typeof record.startedAt === 'string' ? Date.parse(record.startedAt) : Number.NaN;
  if (Number.isFinite(lockStartedAtMs) && inspection.identity.startedAtMs > lockStartedAtMs + PROCESS_START_TOLERANCE_MS) {
    return false;
  }
  return looksLikeLegacyCompiler(inspection.identity);
}

/**
 * Read-only observation of the durable run row and compiler lock. This never
 * reclaims a lock or changes the ledger; it exists so `status` does not present
 * an abandoned `running` row as proof that work is still progressing.
 */
export async function inspectLegacyRunActivity(
  workRoot: string,
  latestRun: ReturnType<LegacyLedger['latestRun']>,
  inspector: LegacyProcessInspector = inspectProcess,
  nowMs = Date.now(),
): Promise<LegacyRunActivity> {
  if (!latestRun) {
    return { state: 'inactive', reason: 'no-run', lockPid: null, heartbeatAgeMs: null };
  }
  const updatedAtMs = Date.parse(latestRun.updatedAt);
  const heartbeatAgeMs = Number.isFinite(updatedAtMs) ? Math.max(0, nowMs - updatedAtMs) : null;
  if (latestRun.state !== 'running') {
    return { state: 'inactive', reason: 'latest-run-not-running', lockPid: null, heartbeatAgeMs };
  }

  const lockPath = join(workRoot, '.compiler.lock');
  let raw: string;
  try {
    raw = await readFile(lockPath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      state: code === 'ENOENT' ? 'orphaned' : 'unknown',
      reason: code === 'ENOENT' ? 'missing-compiler-lock' : 'compiler-lock-unreadable',
      lockPid: null,
      heartbeatAgeMs,
    };
  }

  let record: CompilerLockRecord;
  try {
    record = JSON.parse(raw) as CompilerLockRecord;
  } catch {
    const lockStat = await stat(lockPath).catch(() => null);
    const initializing = Boolean(lockStat && nowMs - lockStat.mtimeMs < 30_000);
    return {
      state: initializing ? 'unknown' : 'orphaned',
      reason: initializing ? 'compiler-lock-initializing' : 'malformed-compiler-lock',
      lockPid: null,
      heartbeatAgeMs,
    };
  }
  const lockPid = typeof record.pid === 'number' && Number.isSafeInteger(record.pid) && record.pid > 0
    ? record.pid
    : null;
  if (lockPid === null) {
    const lockStat = await stat(lockPath).catch(() => null);
    const initializing = Boolean(lockStat && nowMs - lockStat.mtimeMs < 30_000);
    return {
      state: initializing ? 'unknown' : 'orphaned',
      reason: initializing ? 'compiler-lock-initializing' : 'malformed-compiler-lock',
      lockPid: null,
      heartbeatAgeMs,
    };
  }

  let inspection: LegacyProcessInspection;
  try {
    inspection = await inspector(lockPid);
  } catch {
    inspection = { state: 'running' };
  }
  if (inspection.state === 'not-running') {
    return {
      state: 'orphaned',
      reason: 'compiler-process-not-running',
      lockPid,
      heartbeatAgeMs,
    };
  }
  if (!inspection.identity) {
    return heartbeatAgeMs === null || heartbeatAgeMs > LEGACY_RUN_HEARTBEAT_STALE_MS
      ? {
          state: 'stale',
          reason: heartbeatAgeMs === null ? 'invalid-run-heartbeat' : 'stale-run-heartbeat',
          lockPid,
          heartbeatAgeMs,
        }
      : {
          state: 'unknown',
          reason: 'compiler-owner-unverifiable',
          lockPid,
          heartbeatAgeMs,
        };
  }

  const expected = parseLockOwner(record.owner);
  if (expected) {
    const comparison = compareOwnerIdentity(expected, inspection.identity);
    if (comparison === 'different') {
      return { state: 'orphaned', reason: 'compiler-owner-mismatch', lockPid, heartbeatAgeMs };
    }
    if (comparison === 'uncertain') {
      return heartbeatAgeMs === null || heartbeatAgeMs > LEGACY_RUN_HEARTBEAT_STALE_MS
        ? {
            state: 'stale',
            reason: heartbeatAgeMs === null ? 'invalid-run-heartbeat' : 'stale-run-heartbeat',
            lockPid,
            heartbeatAgeMs,
          }
        : {
            state: 'unknown',
            reason: 'compiler-owner-identity-uncertain',
            lockPid,
            heartbeatAgeMs,
          };
    }
    // A positively matched lock owner is stronger liveness evidence than the
    // run-row heartbeat. Inventory, composition, or an unusually slow browser
    // batch can legitimately go longer than the advisory heartbeat interval.
    return { state: 'active', reason: 'live-compiler', lockPid, heartbeatAgeMs };
  } else {
    const lockStartedAtMs = typeof record.startedAt === 'string' ? Date.parse(record.startedAt) : Number.NaN;
    const recycledPid = Number.isFinite(lockStartedAtMs)
      && inspection.identity.startedAtMs > lockStartedAtMs + PROCESS_START_TOLERANCE_MS;
    if (recycledPid || !looksLikeLegacyCompiler(inspection.identity)) {
      return { state: 'orphaned', reason: 'compiler-owner-mismatch', lockPid, heartbeatAgeMs };
    }
    return { state: 'active', reason: 'live-compiler', lockPid, heartbeatAgeMs };
  }
}

async function atomicallyPublishLock(path: string, body: string, token: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${token}.tmp`;
  const handle = await open(temporaryPath, 'wx');
  let fullyWritten = false;
  try {
    await handle.writeFile(body, 'utf8');
    await handle.sync();
    fullyWritten = true;
  } finally {
    await handle.close();
    if (!fullyWritten) await unlink(temporaryPath).catch(() => undefined);
  }
  try {
    // Publishing a fully-written same-directory hard link is atomic and never
    // overwrites a competing writer, unlike rename on POSIX.
    await link(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export async function acquireCompilerLock(
  workRoot: string,
  inspector: LegacyProcessInspector = inspectProcess,
): Promise<() => Promise<void>> {
  const path = join(workRoot, '.compiler.lock');
  const token = randomUUID();
  const currentInspection = await inspector(process.pid);
  const currentIdentity = currentInspection.state === 'running' && currentInspection.identity
    ? currentInspection.identity
    : selfFallbackIdentity();
  const body = `${JSON.stringify({
    version: 2,
    pid: process.pid,
    token,
    startedAt: new Date().toISOString(),
    owner: lockOwnerFromIdentity(currentIdentity),
  }, null, 2)}\n`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await atomicallyPublishLock(path, body, token);
      return async () => {
        try {
          const current = JSON.parse(await readFile(path, 'utf8')) as { token?: unknown };
          if (current.token === token) await unlink(path);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let record: CompilerLockRecord = {};
      let snapshot: string | null = null;
      try {
        snapshot = await readFile(path, 'utf8');
        record = JSON.parse(snapshot) as CompilerLockRecord;
      } catch { /* stale or partial lock */ }
      if (await lockBelongsToLiveCompiler(record, inspector)) {
        throw new Error(`Another legacy compiler is active (pid ${String(record.pid)}, started ${String(record.startedAt ?? 'unknown')}). Use status instead of starting a second writer.`);
      }
      const lockStat = await stat(path).catch(() => null);
      if (typeof record.pid !== 'number' && lockStat && Date.now() - lockStat.mtimeMs < 30_000) {
        // A competing process may have completed the exclusive open but not
        // its tiny JSON write yet. Never delete a fresh, partially-written
        // lock; it becomes reclaimable after the bounded initialization grace.
        throw new Error('Another legacy compiler is initializing its writer lock. Retry status shortly instead of starting a second writer.');
      }
      // Re-read immediately before removal. This token/content comparison
      // prevents the ordinary stale-reclaimer race from deleting a lock that
      // another writer published while inspection was in flight.
      const latest = await readFile(path, 'utf8').catch(() => null);
      if (latest === null || latest !== snapshot) continue;
      await unlink(path).catch((unlinkError) => {
        if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT') throw unlinkError;
      });
    }
  }
  throw new Error(`Could not acquire the legacy compiler lock at ${path}`);
}

function outputHumanStatus(
  io: LegacyCliIo,
  status: ReturnType<LegacyLedger['status']>,
  activity?: LegacyRunActivity,
): void {
  const observedState = status.latestRun?.state === 'running' && activity
    ? activity.state
    : status.latestRun?.state;
  const latest = status.latestRun
    ? `${status.latestRun.command} ${String(observedState)} (${status.latestRun.id})`
    : 'none';
  io.stdout([
    `Ledger: ${status.databasePath}`,
    `Schema: v${status.schemaVersion}`,
    `Latest run: ${latest}`,
    ...(activity ? [`Run observation: ${activity.state} (${activity.reason})`] : []),
    `Templates by stage: ${JSON.stringify(status.templatesByStage)}`,
    `Terminal dispositions: ${JSON.stringify(status.templatesByDisposition)}`,
    `Open issues: ${JSON.stringify(status.unresolvedIssuesBySeverity)}`,
    `Renders (current artifacts): ${JSON.stringify(status.renderCounts)}`,
    `Render evidence retained: ${status.renderHistoryCount.toLocaleString()}`,
    `Model budget: ${status.modelBudget.accountedTokens.toLocaleString()}/${status.modelBudget.tokenCap.toLocaleString()} tokens, $${status.modelBudget.accountedCostUsd.toFixed(4)}/$${status.modelBudget.dollarCapUsd.toFixed(2)}`,
  ].join('\n'));
}

async function loadBundledServices(): Promise<LegacyCommandServices> {
  const pipelineUrl = new URL('./pipeline.js', import.meta.url).href;
  try {
    const pipeline = await import(pipelineUrl) as {
      legacyCommandServices?: LegacyCommandServices;
      default?: LegacyCommandServices;
    };
    return pipeline.legacyCommandServices ?? pipeline.default ?? {};
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const message = error instanceof Error ? error.message : String(error);
    if (code === 'ERR_MODULE_NOT_FOUND' || message.includes('Cannot find module')) return {};
    throw error;
  }
}

async function callStage(
  command: 'inventory' | 'pilot' | 'run' | 'promote',
  services: LegacyCommandServices,
  context: LegacyCommandContext,
): Promise<LegacyCommandOutcome | void> {
  const handler = services[command];
  if (!handler) {
    throw new Error(`No ${command} pipeline handler is installed. Export legacyCommandServices from legacy/pipeline.ts.`);
  }
  return handler(context);
}

function storedRunCloudRepairAuthorization(optionsJson: string): boolean {
  let options: unknown;
  try {
    options = JSON.parse(optionsJson) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Stored run options are invalid and cloud work cannot be reconciled safely: ${detail}`);
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Stored run options are invalid and cloud work cannot be reconciled safely: expected a JSON object');
  }
  const cloudRepair = (options as { cloudRepair?: unknown }).cloudRepair;
  if (cloudRepair !== undefined && typeof cloudRepair !== 'boolean') {
    throw new Error('Stored run options contain an invalid cloudRepair authorization');
  }
  return cloudRepair === true;
}

export async function runLegacyCli(argv: string[], dependencies: LegacyCliDependencies = {}): Promise<number> {
  const io = dependencies.io ?? {
    stdout: (message: string) => process.stdout.write(`${message}\n`),
    stderr: (message: string) => process.stderr.write(`${message}\n`),
  };

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    io.stdout(HELP);
    return 0;
  }

  if (dependencies.signal?.aborted) {
    io.stderr('Legacy catalogue rehabilitation cancelled before startup.');
    return LEGACY_CANCEL_EXIT_CODE;
  }

  let parsed: ParsedLegacyArgs;
  try {
    parsed = parseLegacyArgs(argv);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    io.stderr('Run with --help for usage.');
    return 2;
  }

  const config = resolveLegacyConfig({
    cwd: dependencies.cwd,
    env: dependencies.env,
    sourceRoot: parsed.flags.sourceRoot,
    workRoot: parsed.flags.workRoot,
    databasePath: parsed.flags.databasePath,
    ruleVersion: parsed.flags.ruleVersion,
    pilotSize: parsed.flags.pilotSize,
    staticWorkers: parsed.flags.staticWorkers,
    chromiumWorkers: parsed.flags.chromiumWorkers,
    aiDollarCapUsd: parsed.flags.aiDollarCapUsd,
    aiTokenCap: parsed.flags.aiTokenCap,
    cloudRepair: parsed.flags.cloudRepair,
  });

  let cloudRepairClient: CloudRepairBatchClient | undefined;
  if (config.cloudRepair) {
    cloudRepairClient = dependencies.cloudRepairClient;
    if (!cloudRepairClient) {
      // This is the sole credential-reading boundary, reached only after the
      // operator supplied --cloud-repair. The value is never persisted,
      // returned, or included in diagnostics.
      const apiKey = (dependencies.env ?? process.env).OPENAI_API_KEY?.trim();
      if (!apiKey) {
        io.stderr('--cloud-repair requires OPENAI_API_KEY or an injected cloud repair client.');
        return 2;
      }
      cloudRepairClient = new NativeOpenAIBatchClient(apiKey);
    }
  }

  try {
    await ensureWorkLayout(config);
    throwIfLegacyCancelled(dependencies.signal);
  } catch (error) {
    if (error instanceof LegacyCancellationError || dependencies.signal?.aborted) {
      io.stderr(error instanceof Error ? error.message : 'Legacy catalogue rehabilitation cancelled.');
      return LEGACY_CANCEL_EXIT_CODE;
    }
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }

  let ledger: LegacyLedger;
  try {
    ledger = new LegacyLedger({
      databasePath: config.databasePath,
      aiDollarCapUsd: config.aiDollarCapUsd,
      aiTokenCap: config.aiTokenCap,
    });
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }

  try {
    if (parsed.command === 'status') {
      const ledgerStatus = ledger.status();
      const latestRunActivity = await inspectLegacyRunActivity(
        config.workRoot,
        ledgerStatus.latestRun,
        dependencies.processInspector,
      );
      const status = { ...ledgerStatus, latestRunActivity };
      parsed.flags.json ? outputJson(io, status) : outputHumanStatus(io, ledgerStatus, latestRunActivity);
      return 0;
    }

    const services = dependencies.services ?? await loadBundledServices();
    if (parsed.command === 'report') {
      const releaseCompilerLock = await acquireCompilerLock(config.workRoot, dependencies.processInspector);
      try {
        // A report combines a ledger snapshot with extension-generated
        // filesystem evidence. Hold the same single-writer lock as repair and
        // promotion for the entire operation so those sources cannot advance
        // independently and yield a mixed-state launch audit.
        const report = ledger.reportData();
        const outcome = services.report
          ? await services.report({ command: 'report', config, flags: parsed.flags, ledger })
          : undefined;
        const reportPayload = { generatedAt: new Date().toISOString(), ...report, extension: outcome?.details ?? null };
        const reportPath = join(config.reportRoot, 'legacy-rehab-report.json');
        await atomicWriteFile(config, reportPath, `${JSON.stringify(reportPayload, null, 2)}\n`);
        if (parsed.flags.json) outputJson(io, reportPayload);
        else {
          outputHumanStatus(io, report);
          io.stdout(`Report: ${reportPath}`);
          if (outcome?.message) io.stdout(outcome.message);
        }
        return 0;
      } finally {
        await releaseCompilerLock();
      }
    }

    const releaseCompilerLock = await acquireCompilerLock(config.workRoot, dependencies.processInspector);
    try {
      // The exclusive writer lock makes every tree in the dedicated transient
      // staging directory orphaned. Reap crash leftovers before any resumed
      // lease can create new staging work; immutable candidates and the
      // content-addressed promotion cache live outside this directory.
      await reapOrphanedStaging(config);
      await assertReadableSource(config);
      throwIfLegacyCancelled(dependencies.signal);
      ledger.releaseExpiredLeases();
      let run = (parsed.command === 'run' || parsed.command === 'pilot') && parsed.flags.resume
        ? ledger.findResumableRun(parsed.command, config.sourceRoot, config.ruleVersion)
        : null;
      if (run) {
        const priorCloudRepair = storedRunCloudRepairAuthorization(run.optionsJson);
        if (priorCloudRepair && !parsed.flags.cloudRepair) {
          throw new Error('This resumable run used cloud repair; repeat --cloud-repair so pending batches can be reconciled explicitly.');
        }
        if (parsed.flags.cloudRepair) {
          // Persist this authorization before the resumed pipeline can submit
          // or reconcile provider work. It is deliberately monotonic so a
          // later restart cannot bypass another explicit opt-in.
          run = ledger.markRunCloudRepairEnabled(run.id);
        }
      }
      // Holding the compiler lock proves there is no other live writer. Close
      // stale "running" rows left by power loss, Task Scheduler termination,
      // or Ctrl+C while preserving the one exact run selected for resume.
      ledger.cancelOrphanedRuns(run?.id);
      if (run) {
        ledger.recoverRunLeases(run.id);
        run = ledger.resumeRun(run.id);
      } else {
        run = ledger.createRun({
          command: parsed.command,
          ruleVersion: config.ruleVersion,
          sourceRoot: config.sourceRoot,
          workRoot: config.workRoot,
          options: parsed.flags,
        });
      }

      const context: LegacyCommandContext = {
        command: parsed.command,
        config,
        flags: parsed.flags,
        ledger,
        runId: run.id,
        signal: dependencies.signal,
        ...(cloudRepairClient ? { cloudRepairClient } : {}),
      };

      try {
        throwIfLegacyCancelled(dependencies.signal);
        const outcome = await callStage(parsed.command, services, context);
        throwIfLegacyCancelled(dependencies.signal);
        ledger.finishRun(run.id, 'completed');
        const result = { runId: run.id, command: parsed.command, state: 'completed', ...outcome };
        parsed.flags.json ? outputJson(io, result) : io.stdout(outcome?.message ?? `${parsed.command} completed (run ${run.id})`);
        return 0;
      } catch (error) {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        if (error instanceof LegacyCancellationError || dependencies.signal?.aborted) {
          const cancellationMessage = error instanceof Error
            ? error.message
            : 'Legacy catalogue rehabilitation cancelled.';
          const recovered = ledger.cancelRunAndRecoverLeases(run.id, cancellationMessage);
          io.stderr(`${cancellationMessage} Recovered ${recovered} in-progress template lease(s).`);
          return LEGACY_CANCEL_EXIT_CODE;
        }
        ledger.finishRun(run.id, 'failed', message);
        io.stderr(error instanceof Error ? error.message : String(error));
        return 1;
      }
    } finally {
      await releaseCompilerLock();
    }
  } catch (error) {
    if (error instanceof LegacyCancellationError || dependencies.signal?.aborted) {
      io.stderr(error instanceof Error ? error.message : 'Legacy catalogue rehabilitation cancelled.');
      return LEGACY_CANCEL_EXIT_CODE;
    }
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    ledger.close();
  }
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (executedPath === import.meta.url) {
  const cancellation = new AbortController();
  const onSigint = (): void => cancellation.abort(new LegacyCancellationError('Cancellation requested by SIGINT.'));
  const onSigterm = (): void => cancellation.abort(new LegacyCancellationError('Cancellation requested by SIGTERM.'));
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);
  try {
    process.exitCode = await runLegacyCli(process.argv.slice(2), { signal: cancellation.signal });
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  }
}

export { HELP as LEGACY_CLI_HELP };

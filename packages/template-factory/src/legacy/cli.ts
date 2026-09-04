#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { open, readFile, stat, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
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
  --work-root <path>           Durable output root (default: %LOCALAPPDATA%\\DailyClarity\\template-rehab)
  --db <path>                  SQLite ledger path inside work root
  --rule-version <version>     Deterministic repair rule version
  --pilot-size <count>         Stratified pilot size (minimum/default: 100)
  --static-workers <count>     Static repair workers (default: 8)
  --chromium-workers <count>   Browser workers (default: 4)
  --ai-dollar-cap <usd>        Hard model spend cap (default: 25)
  --ai-token-cap <count>       Hard aggregate model token cap (default: 1000000)
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
}

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
      case '--static-workers': flags.staticWorkers = positiveInteger(value, option); break;
      case '--chromium-workers': flags.chromiumWorkers = positiveInteger(value, option); break;
      case '--ai-dollar-cap': flags.aiDollarCapUsd = positiveNumber(value, option); break;
      case '--ai-token-cap': flags.aiTokenCap = positiveInteger(value, option); break;
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

async function acquireCompilerLock(workRoot: string): Promise<() => Promise<void>> {
  const path = join(workRoot, '.compiler.lock');
  const token = randomUUID();
  const body = `${JSON.stringify({ version: 1, pid: process.pid, token, startedAt: new Date().toISOString() }, null, 2)}\n`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const handle = await open(path, 'wx');
      try {
        await handle.writeFile(body, 'utf8');
      } catch (error) {
        await handle.close().catch(() => undefined);
        await unlink(path).catch(() => undefined);
        throw error;
      }
      await handle.close();
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
      let owner: { pid?: unknown; startedAt?: unknown } = {};
      try { owner = JSON.parse(await readFile(path, 'utf8')) as typeof owner; } catch { /* stale or partial lock */ }
      if (typeof owner.pid === 'number' && await processIsAlive(owner.pid)) {
        throw new Error(`Another legacy compiler is active (pid ${owner.pid}, started ${String(owner.startedAt ?? 'unknown')}). Use status instead of starting a second writer.`);
      }
      const lockStat = await stat(path).catch(() => null);
      if (typeof owner.pid !== 'number' && lockStat && Date.now() - lockStat.mtimeMs < 30_000) {
        // A competing process may have completed the exclusive open but not
        // its tiny JSON write yet. Never delete a fresh, partially-written
        // lock; it becomes reclaimable after the bounded initialization grace.
        throw new Error('Another legacy compiler is initializing its writer lock. Retry status shortly instead of starting a second writer.');
      }
      await unlink(path).catch((unlinkError) => {
        if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT') throw unlinkError;
      });
    }
  }
  throw new Error(`Could not acquire the legacy compiler lock at ${path}`);
}

function outputHumanStatus(io: LegacyCliIo, status: ReturnType<LegacyLedger['status']>): void {
  const latest = status.latestRun
    ? `${status.latestRun.command} ${status.latestRun.state} (${status.latestRun.id})`
    : 'none';
  io.stdout([
    `Ledger: ${status.databasePath}`,
    `Schema: v${status.schemaVersion}`,
    `Latest run: ${latest}`,
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
      const status = ledger.status();
      parsed.flags.json ? outputJson(io, status) : outputHumanStatus(io, status);
      return 0;
    }

    const services = dependencies.services ?? await loadBundledServices();
    if (parsed.command === 'report') {
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
    }

    const releaseCompilerLock = await acquireCompilerLock(config.workRoot);
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
      if (run && !parsed.flags.cloudRepair) {
        let priorCloudRepair = false;
        try {
          const priorOptions = JSON.parse(run.optionsJson) as { cloudRepair?: unknown };
          priorCloudRepair = priorOptions.cloudRepair === true;
        } catch {
          // Never infer renewed cloud authority from unreadable historical
          // options. The ordinary run audit remains responsible for them.
        }
        if (priorCloudRepair) {
          throw new Error('This resumable run used cloud repair; repeat --cloud-repair so pending batches can be reconciled explicitly.');
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

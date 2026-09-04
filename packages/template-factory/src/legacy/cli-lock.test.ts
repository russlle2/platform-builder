import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import {
  LEGACY_RUN_HEARTBEAT_STALE_MS,
  acquireCompilerLock,
  runLegacyCli,
  type LegacyProcessIdentity,
  type LegacyProcessInspector,
} from './cli.js';
import { LegacyLedger } from './ledger.js';

const SELF_IDENTITY: LegacyProcessIdentity = {
  executable: process.execPath,
  commandLine: `${process.execPath} template-factory/src/legacy/cli.ts run --resume`,
  startedAtMs: 1_800_000_000_000,
  source: 'test-inspector',
};

async function withWorkRoot(run: (workRoot: string) => Promise<void>): Promise<void> {
  const workRoot = await mkdtemp(join(tmpdir(), 'legacy-cli-lock-'));
  try {
    await run(workRoot);
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

async function withCliRoots(run: (sourceRoot: string, workRoot: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'legacy-cli-report-'));
  const sourceRoot = join(root, 'source');
  const workRoot = join(root, 'work');
  await Promise.all([mkdir(sourceRoot), mkdir(workRoot)]);
  try {
    await run(sourceRoot, workRoot);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function inspectorFor(entries: ReadonlyMap<number, LegacyProcessIdentity | 'unknown'>): LegacyProcessInspector {
  return async (pid) => {
    if (pid === process.pid) return { state: 'running', identity: SELF_IDENTITY };
    const value = entries.get(pid);
    if (!value) return { state: 'not-running' };
    return value === 'unknown' ? { state: 'running' } : { state: 'running', identity: value };
  };
}

test('compiler lock is atomically published with process ownership identity', async () => {
  await withWorkRoot(async (workRoot) => {
    const release = await acquireCompilerLock(workRoot, inspectorFor(new Map()));
    const record = JSON.parse(await readFile(join(workRoot, '.compiler.lock'), 'utf8')) as {
      version: number;
      owner: { executable: string; commandHash: string; processStartedAtMs: number; inspectionSource: string };
    };
    assert.equal(record.version, 2);
    assert.equal(record.owner.processStartedAtMs, SELF_IDENTITY.startedAtMs);
    assert.equal(record.owner.inspectionSource, SELF_IDENTITY.source);
    assert.match(record.owner.commandHash, /^[a-f\d]{64}$/u);
    assert.ok(record.owner.executable);
    await release();
    await assert.rejects(readFile(join(workRoot, '.compiler.lock')), { code: 'ENOENT' });
  });
});

test('compiler lock refuses a genuinely matching live owner', async () => {
  await withWorkRoot(async (workRoot) => {
    const lockPath = join(workRoot, '.compiler.lock');
    const release = await acquireCompilerLock(workRoot, inspectorFor(new Map()));
    const record = JSON.parse(await readFile(lockPath, 'utf8')) as { pid: number; token: string };
    await release();

    const otherPid = 424_201;
    record.pid = otherPid;
    await writeFile(lockPath, `${JSON.stringify(record)}\n`, 'utf8');
    await assert.rejects(
      acquireCompilerLock(workRoot, inspectorFor(new Map([[otherPid, SELF_IDENTITY]]))),
      /Another legacy compiler is active/u,
    );
  });
});

test('compiler lock reclaims a v2 lock after its PID was reused by another process', async () => {
  await withWorkRoot(async (workRoot) => {
    const lockPath = join(workRoot, '.compiler.lock');
    const releaseInitial = await acquireCompilerLock(workRoot, inspectorFor(new Map()));
    const staleRecord = JSON.parse(await readFile(lockPath, 'utf8')) as { pid: number };
    await releaseInitial();

    const recycledPid = 424_202;
    staleRecord.pid = recycledPid;
    await writeFile(lockPath, `${JSON.stringify(staleRecord)}\n`, 'utf8');
    const replacement: LegacyProcessIdentity = {
      ...SELF_IDENTITY,
      commandLine: `${process.execPath} unrelated-worker.js`,
      startedAtMs: SELF_IDENTITY.startedAtMs + 60_000,
    };
    const release = await acquireCompilerLock(
      workRoot,
      inspectorFor(new Map([[recycledPid, replacement]])),
    );
    const current = JSON.parse(await readFile(lockPath, 'utf8')) as { pid: number; version: number };
    assert.equal(current.version, 2);
    assert.equal(current.pid, process.pid);
    await release();
  });
});

test('compiler lock reclaims an old v1 lock that points at an unrelated live PID', async () => {
  await withWorkRoot(async (workRoot) => {
    const lockPath = join(workRoot, '.compiler.lock');
    const unrelatedPid = 424_203;
    await writeFile(lockPath, `${JSON.stringify({
      version: 1,
      pid: unrelatedPid,
      token: 'old-token',
      startedAt: '2025-01-01T00:00:00.000Z',
    })}\n`, 'utf8');
    const unrelated: LegacyProcessIdentity = {
      executable: process.execPath,
      commandLine: `${process.execPath} thumbnail-cache-worker.js`,
      startedAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
      source: 'test-inspector',
    };
    const release = await acquireCompilerLock(
      workRoot,
      inspectorFor(new Map([[unrelatedPid, unrelated]])),
    );
    const current = JSON.parse(await readFile(lockPath, 'utf8')) as { pid: number; version: number };
    assert.equal(current.version, 2);
    assert.equal(current.pid, process.pid);
    await release();
  });
});

test('compiler lock fails safe when a live owner cannot be inspected', async () => {
  await withWorkRoot(async (workRoot) => {
    const unknownPid = 424_204;
    await writeFile(join(workRoot, '.compiler.lock'), `${JSON.stringify({
      version: 2,
      pid: unknownPid,
      token: 'unknown-owner',
      startedAt: '2025-01-01T00:00:00.000Z',
    })}\n`, 'utf8');
    await assert.rejects(
      acquireCompilerLock(workRoot, inspectorFor(new Map([[unknownPid, 'unknown']]))),
      /Another legacy compiler is active/u,
    );
  });
});

test('atomic lock publication admits only one concurrent writer', async () => {
  await withWorkRoot(async (workRoot) => {
    const inspector = inspectorFor(new Map());
    const outcomes = await Promise.allSettled([
      acquireCompilerLock(workRoot, inspector),
      acquireCompilerLock(workRoot, inspector),
    ]);
    const acquired = outcomes.filter((outcome): outcome is PromiseFulfilledResult<() => Promise<void>> => outcome.status === 'fulfilled');
    const refused = outcomes.filter((outcome) => outcome.status === 'rejected');
    assert.equal(acquired.length, 1);
    assert.equal(refused.length, 1);
    await acquired[0]!.value();
  });
});

test('status reports a dead lock owner as orphaned without reclaiming lock or run state', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const ledger = new LegacyLedger({ databasePath: join(workRoot, 'ledger.sqlite') });
    const run = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'status-observation-v1',
      sourceRoot,
      workRoot,
    });
    ledger.close();

    const lockPath = join(workRoot, '.compiler.lock');
    const deadPid = 424_205;
    const lock = `${JSON.stringify({
      version: 2,
      pid: deadPid,
      token: 'dead-owner',
      startedAt: new Date().toISOString(),
      owner: {
        executable: 'c:/program files/nodejs/node.exe',
        commandHash: 'a'.repeat(64),
        processStartedAtMs: Date.now(),
        inspectionSource: 'test-inspector',
      },
    }, null, 2)}\n`;
    await writeFile(lockPath, lock, 'utf8');

    const output: string[] = [];
    const exitCode = await runLegacyCli([
      'status', '--source', sourceRoot, '--work-root', workRoot, '--json',
    ], {
      processInspector: inspectorFor(new Map()),
      io: { stdout: (message) => output.push(message), stderr: () => undefined },
    });
    assert.equal(exitCode, 0);
    const status = JSON.parse(output.join('\n')) as {
      latestRun: { id: string; state: string };
      latestRunActivity: { state: string; reason: string; lockPid: number | null; heartbeatAgeMs: number | null };
    };
    assert.equal(status.latestRun.id, run.id);
    assert.equal(status.latestRun.state, 'running', 'status preserves the durable database fact');
    assert.equal(status.latestRunActivity.state, 'orphaned');
    assert.equal(status.latestRunActivity.reason, 'compiler-process-not-running');
    assert.equal(status.latestRunActivity.lockPid, deadPid);
    assert.ok((status.latestRunActivity.heartbeatAgeMs ?? -1) >= 0);
    assert.equal(await readFile(lockPath, 'utf8'), lock, 'status must not reclaim the stale lock');

    const readback = new LegacyLedger({ databasePath: join(workRoot, 'ledger.sqlite') });
    try {
      assert.equal(readback.getRun(run.id)?.state, 'running', 'status must not reconcile the run row');
    } finally {
      readback.close();
    }
  });
});

test('status keeps a positively identified long-lived compiler active despite an old heartbeat', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const databasePath = join(workRoot, 'ledger.sqlite');
    const ledger = new LegacyLedger({ databasePath });
    const run = ledger.createRun({
      command: 'run',
      ruleVersion: 'status-observation-v1',
      sourceRoot,
      workRoot,
    });
    ledger.close();

    const staleUpdatedAt = new Date(Date.now() - LEGACY_RUN_HEARTBEAT_STALE_MS - 60_000).toISOString();
    const database = new DatabaseSync(databasePath);
    try {
      database.prepare('UPDATE runs SET updated_at = ? WHERE id = ?').run(staleUpdatedAt, run.id);
    } finally {
      database.close();
    }

    const inspector = inspectorFor(new Map());
    const release = await acquireCompilerLock(workRoot, inspector);
    const lockPath = join(workRoot, '.compiler.lock');
    const lockBefore = await readFile(lockPath, 'utf8');
    try {
      const output: string[] = [];
      const exitCode = await runLegacyCli([
        'status', '--source', sourceRoot, '--work-root', workRoot, '--json',
      ], {
        processInspector: inspector,
        io: { stdout: (message) => output.push(message), stderr: () => undefined },
      });
      assert.equal(exitCode, 0);
      const status = JSON.parse(output.join('\n')) as {
        latestRun: { state: string; updatedAt: string };
        latestRunActivity: { state: string; reason: string; lockPid: number | null };
      };
      assert.equal(status.latestRun.state, 'running');
      assert.equal(status.latestRun.updatedAt, staleUpdatedAt);
      assert.equal(status.latestRunActivity.state, 'active');
      assert.equal(status.latestRunActivity.reason, 'live-compiler');
      assert.equal(status.latestRunActivity.lockPid, process.pid);
      assert.equal(await readFile(lockPath, 'utf8'), lockBefore);

      const readback = new LegacyLedger({ databasePath });
      try {
        assert.equal(readback.getRun(run.id)?.updatedAt, staleUpdatedAt);
      } finally {
        readback.close();
      }
    } finally {
      await release();
    }
  });
});

test('status reports a stale heartbeat when a live lock owner cannot be verified', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const databasePath = join(workRoot, 'ledger.sqlite');
    const ledger = new LegacyLedger({ databasePath });
    const run = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'status-observation-v1',
      sourceRoot,
      workRoot,
    });
    ledger.close();

    const staleUpdatedAt = new Date(Date.now() - LEGACY_RUN_HEARTBEAT_STALE_MS - 60_000).toISOString();
    const database = new DatabaseSync(databasePath);
    try {
      database.prepare('UPDATE runs SET updated_at = ? WHERE id = ?').run(staleUpdatedAt, run.id);
    } finally {
      database.close();
    }

    const lockPath = join(workRoot, '.compiler.lock');
    const unverifiablePid = 424_206;
    const lock = `${JSON.stringify({
      version: 2,
      pid: unverifiablePid,
      token: 'unverifiable-owner',
      startedAt: new Date().toISOString(),
    })}\n`;
    await writeFile(lockPath, lock, 'utf8');

    const output: string[] = [];
    const exitCode = await runLegacyCli([
      'status', '--source', sourceRoot, '--work-root', workRoot, '--json',
    ], {
      processInspector: inspectorFor(new Map([[unverifiablePid, 'unknown']])),
      io: { stdout: (message) => output.push(message), stderr: () => undefined },
    });
    assert.equal(exitCode, 0);
    const status = JSON.parse(output.join('\n')) as {
      latestRun: { state: string; updatedAt: string };
      latestRunActivity: { state: string; reason: string; lockPid: number | null };
    };
    assert.equal(status.latestRun.state, 'running');
    assert.equal(status.latestRun.updatedAt, staleUpdatedAt);
    assert.equal(status.latestRunActivity.state, 'stale');
    assert.equal(status.latestRunActivity.reason, 'stale-run-heartbeat');
    assert.equal(status.latestRunActivity.lockPid, unverifiablePid);
    assert.equal(await readFile(lockPath, 'utf8'), lock);

    const readback = new LegacyLedger({ databasePath });
    try {
      assert.equal(readback.getRun(run.id)?.updatedAt, staleUpdatedAt);
    } finally {
      readback.close();
    }
  });
});

test('report refuses to generate while a genuine compiler owner is live', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const inspector = inspectorFor(new Map());
    const release = await acquireCompilerLock(workRoot, inspector);
    const stderr: string[] = [];
    try {
      const exitCode = await runLegacyCli([
        'report', '--source', sourceRoot, '--work-root', workRoot, '--json',
      ], {
        services: {},
        processInspector: inspector,
        io: { stdout: () => undefined, stderr: (message) => stderr.push(message) },
      });
      assert.equal(exitCode, 1);
      assert.match(stderr.join('\n'), /Another legacy compiler is active/u);
      await assert.rejects(readFile(join(workRoot, 'reports', 'legacy-rehab-report.json')), { code: 'ENOENT' });
    } finally {
      await release();
    }
  });
});

test('report holds the compiler lock through extension generation and releases it on success', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const lockPath = join(workRoot, '.compiler.lock');
    let extensionObservedLock = false;
    const exitCode = await runLegacyCli([
      'report', '--source', sourceRoot, '--work-root', workRoot, '--json',
    ], {
      processInspector: inspectorFor(new Map()),
      services: {
        report: async () => {
          extensionObservedLock = Boolean(await readFile(lockPath, 'utf8'));
          return { details: { extensionComplete: true } };
        },
      },
      io: { stdout: () => undefined, stderr: () => undefined },
    });
    assert.equal(exitCode, 0);
    assert.equal(extensionObservedLock, true);
    const report = JSON.parse(await readFile(join(workRoot, 'reports', 'legacy-rehab-report.json'), 'utf8')) as {
      extension?: { extensionComplete?: boolean };
    };
    assert.equal(report.extension?.extensionComplete, true);
    await assert.rejects(readFile(lockPath), { code: 'ENOENT' });
  });
});

test('report releases the compiler lock when extension generation fails', async () => {
  await withCliRoots(async (sourceRoot, workRoot) => {
    const lockPath = join(workRoot, '.compiler.lock');
    const stderr: string[] = [];
    const exitCode = await runLegacyCli([
      'report', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      processInspector: inspectorFor(new Map()),
      services: { report: async () => { throw new Error('report extension failed'); } },
      io: { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    });
    assert.equal(exitCode, 1);
    assert.match(stderr.join('\n'), /report extension failed/u);
    await assert.rejects(readFile(lockPath), { code: 'ENOENT' });
  });
});

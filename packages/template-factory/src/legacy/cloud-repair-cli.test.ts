import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { parseLegacyArgs, runLegacyCli } from './cli.js';
import type { CloudRepairBatchClient } from './cloud-lane.js';
import { LegacyLedger } from './ledger.js';

const unreachableClient: CloudRepairBatchClient = {
  uploadJsonl: async () => { throw new Error('network must not be reached'); },
  create: async () => { throw new Error('network must not be reached'); },
  retrieve: async () => { throw new Error('network must not be reached'); },
  downloadFile: async () => { throw new Error('network must not be reached'); },
};

test('cloud repair is false by default and is rejected for read-only commands', () => {
  assert.equal(parseLegacyArgs(['run']).flags.cloudRepair, false);
  assert.equal(parseLegacyArgs(['pilot', '--cloud-repair']).flags.cloudRepair, true);
  assert.throws(() => parseLegacyArgs(['status', '--cloud-repair']), /only valid with the pilot or run/);
});

test('ordinary runs never read a credential or install a cloud client', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cloud-off-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  let credentialReads = 0;
  const env: NodeJS.ProcessEnv = {};
  Object.defineProperty(env, 'OPENAI_API_KEY', {
    enumerable: true,
    get: () => {
      credentialReads += 1;
      return 'must-not-be-read';
    },
  });
  try {
    const code = await runLegacyCli(['run', '--source', sourceRoot, '--work-root', workRoot], {
      env,
      cloudRepairClient: unreachableClient,
      io: { stdout: () => undefined, stderr: () => undefined },
      services: {
        run: async (context) => {
          assert.equal(context.config.cloudRepair, false);
          assert.equal(context.cloudRepairClient, undefined);
        },
      },
    });
    assert.equal(code, 0);
    assert.equal(credentialReads, 0);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('explicit cloud repair accepts an injected client without reading a credential', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cloud-on-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  let credentialReads = 0;
  const env: NodeJS.ProcessEnv = {};
  Object.defineProperty(env, 'OPENAI_API_KEY', {
    enumerable: true,
    get: () => {
      credentialReads += 1;
      return 'must-not-be-read';
    },
  });
  try {
    const code = await runLegacyCli([
      'run', '--cloud-repair', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env,
      cloudRepairClient: unreachableClient,
      io: { stdout: () => undefined, stderr: () => undefined },
      services: {
        run: async (context) => {
          assert.equal(context.config.cloudRepair, true);
          assert.equal(context.cloudRepairClient, unreachableClient);
        },
      },
    });
    assert.equal(code, 0);
    assert.equal(credentialReads, 0);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('explicit cloud repair fails before pipeline execution when no credential is available', async () => {
  const errors: string[] = [];
  let invoked = false;
  const code = await runLegacyCli(['run', '--cloud-repair'], {
    env: {},
    io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
    services: { run: async () => { invoked = true; } },
  });
  assert.equal(code, 2);
  assert.equal(invoked, false);
  assert.match(errors[0] ?? '', /requires OPENAI_API_KEY/);
});

test('resuming a cloud-enabled run requires a fresh explicit opt-in', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cloud-resume-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  const errors: string[] = [];
  try {
    const initial = await runLegacyCli([
      'run', '--cloud-repair', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      cloudRepairClient: unreachableClient,
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { run: async () => { throw new Error('simulated interruption'); } },
    });
    assert.equal(initial, 1);
    let invoked = false;
    const resumed = await runLegacyCli([
      'run', '--resume', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { run: async () => { invoked = true; } },
    });
    assert.equal(resumed, 1);
    assert.equal(invoked, false);
    assert.match(errors.at(-1) ?? '', /repeat --cloud-repair/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('cloud repair enabled on resume is persisted monotonically before pipeline work', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cloud-monotonic-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  const errors: string[] = [];
  let runId = '';
  try {
    const initial = await runLegacyCli([
      'run', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          runId = context.runId;
          throw new Error('initial deterministic interruption');
        },
      },
    });
    assert.equal(initial, 1);

    const cloudResume = await runLegacyCli([
      'run', '--resume', '--cloud-repair', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      cloudRepairClient: unreachableClient,
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          assert.equal(context.runId, runId);
          const persisted = JSON.parse(context.ledger.getRun(runId)?.optionsJson ?? 'null') as {
            cloudRepair?: unknown;
          };
          assert.equal(persisted.cloudRepair, true, 'authorization is durable before pipeline work');
          throw new Error('cloud interruption after durable authorization');
        },
      },
    });
    assert.equal(cloudResume, 1);

    const ledger = new LegacyLedger({ databasePath: join(workRoot, 'ledger.sqlite') });
    try {
      const persisted = JSON.parse(ledger.getRun(runId)?.optionsJson ?? 'null') as { cloudRepair?: unknown };
      assert.equal(persisted.cloudRepair, true);
    } finally {
      ledger.close();
    }

    let invokedWithoutOptIn = false;
    const unsafeResume = await runLegacyCli([
      'run', '--resume', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { run: async () => { invokedWithoutOptIn = true; } },
    });
    assert.equal(unsafeResume, 1);
    assert.equal(invokedWithoutOptIn, false);
    assert.match(errors.at(-1) ?? '', /repeat --cloud-repair/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('cloud repair resume fails closed when durable run options cannot be reconciled', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cloud-corrupt-options-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  const errors: string[] = [];
  let runId = '';
  try {
    const initial = await runLegacyCli([
      'run', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          runId = context.runId;
          throw new Error('create interrupted run');
        },
      },
    });
    assert.equal(initial, 1);

    const database = new DatabaseSync(join(workRoot, 'ledger.sqlite'));
    try {
      database.prepare('UPDATE runs SET options_json = ? WHERE id = ?').run('{broken', runId);
    } finally {
      database.close();
    }

    let invokedWithoutFlag = false;
    const unflaggedResume = await runLegacyCli([
      'run', '--resume', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { run: async () => { invokedWithoutFlag = true; } },
    });
    assert.equal(unflaggedResume, 1);
    assert.equal(invokedWithoutFlag, false);
    assert.match(errors.at(-1) ?? '', /stored run options are invalid/i);

    let invokedWithFlag = false;
    const flaggedResume = await runLegacyCli([
      'run', '--resume', '--cloud-repair', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      env: {},
      cloudRepairClient: unreachableClient,
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { run: async () => { invokedWithFlag = true; } },
    });
    assert.equal(flaggedResume, 1);
    assert.equal(invokedWithFlag, false);
    assert.match(errors.at(-1) ?? '', /stored run options are invalid/i);

    const readback = new DatabaseSync(join(workRoot, 'ledger.sqlite'), { readOnly: true });
    try {
      const row = readback.prepare('SELECT state, options_json FROM runs WHERE id = ?').get(runId) as {
        state: string;
        options_json: string;
      };
      assert.equal(row.state, 'failed');
      assert.equal(row.options_json, '{broken');
    } finally {
      readback.close();
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

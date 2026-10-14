import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  cloudLaneStatePath,
  loadCloudRepairLaneState,
  prepareCloudRepairLane,
  reconcileCloudRepairLane,
  submitCloudRepairLane,
  validateCloudRepairPatch,
  type CloudBatchRecord,
  type CloudRepairBatchClient,
  type CloudRepairFragment,
} from './cloud-lane.js';
import { resolveLegacyConfig } from './config.js';
import { LegacyLedger } from './ledger.js';
import {
  estimateBatchInputReservation,
  type BatchInputLine,
  type StructuredRepairPatch,
} from './model.js';

const ISSUE_A = '0123456789abcdef0123456789abcdef';
const ISSUE_B = 'fedcba9876543210fedcba9876543210';

function fragment(overrides: Partial<CloudRepairFragment> = {}): CloudRepairFragment {
  return {
    id: 'fragment-a',
    issueFingerprint: ISSUE_A,
    issueCodes: ['ambiguous_copy'],
    niche: 'wellness_coach',
    pageRole: 'services',
    fragment: '<section data-dc-node-id="claim"><p>Ambiguous claim A</p></section>',
    attempt: 1,
    ...overrides,
  };
}

function outputLine(
  customId: string,
  patch: unknown,
  usage = { input_tokens: 40, output_tokens: 10, total_tokens: 50 },
): string {
  return JSON.stringify({
    id: `batch-request-${customId}`,
    custom_id: customId,
    response: {
      status_code: 200,
      request_id: `req-${customId}`,
      body: {
        id: `resp-${customId}`,
        object: 'response',
        output: [{
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify(patch) }],
        }],
        usage,
      },
    },
    error: null,
  });
}

class FakeBatchClient implements CloudRepairBatchClient {
  uploadCalls = 0;
  createCalls = 0;
  retrieveCalls = 0;
  downloadCalls = 0;
  recoverCalls = 0;
  uploadedFilename = '';
  uploadedJsonl = '';
  createError?: Error;
  recoveredRecord?: CloudBatchRecord;
  createRecord: CloudBatchRecord = { id: 'batch_fake', status: 'validating' };
  retrieveRecord: CloudBatchRecord = { id: 'batch_fake', status: 'in_progress' };
  readonly downloads = new Map<string, string>();

  async uploadJsonl(filename: string, jsonl: string): Promise<string> {
    this.uploadCalls += 1;
    this.uploadedFilename = filename;
    this.uploadedJsonl = jsonl;
    return 'file-input_fake';
  }

  async create(inputFileId: string): Promise<CloudBatchRecord> {
    this.createCalls += 1;
    assert.equal(inputFileId, 'file-input_fake');
    if (this.createError) throw this.createError;
    return this.createRecord;
  }

  async retrieve(batchId: string): Promise<CloudBatchRecord> {
    this.retrieveCalls += 1;
    assert.equal(batchId, 'batch_fake');
    return this.retrieveRecord;
  }

  async downloadFile(fileId: string): Promise<string> {
    this.downloadCalls += 1;
    const value = this.downloads.get(fileId);
    if (value === undefined) throw new Error(`No fake download for ${fileId}`);
    return value;
  }

  async recoverBatchByInputFileId(inputFileId: string, laneId: string): Promise<CloudBatchRecord | null> {
    this.recoverCalls += 1;
    assert.equal(inputFileId, 'file-input_fake');
    assert.equal(laneId, 'uncertain-create');
    return this.recoveredRecord ?? null;
  }
}

async function fixture(caps: { tokens?: number; dollars?: number } = {}) {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cloud-lane-'));
  const config = resolveLegacyConfig({
    cwd: scratch,
    sourceRoot: join(scratch, 'source'),
    workRoot: join(scratch, 'work'),
    aiTokenCap: caps.tokens ?? 1_000_000,
    aiDollarCapUsd: caps.dollars ?? 25,
  });
  const ledger = new LegacyLedger({
    databasePath: config.databasePath,
    aiTokenCap: config.aiTokenCap,
    aiDollarCapUsd: config.aiDollarCapUsd,
  });
  const runId = 'run-cloud-lane-test';
  ledger.createRun({
    id: runId,
    command: 'run',
    ruleVersion: config.ruleVersion,
    sourceRoot: config.sourceRoot,
    workRoot: config.workRoot,
  });
  return { scratch, config, ledger, runId };
}

test('preparation clusters one fragment-only request per issue fingerprint and resumes idempotently', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  try {
    const fragments = [
      fragment(),
      fragment({ id: 'fragment-b', fragment: '<section data-dc-node-id="claim"><p>Ambiguous claim B</p></section>' }),
    ];
    const first = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'attempt-one',
      fragments,
    });
    assert.equal(first.pending, true);
    assert.equal(first.state.requests.length, 1);
    assert.deepEqual(first.state.requests[0]?.fragmentIds, ['fragment-a', 'fragment-b']);
    assert.equal(first.state.requestArtifact?.requestCount, 1);
    const requestPath = join(config.workRoot, first.state.requestArtifact!.relativePath);
    const jsonl = await readFile(requestPath, 'utf8');
    assert.equal(jsonl.trim().split('\n').length, 1);
    const line = JSON.parse(jsonl) as { custom_id: string; url: string; body: Record<string, unknown> };
    assert.equal(line.url, '/v1/responses');
    assert.equal(line.body.model, 'gpt-5.6-terra');
    assert.equal(line.body.store, false);
    assert.match(String(line.body.input), /Ambiguous claim A/);
    assert.doesNotMatch(String(line.body.input), /Ambiguous claim B/);
    assert.doesNotMatch(String(line.body.input), /<html|<body/i);
    assert.match(JSON.stringify(line.body), /json_schema/);
    assert.equal(line.custom_id, first.state.requests[0]?.customId);
    const reservation = estimateBatchInputReservation(line as BatchInputLine);
    assert.equal(first.state.requests[0]?.estimatedInputTokens, reservation.inputTokens);
    assert.equal(first.state.requests[0]?.estimatedOutputTokens, reservation.outputTokens);
    assert.equal(first.state.requests[0]?.estimatedCostUsd, reservation.costUsd);

    const accountedBefore = ledger.modelBudgetSnapshot().accountedTokens;
    const resumed = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'attempt-one',
      fragments,
    });
    assert.equal(ledger.modelBudgetSnapshot().accountedTokens, accountedBefore);
    assert.equal(resumed.state.inputSetHash, first.state.inputSetHash);
    assert.equal(resumed.state.requestArtifact?.sha256, first.state.requestArtifact?.sha256);

    await assert.rejects(
      prepareCloudRepairLane({
        config,
        ledger,
        runId,
        laneId: 'hidden-document-rejected',
        fragments: [
          fragment(),
          fragment({ id: 'fragment-hidden', fragment: '<html><body>whole template</body></html>' }),
        ],
      }),
      /never a complete template/,
    );
    assert.equal(ledger.modelBudgetSnapshot().accountedTokens, accountedBefore);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('submission checkpoints file and batch ids atomically and does not repeat remote calls on resume', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  const client = new FakeBatchClient();
  try {
    await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'durable-submit',
      fragments: [fragment()],
    });
    const submitted = await submitCloudRepairLane({ config, ledger, client, laneId: 'durable-submit' });
    assert.equal(submitted.state.phase, 'submitted');
    assert.equal(submitted.state.remote.inputFileId, 'file-input_fake');
    assert.equal(submitted.state.remote.batchId, 'batch_fake');
    assert.equal(submitted.state.requests[0]?.ledgerStatus, 'submitted');
    assert.equal(client.uploadCalls, 1);
    assert.equal(client.createCalls, 1);

    const resumed = await submitCloudRepairLane({ config, ledger, client, laneId: 'durable-submit' });
    assert.equal(resumed.state.remote.batchId, 'batch_fake');
    assert.equal(client.uploadCalls, 1);
    assert.equal(client.createCalls, 1);

    const persisted = await loadCloudRepairLaneState(config, 'durable-submit');
    assert.equal(persisted?.remote.inputFileId, 'file-input_fake');
    assert.equal(persisted?.remote.batchId, 'batch_fake');
    const rawState = await readFile(cloudLaneStatePath(config, 'durable-submit'), 'utf8');
    assert.match(rawState, /"checksum"/);
    assert.doesNotMatch(rawState, /api[_-]?key|bearer/i);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('an uncertain create boundary is recovered by input file id and is never blindly resubmitted', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  const client = new FakeBatchClient();
  client.createError = new Error('simulated connection loss after acceptance');
  try {
    await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'uncertain-create',
      fragments: [fragment()],
    });
    await assert.rejects(
      submitCloudRepairLane({ config, ledger, client, laneId: 'uncertain-create' }),
      /simulated connection loss/,
    );
    assert.equal(client.createCalls, 1);
    const uncertain = await loadCloudRepairLaneState(config, 'uncertain-create');
    assert.equal(uncertain?.phase, 'creating');
    assert.equal(uncertain?.remote.inputFileId, 'file-input_fake');
    assert.equal(uncertain?.remote.batchId, undefined);

    client.recoveredRecord = {
      id: 'batch_fake',
      input_file_id: 'file-input_fake',
      status: 'in_progress',
    };
    const recovered = await submitCloudRepairLane({ config, ledger, client, laneId: 'uncertain-create' });
    assert.equal(recovered.state.remote.batchId, 'batch_fake');
    assert.equal(recovered.state.requests[0]?.ledgerStatus, 'submitted');
    assert.equal(client.createCalls, 1, 'resume must not create a second potentially billable batch');
    assert.equal(client.recoverCalls, 1);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('completed batches validate recipes, persist outputs, and reconcile aggregate usage exactly once', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  const client = new FakeBatchClient();
  try {
    const prepared = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'successful-batch',
      fragments: [
        fragment(),
        fragment({ id: 'fragment-b', fragment: '<section data-dc-node-id="claim"><p>Same structure</p></section>' }),
      ],
    });
    const customId = prepared.state.requests[0]!.customId;
    const patch: StructuredRepairPatch = {
      issueFingerprint: ISSUE_A,
      operations: [{ op: 'replace_text', nodeId: 'claim', value: 'Clear, neutral service description.' }],
      explanation: 'Removed an unsupported claim.',
    };
    client.retrieveRecord = {
      id: 'batch_fake',
      status: 'completed',
      output_file_id: 'file-output_fake',
      usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 },
    };
    client.downloads.set('file-output_fake', `${outputLine(customId, patch)}\n`);

    await submitCloudRepairLane({ config, ledger, client, laneId: 'successful-batch' });
    const completed = await reconcileCloudRepairLane({ config, ledger, client, laneId: 'successful-batch' });
    assert.equal(completed.pending, false);
    assert.equal(completed.state.phase, 'settled');
    assert.equal(completed.state.remote.outputFileId, 'file-output_fake');
    assert.equal(completed.state.outputArtifact?.remoteFileId, 'file-output_fake');
    assert.equal(completed.state.requests[0]?.actualInputTokens, 80);
    assert.equal(completed.state.requests[0]?.actualOutputTokens, 20);
    assert.equal(completed.state.requests[0]?.actualCostUsd, 0.0025);
    const outcome = completed.outcomes[0];
    assert.equal(outcome?.kind, 'patch');
    if (outcome?.kind === 'patch') {
      assert.deepEqual(outcome.fragmentIds, ['fragment-a', 'fragment-b']);
      assert.deepEqual(outcome.patch, patch);
    }
    const budget = ledger.modelBudgetSnapshot();
    assert.equal(budget.actualTokens, 100);
    assert.equal(budget.accountedTokens, 100);
    assert.equal(budget.actualCostUsd, 0.0025);

    const retrieves = client.retrieveCalls;
    const downloads = client.downloadCalls;
    const resumed = await reconcileCloudRepairLane({ config, ledger, client, laneId: 'successful-batch' });
    assert.equal(resumed.outcomes[0]?.kind, 'patch');
    assert.equal(client.retrieveCalls, retrieves);
    assert.equal(client.downloadCalls, downloads);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('cross-template recipe waiters coalesce spend, survive restart, and revalidate targets on reuse', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  const client = new FakeBatchClient();
  let activeLedger = ledger;
  try {
    const owner = await prepareCloudRepairLane({
      config,
      ledger: activeLedger,
      runId,
      laneId: 'recipe-owner',
      fragments: [fragment({ id: 'owner-fragment' })],
    });
    const reservedTokens = activeLedger.modelBudgetSnapshot().accountedTokens;
    const waiter = await prepareCloudRepairLane({
      config,
      ledger: activeLedger,
      runId,
      laneId: 'recipe-waiter',
      fragments: [fragment({
        id: 'waiter-fragment',
        fragment: '<section data-dc-node-id="claim"><p>Different copy, same repair structure</p></section>',
      })],
    });
    assert.equal(owner.state.requests.length, 1);
    assert.equal(waiter.state.requests.length, 0);
    assert.equal(waiter.state.recipeWaiters?.length, 1);
    assert.equal(waiter.pending, true);
    assert.equal(activeLedger.modelBudgetSnapshot().accountedTokens, reservedTokens);

    const waiterSubmitted = await submitCloudRepairLane({ config, ledger: activeLedger, client, laneId: 'recipe-waiter' });
    assert.equal(waiterSubmitted.pending, true);
    assert.equal(client.uploadCalls, 0, 'a coalesced waiter must never upload or create a duplicate batch');

    const customId = owner.state.requests[0]!.customId;
    const recipePatch: StructuredRepairPatch = {
      issueFingerprint: ISSUE_A,
      operations: [{ op: 'replace_text', nodeId: 'claim', value: 'Reusable neutral copy.' }],
      explanation: 'Created one reusable structural recipe.',
    };
    client.retrieveRecord = {
      id: 'batch_fake',
      status: 'completed',
      output_file_id: 'file-output_recipe',
      usage: { input_tokens: 70, output_tokens: 15, total_tokens: 85 },
    };
    client.downloads.set('file-output_recipe', `${outputLine(customId, recipePatch)}\n`);
    await submitCloudRepairLane({ config, ledger: activeLedger, client, laneId: 'recipe-owner' });
    const ownerCompleted = await reconcileCloudRepairLane({ config, ledger: activeLedger, client, laneId: 'recipe-owner' });
    assert.equal(ownerCompleted.outcomes[0]?.kind, 'patch');

    activeLedger.close();
    activeLedger = new LegacyLedger({
      databasePath: config.databasePath,
      aiTokenCap: config.aiTokenCap,
      aiDollarCapUsd: config.aiDollarCapUsd,
    });
    const remoteCallsBeforeWaiterResume = client.uploadCalls + client.createCalls + client.retrieveCalls + client.downloadCalls;
    const resumedWaiter = await reconcileCloudRepairLane({ config, ledger: activeLedger, client, laneId: 'recipe-waiter' });
    assert.equal(resumedWaiter.pending, false);
    assert.equal(resumedWaiter.outcomes[0]?.kind, 'patch');
    if (resumedWaiter.outcomes[0]?.kind === 'patch') {
      assert.deepEqual(resumedWaiter.outcomes[0].fragmentIds, ['waiter-fragment']);
      assert.deepEqual(resumedWaiter.outcomes[0].patch, recipePatch);
    }
    assert.equal(
      client.uploadCalls + client.createCalls + client.retrieveCalls + client.downloadCalls,
      remoteCallsBeforeWaiterResume,
      'a restarted waiter resolves entirely from the checksummed ledger recipe',
    );

    const invalidReuse = await prepareCloudRepairLane({
      config,
      ledger: activeLedger,
      runId,
      laneId: 'recipe-invalid-target',
      fragments: [fragment({
        id: 'invalid-target-fragment',
        fragment: '<section data-dc-node-id="different"><p>No claim target</p></section>',
      })],
    });
    assert.equal(invalidReuse.pending, false);
    assert.equal(invalidReuse.outcomes[0]?.kind, 'retry');
    if (invalidReuse.outcomes[0]?.kind === 'retry') {
      assert.equal(invalidReuse.outcomes[0].reason, 'invalid_patch');
    }
    assert.equal(activeLedger.modelBudgetSnapshot().accountedTokens, 85);
  } finally {
    activeLedger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('invalid response fingerprints retry once, then deterministically select neutral fallback', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  try {
    const firstClient = new FakeBatchClient();
    const first = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'invalid-first-attempt',
      fragments: [fragment()],
    });
    firstClient.retrieveRecord = {
      id: 'batch_fake',
      status: 'completed',
      output_file_id: 'file-output_fake',
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    };
    firstClient.downloads.set('file-output_fake', `${outputLine(first.state.requests[0]!.customId, {
      issueFingerprint: ISSUE_B,
      operations: [{ op: 'replace_text', nodeId: 'claim', value: 'Neutral copy.' }],
      explanation: 'Wrong cluster fingerprint.',
    })}\n`);
    await submitCloudRepairLane({ config, ledger, client: firstClient, laneId: 'invalid-first-attempt' });
    const firstResult = await reconcileCloudRepairLane({ config, ledger, client: firstClient, laneId: 'invalid-first-attempt' });
    assert.equal(firstResult.outcomes[0]?.kind, 'retry');
    if (firstResult.outcomes[0]?.kind === 'retry') {
      assert.equal(firstResult.outcomes[0].reason, 'invalid_patch');
      assert.equal(firstResult.outcomes[0].nextAttempt, 2);
    }

    const secondClient = new FakeBatchClient();
    const second = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'invalid-second-attempt',
      fragments: [fragment({ attempt: 2 })],
    });
    secondClient.retrieveRecord = {
      id: 'batch_fake',
      status: 'completed',
      output_file_id: 'file-output_fake',
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    };
    secondClient.downloads.set('file-output_fake', `${outputLine(second.state.requests[0]!.customId, {
      issueFingerprint: ISSUE_A,
      operations: [{ op: 'replace_text', nodeId: 'invented-node', value: 'Neutral copy.' }],
      explanation: 'Invalid target.',
    })}\n`);
    await submitCloudRepairLane({ config, ledger, client: secondClient, laneId: 'invalid-second-attempt' });
    const secondResult = await reconcileCloudRepairLane({ config, ledger, client: secondClient, laneId: 'invalid-second-attempt' });
    assert.equal(secondResult.outcomes[0]?.kind, 'neutral_fallback');
    if (secondResult.outcomes[0]?.kind === 'neutral_fallback') {
      assert.equal(secondResult.outcomes[0].reason, 'attempt_ceiling');
      assert.match(secondResult.outcomes[0].detail ?? '', /invalid_patch/);
    }
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('terminal failures without reported usage keep their conservative reservation accounted', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  const client = new FakeBatchClient();
  try {
    const prepared = await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'unreported-failure',
      fragments: [fragment()],
    });
    const reserved = ledger.modelBudgetSnapshot().accountedTokens;
    client.retrieveRecord = { id: 'batch_fake', status: 'failed' };
    await submitCloudRepairLane({ config, ledger, client, laneId: 'unreported-failure' });
    const result = await reconcileCloudRepairLane({ config, ledger, client, laneId: 'unreported-failure' });
    assert.equal(result.outcomes[0]?.kind, 'retry');
    assert.equal(result.state.requests[0]?.ledgerStatus, 'failed');
    assert.equal(result.state.requests[0]?.actualInputTokens, prepared.state.requests[0]?.estimatedInputTokens);
    assert.equal(result.state.requests[0]?.actualOutputTokens, prepared.state.requests[0]?.estimatedOutputTokens);
    assert.equal(ledger.modelBudgetSnapshot().accountedTokens, reserved);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('attempt, token, and dollar ceilings return neutral fallbacks without remote work', async () => {
  const attemptFixture = await fixture();
  try {
    const result = await prepareCloudRepairLane({
      config: attemptFixture.config,
      ledger: attemptFixture.ledger,
      runId: attemptFixture.runId,
      laneId: 'attempt-ceiling',
      fragments: [fragment({ attempt: 3 })],
    });
    assert.equal(result.pending, false);
    assert.equal(result.state.requests.length, 0);
    assert.equal(result.outcomes[0]?.kind, 'neutral_fallback');
    if (result.outcomes[0]?.kind === 'neutral_fallback') assert.equal(result.outcomes[0].reason, 'attempt_ceiling');
    assert.equal(attemptFixture.ledger.modelBudgetSnapshot().accountedTokens, 0);
  } finally {
    attemptFixture.ledger.close();
    await rm(attemptFixture.scratch, { recursive: true, force: true });
  }

  const tokenFixture = await fixture({ tokens: 10 });
  try {
    const result = await prepareCloudRepairLane({
      config: tokenFixture.config,
      ledger: tokenFixture.ledger,
      runId: tokenFixture.runId,
      laneId: 'token-ceiling',
      fragments: [fragment()],
    });
    assert.equal(result.outcomes[0]?.kind, 'neutral_fallback');
    if (result.outcomes[0]?.kind === 'neutral_fallback') assert.equal(result.outcomes[0].reason, 'token_ceiling');
    assert.equal(tokenFixture.ledger.modelBudgetSnapshot().accountedTokens, 0);
  } finally {
    tokenFixture.ledger.close();
    await rm(tokenFixture.scratch, { recursive: true, force: true });
  }

  const dollarFixture = await fixture({ tokens: 1_000_000, dollars: 0.000001 });
  try {
    const result = await prepareCloudRepairLane({
      config: dollarFixture.config,
      ledger: dollarFixture.ledger,
      runId: dollarFixture.runId,
      laneId: 'cost-ceiling',
      fragments: [fragment()],
    });
    assert.equal(result.outcomes[0]?.kind, 'neutral_fallback');
    if (result.outcomes[0]?.kind === 'neutral_fallback') assert.equal(result.outcomes[0].reason, 'cost_ceiling');
    assert.equal(dollarFixture.ledger.modelBudgetSnapshot().accountedCostUsd, 0);
  } finally {
    dollarFixture.ledger.close();
    await rm(dollarFixture.scratch, { recursive: true, force: true });
  }
});

test('local patch validation rejects schema extensions, unsafe fragments, and absent targets', () => {
  const valid: StructuredRepairPatch = {
    issueFingerprint: ISSUE_A,
    operations: [{ op: 'replace_attribute', nodeId: 'claim', attribute: 'aria-label', value: 'Services' }],
    explanation: 'Clarified the label.',
  };
  assert.doesNotThrow(() => validateCloudRepairPatch(valid, ISSUE_A, ['claim']));
  assert.throws(
    () => validateCloudRepairPatch({ ...valid, extra: true } as StructuredRepairPatch, ISSUE_A, ['claim']),
    /allowed schema/,
  );
  assert.throws(
    () => validateCloudRepairPatch({ ...valid, operations: [{ op: 'remove_node', nodeId: 'missing' }] }, ISSUE_A, ['claim']),
    /absent from its supplied fragment/,
  );
  assert.throws(
    () => validateCloudRepairPatch({
      ...valid,
      operations: [{ op: 'replace_fragment', nodeId: 'claim', safeHtml: '<style>body{display:none}</style>' }],
    }, ISSUE_A, ['claim']),
    /unsafe markup/,
  );
});

test('persisted state is checksummed and fails closed after tampering', async () => {
  const { scratch, config, ledger, runId } = await fixture();
  try {
    await prepareCloudRepairLane({
      config,
      ledger,
      runId,
      laneId: 'tamper-check',
      fragments: [fragment()],
    });
    const path = cloudLaneStatePath(config, 'tamper-check');
    const parsed = JSON.parse(await readFile(path, 'utf8')) as { state: { runId: string } };
    parsed.state.runId = 'tampered-run';
    await writeFile(path, `${JSON.stringify(parsed)}\n`);
    await assert.rejects(loadCloudRepairLaneState(config, 'tamper-check'), /checksum mismatch/);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

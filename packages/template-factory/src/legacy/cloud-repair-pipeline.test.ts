import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { AssetVendor } from './assets.js';
import type { CloudBatchRecord, CloudRepairBatchClient } from './cloud-lane.js';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { ACTIVE_LEGACY_NICHES, inventoryLegacyTemplate } from './inventory.js';
import { LegacyLedger } from './ledger.js';
import { legacyCommandServices, repairOne } from './pipeline.js';
import type { LegacyCommandContext } from './types.js';

class PipelineCloudClient implements CloudRepairBatchClient {
  calls = 0;
  customId = '';
  fingerprint = '';

  constructor(private readonly replacement = 'Contact the practice for current details.') {}

  async uploadJsonl(_filename: string, jsonl: string): Promise<string> {
    this.calls += 1;
    const line = JSON.parse(jsonl.trim()) as { custom_id: string; body: { input: string } };
    this.customId = line.custom_id;
    this.fingerprint = line.body.input.match(/Issue fingerprint: ([a-f0-9]+)/i)?.[1] ?? '';
    return 'file-pipeline_input';
  }

  async create(inputFileId: string): Promise<CloudBatchRecord> {
    this.calls += 1;
    return { id: 'batch_pipeline_1', status: 'in_progress', input_file_id: inputFileId };
  }

  async retrieve(): Promise<CloudBatchRecord> {
    this.calls += 1;
    return {
      id: 'batch_pipeline_1',
      status: 'completed',
      input_file_id: 'file-pipeline_input',
      output_file_id: 'file-pipeline_output',
      usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 },
    };
  }

  async downloadFile(): Promise<string> {
    this.calls += 1;
    return `${JSON.stringify({
      custom_id: this.customId,
      response: {
        status_code: 200,
        body: {
          id: 'resp_pipeline_1',
          output: [{ content: [{ text: JSON.stringify({
            issueFingerprint: this.fingerprint,
            operations: [{
              op: 'replace_text',
              nodeId: 'cloud-n2',
              value: this.replacement,
            }],
            explanation: 'Replaced an unmatched template expression with neutral copy.',
          }) }] }],
        },
      },
    })}\n`;
  }
}

async function fixture(
  cloudRepair: boolean,
  editorialCopy = 'Unresolved editorial copy {{ broken',
): Promise<{
  scratch: string;
  context: LegacyCommandContext;
  ledger: LegacyLedger;
  vendor: AssetVendor;
  lease: NonNullable<ReturnType<LegacyLedger['leaseTemplates']>[number]>;
}> {
  const scratch = await mkdtemp(join(tmpdir(), `legacy-pipeline-cloud-${cloudRepair ? 'on' : 'off'}-`));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const templateRoot = join(sourceRoot, 'wellness_coach', 'literal-contact-copy');
  await Promise.all(ACTIVE_LEGACY_NICHES.map((niche) => mkdir(join(sourceRoot, niche), { recursive: true })));
  await mkdir(templateRoot, { recursive: true });
  await writeFile(join(templateRoot, 'index.html'), [
    '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body>',
    `<main><h1>{{BUSINESS_NAME}}</h1><p>${editorialCopy}</p>`,
    '<a href="mailto:{{EMAIL}}">Contact us</a></main></body></html>',
  ].join(''));
  await writeFile(join(templateRoot, 'template.json'), JSON.stringify({
    slug: 'literal-contact-copy',
    niche: 'wellness_coach',
    pages: ['index.html'],
  }));
  await writeFile(join(templateRoot, 'fields.json'), JSON.stringify({
    fields: [
      { name: 'BUSINESS_NAME', default: 'Example Wellness' },
      { name: 'EMAIL', default: 'contact@example.test' },
    ],
  }));
  const config = resolveLegacyConfig({
    sourceRoot,
    workRoot,
    databasePath: 'ledger.sqlite',
    ruleVersion: 'cloud-integration-test',
    cloudRepair,
  });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
  const inventory = await inventoryLegacyTemplate(sourceRoot, 'wellness_coach', 'literal-contact-copy');
  ledger.upsertTemplate(run.id, {
    legacySlug: inventory.slug,
    niche: inventory.niche,
    sourcePath: inventory.sourceDir,
    sourceHash: inventory.sourceTreeHash,
    pageCount: inventory.pages.length,
    stage: 'repair_pending',
  }, config.ruleVersion);
  const lease = ledger.leaseTemplates({
    stages: ['repair_pending'],
    claimedStage: 'repairing',
    owner: 'cloud-pipeline-test',
    limit: 1,
    leaseMs: 15 * 60_000,
    runId: run.id,
  })[0]!;
  const vendor = new AssetVendor(join(workRoot, 'asset-cache'));
  await vendor.initialize();
  return {
    scratch,
    ledger,
    vendor,
    lease,
    context: {
      command: 'run',
      config,
      flags: { resume: false, dryRun: false, json: false, cloudRepair },
      ledger,
      runId: run.id,
    },
  };
}

async function currentCandidateSnapshot(
  setup: Awaited<ReturnType<typeof fixture>>,
): Promise<{ hash: string; rehabilitation: string }> {
  const template = setup.ledger.getTemplate(setup.lease.id);
  assert.ok(template?.resultHash);
  const artifact = setup.ledger.listArtifacts({
    templateId: setup.lease.id,
    kind: 'candidate-template',
  }).find((candidate) => candidate.contentHash === template.resultHash);
  assert.ok(artifact);
  return {
    hash: artifact.contentHash,
    rehabilitation: await readFile(join(
      resolve(setup.context.config.workRoot, artifact.relativePath),
      '.dailyclarity',
      'rehabilitation.json',
    ), 'utf8'),
  };
}

test('repairOne invokes the opt-in lane only for an unresolved eligible fragment and recompiles its patch', async () => {
  const setup = await fixture(true);
  const client = new PipelineCloudClient();
  setup.context.cloudRepairClient = client;
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'repaired');
    assert.equal(client.calls, 4);
    const template = setup.ledger.getTemplate(setup.lease.id)!;
    assert.equal(template.stage, 'render_pending');
    assert.equal(setup.ledger.modelBudgetSnapshot().actualTokens, 100);
    const artifact = setup.ledger.listArtifacts({ templateId: template.id, kind: 'candidate-template' })[0]!;
    const root = resolve(setup.context.config.workRoot, artifact.relativePath);
    const html = await readFile(join(root, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /\{\{ broken/);
    assert.match(html, /Contact the practice for current details/);
    const metadata = JSON.parse(await readFile(join(root, '.dailyclarity', 'rehabilitation.json'), 'utf8')) as {
      repairMode: string;
      primaryRepairPassed: boolean;
      primaryFailureCodes: string[];
    };
    assert.equal(metadata.repairMode, 'cloud_fragment');
    assert.equal(metadata.primaryRepairPassed, false);
    assert.ok(metadata.primaryFailureCodes.length > 0);
    assert.equal('cloudRepair' in metadata, false, 'execution provenance must stay out of candidate bytes');
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('cloud-success candidate bytes are deterministic across independent run and lane identities', async () => {
  const first = await fixture(true);
  const second = await fixture(true);
  const firstClient = new PipelineCloudClient();
  const secondClient = new PipelineCloudClient();
  first.context.cloudRepairClient = firstClient;
  second.context.cloudRepairClient = secondClient;
  try {
    assert.notEqual(first.context.runId, second.context.runId);
    assert.equal(await repairOne(first.context, first.lease, first.vendor), 'repaired');
    assert.equal(await repairOne(second.context, second.lease, second.vendor), 'repaired');
    assert.ok(firstClient.calls > 0);
    assert.ok(secondClient.calls > 0);

    const firstCandidate = await currentCandidateSnapshot(first);
    const secondCandidate = await currentCandidateSnapshot(second);
    assert.equal(firstCandidate.hash, secondCandidate.hash);
    assert.equal(firstCandidate.rehabilitation, secondCandidate.rehabilitation);
    const metadata = JSON.parse(firstCandidate.rehabilitation) as Record<string, unknown>;
    assert.equal(metadata.repairMode, 'cloud_fragment');
    assert.equal('cloudRepair' in metadata, false);
  } finally {
    first.ledger.close();
    second.ledger.close();
    await Promise.all([
      rm(first.scratch, { recursive: true, force: true }),
      rm(second.scratch, { recursive: true, force: true }),
    ]);
  }
});

test('primary candidate bytes do not disclose whether cloud execution was enabled', async () => {
  const cloudDisabled = await fixture(false, 'Current services and availability are provided on request.');
  const cloudEnabled = await fixture(true, 'Current services and availability are provided on request.');
  const client = new PipelineCloudClient();
  cloudEnabled.context.cloudRepairClient = client;
  try {
    assert.equal(await repairOne(
      cloudDisabled.context,
      cloudDisabled.lease,
      cloudDisabled.vendor,
    ), 'repaired');
    assert.equal(await repairOne(
      cloudEnabled.context,
      cloudEnabled.lease,
      cloudEnabled.vendor,
    ), 'repaired');
    assert.equal(client.calls, 0, 'a passing primary candidate never enters the cloud lane');

    const disabledCandidate = await currentCandidateSnapshot(cloudDisabled);
    const enabledCandidate = await currentCandidateSnapshot(cloudEnabled);
    assert.equal(disabledCandidate.hash, enabledCandidate.hash);
    assert.equal(disabledCandidate.rehabilitation, enabledCandidate.rehabilitation);
    const metadata = JSON.parse(enabledCandidate.rehabilitation) as Record<string, unknown>;
    assert.equal(metadata.repairMode, 'primary');
    assert.equal('cloudRepair' in metadata, false);
  } finally {
    cloudDisabled.ledger.close();
    cloudEnabled.ledger.close();
    await Promise.all([
      rm(cloudDisabled.scratch, { recursive: true, force: true }),
      rm(cloudEnabled.scratch, { recursive: true, force: true }),
    ]);
  }
});

test('cloud recipe resume produces the same candidate without replaying remote work', async () => {
  const setup = await fixture(true);
  const firstClient = new PipelineCloudClient();
  setup.context.cloudRepairClient = firstClient;
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'repaired');
    assert.ok(firstClient.calls > 0);
    const uncachedCandidate = await currentCandidateSnapshot(setup);

    const renderLease = setup.ledger.leaseTemplates({
      stages: ['render_pending'],
      claimedStage: 'rendering',
      owner: 'cloud-cache-reset-renderer',
      limit: 1,
      runId: setup.context.runId,
    })[0]!;
    assert.ok(renderLease);
    assert.equal(setup.ledger.requeueLeasedTemplateForRepair({
      templateId: renderLease.id,
      leaseToken: renderLease.leaseToken,
      reason: 'exercise persisted cloud recipe reuse',
      runId: setup.context.runId,
    }), true);
    const retryLease = setup.ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'cloud-cache-repairer',
      limit: 1,
      runId: setup.context.runId,
    })[0]!;
    assert.ok(retryLease);
    const cachedClient = new PipelineCloudClient();
    setup.context.cloudRepairClient = cachedClient;
    assert.equal(await repairOne(setup.context, retryLease, setup.vendor), 'repaired');
    assert.equal(cachedClient.calls, 0, 'the completed lane is resumed entirely from durable state');

    const cachedCandidate = await currentCandidateSnapshot(setup);
    assert.equal(cachedCandidate.hash, uncachedCandidate.hash);
    assert.equal(cachedCandidate.rehabilitation, uncachedCandidate.rehabilitation);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('repairOne remains offline by default and uses its deterministic neutral fallback', async () => {
  const setup = await fixture(false);
  const client = new PipelineCloudClient();
  setup.context.cloudRepairClient = client;
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'neutral_fallback');
    assert.equal(client.calls, 0);

    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    });
    assert.equal(evidence.length, 1);
    const failedPrimary = evidence[0]!;
    assert.match(failedPrimary.contentHash, /^[a-f0-9]{64}$/);
    assert.equal(
      failedPrimary.relativePath.replace(/\\/g, '/'),
      `artifacts/failed-primary/wellness_coach/literal-contact-copy/${failedPrimary.contentHash}`,
    );
    const occurrence = setup.ledger.listArtifactOccurrences({
      artifactId: failedPrimary.id,
      runId: setup.context.runId,
      templateId: setup.lease.id,
    })[0]!;
    assert.equal(occurrence.artifactId, failedPrimary.id);
    const metadata = occurrence.metadata as {
      version: number;
      purpose: string;
      sourceHash: string;
      ruleVersion: string;
      candidateReceiptHash: string;
      candidateOrigin: string;
      niche: string;
      legacySlug: string;
      relativePath: string;
      contentHash: string;
      byteSize: number;
      fileCount: number;
      verificationErrors: Array<{ code: string; page?: string; detail: string }>;
    };
    assert.equal(metadata.version, 2);
    assert.equal(metadata.purpose, 'static-candidate-before-neutral-fallback');
    assert.equal(metadata.niche, setup.lease.niche);
    assert.equal(metadata.legacySlug, setup.lease.legacySlug);
    assert.equal(metadata.relativePath, failedPrimary.relativePath);
    assert.equal(metadata.contentHash, failedPrimary.contentHash);
    assert.equal(metadata.byteSize, failedPrimary.byteSize);
    assert.equal(metadata.sourceHash, setup.lease.sourceHash);
    assert.equal(metadata.ruleVersion, setup.context.config.ruleVersion);
    assert.match(metadata.candidateReceiptHash, /^[a-f0-9]{64}$/);
    assert.equal(metadata.candidateOrigin, 'primary');
    assert.ok(metadata.fileCount > 0);
    assert.ok(metadata.verificationErrors.length > 0);

    const failedRoot = resolve(setup.context.config.workRoot, failedPrimary.relativePath);
    const tree = JSON.parse(await readFile(join(failedRoot, '.dailyclarity', 'artifact-tree.json'), 'utf8')) as {
      version: number;
      treeHash: string;
      files: Array<{ path: string; sha256: string; bytes: number }>;
    };
    assert.equal(tree.version, 1);
    assert.equal(tree.treeHash, failedPrimary.contentHash);
    assert.equal(tree.files.length, metadata.fileCount);
    assert.equal(tree.files.reduce((sum, file) => sum + file.bytes, 0), failedPrimary.byteSize);
    assert.match(await readFile(join(failedRoot, 'index.html'), 'utf8'), /\{\{ broken/);

    const candidate = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'candidate-template',
    })[0]!;
    assert.notEqual(candidate.contentHash, failedPrimary.contentHash);
    const candidateRoot = resolve(setup.context.config.workRoot, candidate.relativePath);
    assert.doesNotMatch(
      await readFile(join(candidateRoot, 'index.html'), 'utf8'),
      /\{\{ broken/,
    );
    const rehabilitation = JSON.parse(
      await readFile(join(candidateRoot, '.dailyclarity', 'rehabilitation.json'), 'utf8'),
    ) as { failedPrimaryArtifact: Record<string, unknown> };
    assert.deepEqual(rehabilitation.failedPrimaryArtifact, {
      contentHash: failedPrimary.contentHash,
      relativePath: failedPrimary.relativePath,
      candidateOrigin: 'primary',
    });

    const audit = new DatabaseSync(setup.context.config.databasePath, { readOnly: true });
    try {
      const transformation = audit.prepare(`
        SELECT details_json FROM transformations
        WHERE template_id = ? AND rule_code = 'apply-neutral-fallback'
      `).get(setup.lease.id) as { details_json: string } | undefined;
      assert.ok(transformation);
      const details = JSON.parse(transformation.details_json) as {
        failedPrimaryArtifact: {
          artifactId: number;
          occurrenceId: number;
          kind: string;
          contentHash: string;
          relativePath: string;
          byteSize: number;
          candidateOrigin: string;
        };
      };
      assert.deepEqual(details.failedPrimaryArtifact, {
        artifactId: failedPrimary.id,
        occurrenceId: occurrence.id,
        kind: 'failed-primary-template',
        contentHash: failedPrimary.contentHash,
        relativePath: failedPrimary.relativePath,
        byteSize: failedPrimary.byteSize,
        candidateOrigin: 'primary',
      });
      const issueArtifacts = audit.prepare(`
        SELECT DISTINCT artifact_hash FROM issues
        WHERE template_id = ? AND artifact_hash IS NOT NULL
      `).all(setup.lease.id) as Array<{ artifact_hash: string }>;
      assert.deepEqual(issueArtifacts.map((row) => row.artifact_hash), [failedPrimary.contentHash]);
    } finally {
      audit.close();
    }
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('fallback evidence captures the exact final cloud-patched candidate when cloud repair remains invalid', async () => {
  const setup = await fixture(true);
  const client = new PipelineCloudClient('Cloud candidate still contains {{ broken');
  setup.context.cloudRepairClient = client;
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'neutral_fallback');
    assert.ok(client.calls > 0);

    const failedPrimary = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const occurrence = setup.ledger.listArtifactOccurrences({
      artifactId: failedPrimary.id,
      runId: setup.context.runId,
      templateId: setup.lease.id,
    })[0]!;
    const metadata = occurrence.metadata as {
      candidateOrigin: string;
      candidateReceiptHash: string;
      verificationErrors: Array<{ detail: string }>;
    };
    assert.equal(metadata.candidateOrigin, 'cloud_fragment_attempt');
    assert.match(metadata.candidateReceiptHash, /^[a-f0-9]{64}$/);
    assert.ok(metadata.verificationErrors.length > 0);
    assert.match(
      await readFile(
        join(resolve(setup.context.config.workRoot, failedPrimary.relativePath), 'index.html'),
        'utf8',
      ),
      /Cloud candidate still contains \{\{ broken/,
    );

    const candidate = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'candidate-template',
    })[0]!;
    const rehabilitation = JSON.parse(await readFile(join(
      resolve(setup.context.config.workRoot, candidate.relativePath),
      '.dailyclarity',
      'rehabilitation.json',
    ), 'utf8')) as { failedPrimaryArtifact: { contentHash: string; candidateOrigin: string } };
    assert.equal(rehabilitation.failedPrimaryArtifact.contentHash, failedPrimary.contentHash);
    assert.equal(rehabilitation.failedPrimaryArtifact.candidateOrigin, 'cloud_fragment_attempt');

    const audit = new DatabaseSync(setup.context.config.databasePath, { readOnly: true });
    try {
      const row = audit.prepare(`
        SELECT before_hash, details_json FROM transformations
        WHERE template_id = ? AND rule_code = 'apply-neutral-fallback'
      `).get(setup.lease.id) as { before_hash: string; details_json: string };
      const details = JSON.parse(row.details_json) as {
        reason: string;
        failedPrimaryArtifact: { contentHash: string; candidateOrigin: string };
      };
      assert.equal(row.before_hash, metadata.candidateReceiptHash);
      assert.match(details.reason, /unsupported template expression/i);
      assert.equal(details.failedPrimaryArtifact.contentHash, failedPrimary.contentHash);
      assert.equal(details.failedPrimaryArtifact.candidateOrigin, 'cloud_fragment_attempt');
      const linkedIssues = audit.prepare(`
        SELECT details_json FROM issues
        WHERE template_id = ? AND artifact_hash = ?
      `).all(setup.lease.id, failedPrimary.contentHash) as Array<{ details_json: string }>;
      assert.equal(linkedIssues.length, metadata.verificationErrors.length);
      for (const issue of linkedIssues) {
        const issueDetails = JSON.parse(issue.details_json) as {
          phase: string;
          failedPrimaryOccurrenceId: number;
        };
        assert.equal(issueDetails.phase, 'pre_neutral_fallback');
        assert.equal(issueDetails.failedPrimaryOccurrenceId, occurrence.id);
      }
    } finally {
      audit.close();
    }
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('neutral fallback bytes are deterministic across independent ledger id allocations', async () => {
  const first = await fixture(false);
  const second = await fixture(false);
  try {
    second.ledger.addArtifact({
      runId: second.context.runId,
      templateId: second.lease.id,
      kind: 'id-allocation-sentinel',
      contentHash: 'sentinel-hash',
      relativePath: 'artifacts/test/sentinel',
      byteSize: 0,
      metadata: { purpose: 'shift auto ids only' },
    });
    assert.equal(await repairOne(first.context, first.lease, first.vendor), 'neutral_fallback');
    assert.equal(await repairOne(second.context, second.lease, second.vendor), 'neutral_fallback');

    const firstEvidence = first.ledger.listArtifacts({
      templateId: first.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const secondEvidence = second.ledger.listArtifacts({
      templateId: second.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    assert.notEqual(firstEvidence.id, secondEvidence.id);
    assert.equal(firstEvidence.contentHash, secondEvidence.contentHash);

    const candidateDocument = async (setup: Awaited<ReturnType<typeof fixture>>): Promise<{
      hash: string;
      rehabilitation: { failedPrimaryArtifact: Record<string, unknown> };
    }> => {
      const candidate = setup.ledger.listArtifacts({
        templateId: setup.lease.id,
        kind: 'candidate-template',
      })[0]!;
      return {
        hash: candidate.contentHash,
        rehabilitation: JSON.parse(await readFile(join(
          resolve(setup.context.config.workRoot, candidate.relativePath),
          '.dailyclarity',
          'rehabilitation.json',
        ), 'utf8')) as { failedPrimaryArtifact: Record<string, unknown> },
      };
    };
    const firstCandidate = await candidateDocument(first);
    const secondCandidate = await candidateDocument(second);
    assert.equal(firstCandidate.hash, secondCandidate.hash);
    assert.deepEqual(firstCandidate.rehabilitation, secondCandidate.rehabilitation);
    assert.deepEqual(
      Object.keys(firstCandidate.rehabilitation.failedPrimaryArtifact).sort(),
      ['candidateOrigin', 'contentHash', 'relativePath'],
    );
  } finally {
    first.ledger.close();
    second.ledger.close();
    await Promise.all([
      rm(first.scratch, { recursive: true, force: true }),
      rm(second.scratch, { recursive: true, force: true }),
    ]);
  }
});

test('failed-primary occurrences remain distinct after an evidence requeue resets attempts', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const renderLease = setup.ledger.leaseTemplates({
      stages: ['render_pending'],
      claimedStage: 'rendering',
      owner: 'forensic-reset-renderer',
      limit: 1,
      runId: setup.context.runId,
    })[0]!;
    assert.ok(renderLease);
    assert.equal(setup.ledger.requeueLeasedTemplateForRepair({
      templateId: renderLease.id,
      leaseToken: renderLease.leaseToken,
      reason: 'simulated downstream evidence reset',
      runId: setup.context.runId,
    }), true);
    const retryLease = setup.ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'forensic-reset-repairer',
      limit: 1,
      runId: setup.context.runId,
    })[0]!;
    assert.ok(retryLease);
    assert.equal(retryLease.attempts, setup.lease.attempts, 'the requeue resets the numerical attempt');
    assert.notEqual(retryLease.leaseToken, setup.lease.leaseToken);
    assert.equal(await repairOne(setup.context, retryLease, setup.vendor), 'neutral_fallback');

    const artifacts = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    });
    assert.equal(artifacts.length, 1, 'the exact failed tree remains physically deduplicated');
    const occurrences = setup.ledger.listArtifactOccurrences({
      artifactId: artifacts[0]!.id,
      runId: setup.context.runId,
      templateId: setup.lease.id,
    });
    assert.equal(occurrences.length, 2);
    assert.deepEqual(new Set(occurrences.map((occurrence) => occurrence.occurrenceKey)), new Set([
      `repair-lease:${setup.lease.leaseToken}`,
      `repair-lease:${retryLease.leaseToken}`,
    ]));
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report verifies retained failed-primary trees instead of trusting ledger counts', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const outcome = await legacyCommandServices.report!(setup.context);
    assert.ok(outcome);
    const details = outcome.details as {
      failedPrimaryIntegrity: {
        recordedTrees: number;
        recordedOccurrences: number;
        valid: number;
        missing: number;
        corrupt: number;
        failures: unknown[];
      };
      failedPrimaryIntegrityPath: string;
    };
    assert.deepEqual(details.failedPrimaryIntegrity, {
      recordedTrees: 1,
      recordedOccurrences: 1,
      valid: 1,
      missing: 0,
      corrupt: 0,
      failures: [],
    });
    const retainedAudit = JSON.parse(
      await readFile(details.failedPrimaryIntegrityPath, 'utf8'),
    ) as { version: number; valid: number; missing: number; corrupt: number };
    assert.equal(retainedAudit.version, 1);
    assert.deepEqual(
      { valid: retainedAudit.valid, missing: retainedAudit.missing, corrupt: retainedAudit.corrupt },
      { valid: 1, missing: 0, corrupt: 0 },
    );
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report verifies historical failed-primary paths after the current template niche changes', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const occurrence = setup.ledger.listArtifactOccurrences({ artifactId: evidence.id })[0]!;
    const identity = occurrence.metadata as {
      version: number;
      niche: string;
      legacySlug: string;
      relativePath: string;
      contentHash: string;
    };
    assert.equal(identity.version, 2);
    assert.equal(identity.niche, 'wellness_coach');
    assert.equal(identity.legacySlug, 'literal-contact-copy');
    assert.equal(identity.relativePath, evidence.relativePath);
    assert.equal(identity.contentHash, evidence.contentHash);

    const mutation = new DatabaseSync(setup.context.config.databasePath);
    try {
      mutation.prepare('UPDATE templates SET niche = ? WHERE id = ?')
        .run('aromatherapy', setup.lease.id);
    } finally {
      mutation.close();
    }
    assert.equal(setup.ledger.getTemplate(setup.lease.id)?.niche, 'aromatherapy');

    const outcome = await legacyCommandServices.report!(setup.context);
    assert.ok(outcome);
    const details = outcome.details as {
      failedPrimaryIntegrity: { valid: number; missing: number; corrupt: number };
    };
    assert.equal(details.failedPrimaryIntegrity.valid, 1);
    assert.equal(details.failedPrimaryIntegrity.missing, 0);
    assert.equal(details.failedPrimaryIntegrity.corrupt, 0);
    assert.equal(
      (occurrence.metadata as { niche: string }).niche,
      'wellness_coach',
      'the immutable occurrence identity remains the original niche',
    );
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report rejects a conflicting failed-primary occurrence identity', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const occurrence = setup.ledger.listArtifactOccurrences({ artifactId: evidence.id })[0]!;
    setup.ledger.addArtifactOccurrence({
      runId: setup.context.runId,
      templateId: setup.lease.id,
      kind: evidence.kind,
      contentHash: evidence.contentHash,
      relativePath: evidence.relativePath,
      byteSize: evidence.byteSize,
      occurrenceKey: 'conflicting-identity-regression',
      metadata: {
        ...(occurrence.metadata as Record<string, unknown>),
        niche: 'aromatherapy',
      },
    });

    await assert.rejects(
      legacyCommandServices.report!(setup.context),
      /valid=0, missing=0, corrupt=1/,
    );
    const retainedAudit = JSON.parse(await readFile(
      join(setup.context.config.reportRoot, 'failed-primary-integrity.json'),
      'utf8',
    )) as { failures: Array<{ detail: string }> };
    assert.match(retainedAudit.failures[0]?.detail ?? '', /does not bind the retained physical path and hash/i);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report keeps schema-v7 backfill evidence verifiable without mutable template identity', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const occurrence = setup.ledger.listArtifactOccurrences({ artifactId: evidence.id })[0]!;
    const mutation = new DatabaseSync(setup.context.config.databasePath);
    try {
      mutation.prepare('UPDATE artifact_occurrences SET metadata_json = ? WHERE id = ?')
        .run(JSON.stringify({ retained: true }), occurrence.id);
      mutation.prepare('UPDATE templates SET niche = ? WHERE id = ?')
        .run('aromatherapy', setup.lease.id);
    } finally {
      mutation.close();
    }

    const outcome = await legacyCommandServices.report!(setup.context);
    assert.ok(outcome);
    const details = outcome.details as {
      failedPrimaryIntegrity: { valid: number; missing: number; corrupt: number };
    };
    assert.equal(details.failedPrimaryIntegrity.valid, 1);
    assert.equal(details.failedPrimaryIntegrity.missing, 0);
    assert.equal(details.failedPrimaryIntegrity.corrupt, 0);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report fails closed and records a missing failed-primary evidence tree', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    await rm(resolve(setup.context.config.workRoot, evidence.relativePath), {
      recursive: true,
      force: true,
    });

    await assert.rejects(
      legacyCommandServices.report!(setup.context),
      /valid=0, missing=1, corrupt=0/,
    );
    const retainedAudit = JSON.parse(await readFile(
      join(setup.context.config.reportRoot, 'failed-primary-integrity.json'),
      'utf8',
    )) as {
      valid: number;
      missing: number;
      corrupt: number;
      failures: Array<{ artifactId: number; contentHash: string; status: string; detail: string }>;
    };
    assert.equal(retainedAudit.valid, 0);
    assert.equal(retainedAudit.missing, 1);
    assert.equal(retainedAudit.corrupt, 0);
    assert.equal(retainedAudit.failures[0]?.artifactId, evidence.id);
    assert.equal(retainedAudit.failures[0]?.contentHash, evidence.contentHash);
    assert.equal(retainedAudit.failures[0]?.status, 'missing');
    assert.match(retainedAudit.failures[0]?.detail ?? '', /directory is missing/i);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('report fails closed and records corrupt failed-primary evidence', async () => {
  const setup = await fixture(false);
  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'neutral_fallback');
    const evidence = setup.ledger.listArtifacts({
      templateId: setup.lease.id,
      kind: 'failed-primary-template',
    })[0]!;
    const manifestPath = join(
      resolve(setup.context.config.workRoot, evidence.relativePath),
      '.dailyclarity',
      'artifact-tree.json',
    );
    await writeFile(manifestPath, '{"version":1,"treeHash":"tampered","files":[]}\n');

    await assert.rejects(
      legacyCommandServices.report!(setup.context),
      /valid=0, missing=0, corrupt=1/,
    );
    const retainedAudit = JSON.parse(await readFile(
      join(setup.context.config.reportRoot, 'failed-primary-integrity.json'),
      'utf8',
    )) as {
      valid: number;
      missing: number;
      corrupt: number;
      failures: Array<{ artifactId: number; contentHash: string; status: string; detail: string }>;
    };
    assert.equal(retainedAudit.valid, 0);
    assert.equal(retainedAudit.missing, 0);
    assert.equal(retainedAudit.corrupt, 1);
    assert.equal(retainedAudit.failures[0]?.artifactId, evidence.id);
    assert.equal(retainedAudit.failures[0]?.contentHash, evidence.contentHash);
    assert.equal(retainedAudit.failures[0]?.status, 'corrupt');
    assert.match(retainedAudit.failures[0]?.detail ?? '', /does not attest/i);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('failed-primary materialization refuses a junction or symlink ancestor before any external write', async (t) => {
  const setup = await fixture(false);
  const outsideWork = join(setup.scratch, 'outside-work-evidence');
  const linkedEvidenceRoot = join(
    setup.context.config.artifactRoot,
    'failed-primary',
    'wellness_coach',
    'literal-contact-copy',
  );
  await mkdir(outsideWork, { recursive: true });
  await mkdir(join(setup.context.config.artifactRoot, 'failed-primary', 'wellness_coach'), { recursive: true });
  try {
    await symlink(outsideWork, linkedEvidenceRoot, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      setup.ledger.close();
      await rm(setup.scratch, { recursive: true, force: true });
      t.skip('This host does not permit creating a test junction/symlink');
      return;
    }
    throw error;
  }

  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'failed');
    const outsideEntries = await readdir(outsideWork, { withFileTypes: true });
    assert.deepEqual(outsideEntries, [], 'the external junction target must remain completely untouched');
    assert.match(
      setup.ledger.getTemplate(setup.lease.id)?.lastError ?? '',
      /Refusing to materialize failed-primary evidence: directory chain contains a link, reparse point, or non-directory/,
    );
    assert.equal(setup.ledger.listArtifacts({ kind: 'failed-primary-template' }).length, 0);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('candidate materialization refuses a junction or symlink ancestor before any external write', async (t) => {
  const setup = await fixture(false, 'Current services and availability are provided on request.');
  const outsideWork = join(setup.scratch, 'outside-work-candidate');
  const linkedCandidateRoot = join(
    setup.context.config.artifactRoot,
    'candidates',
    'wellness_coach',
    'literal-contact-copy',
  );
  await mkdir(outsideWork, { recursive: true });
  await mkdir(join(setup.context.config.artifactRoot, 'candidates', 'wellness_coach'), { recursive: true });
  try {
    await symlink(outsideWork, linkedCandidateRoot, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      setup.ledger.close();
      await rm(setup.scratch, { recursive: true, force: true });
      t.skip('This host does not permit creating a test junction/symlink');
      return;
    }
    throw error;
  }

  try {
    assert.equal(await repairOne(setup.context, setup.lease, setup.vendor), 'failed');
    assert.deepEqual(
      await readdir(outsideWork, { withFileTypes: true }),
      [],
      'the external candidate junction target must remain completely untouched',
    );
    assert.match(
      setup.ledger.getTemplate(setup.lease.id)?.lastError ?? '',
      /Refusing to materialize candidate artifact: directory chain contains a link, reparse point, or non-directory/,
    );
    assert.equal(setup.ledger.listArtifacts({ kind: 'candidate-template' }).length, 0);
    assert.equal(setup.ledger.listArtifacts({ kind: 'failed-primary-template' }).length, 0);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('repairOne fails closed before fallback when failed-primary evidence cannot enter the ledger', async () => {
  const setup = await fixture(false);
  const addArtifactOccurrence = setup.ledger.addArtifactOccurrence.bind(setup.ledger);
  setup.ledger.addArtifactOccurrence = ((input: Parameters<LegacyLedger['addArtifactOccurrence']>[0]) => {
    if (input.kind === 'failed-primary-template') throw new Error('simulated forensic ledger failure');
    return addArtifactOccurrence(input);
  }) as LegacyLedger['addArtifactOccurrence'];
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'failed');
    assert.equal(setup.ledger.getTemplate(setup.lease.id)?.stage, 'repair_pending');
    assert.equal(setup.ledger.listArtifacts({ templateId: setup.lease.id, kind: 'candidate-template' }).length, 0);
    const orphanEntries = await readdir(join(
      setup.context.config.artifactRoot,
      'failed-primary',
      'wellness_coach',
      'literal-contact-copy',
    )).catch(() => []);
    assert.deepEqual(orphanEntries, []);

    const audit = new DatabaseSync(setup.context.config.databasePath, { readOnly: true });
    try {
      const fallbackCount = audit.prepare(`
        SELECT COUNT(*) AS count FROM transformations
        WHERE template_id = ? AND rule_code = 'apply-neutral-fallback'
      `).get(setup.lease.id) as { count: number };
      assert.equal(Number(fallbackCount.count), 0);
    } finally {
      audit.close();
    }
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

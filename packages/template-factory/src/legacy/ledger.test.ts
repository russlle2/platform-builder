import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { runLegacyCli } from './cli.js';
import { LegacyLedger } from './ledger.js';
import {
  DEFAULT_LEGACY_RULE_VERSION,
  LEGACY_CANCEL_EXIT_CODE,
  LEGACY_SCHEMA_VERSION,
  LegacyCancellationError,
} from './types.js';

test('WAL ledger leases work idempotently and produces aggregate status', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-ledger-'));
  const ledger = new LegacyLedger({
    databasePath: join(scratch, 'ledger.sqlite'),
    aiDollarCapUsd: 1,
    aiTokenCap: 100,
  });

  try {
    assert.equal(ledger.journalMode().toLowerCase(), 'wal');
    assert.equal(ledger.synchronousMode(), 2, 'SQLite FULL synchronous mode is required for power-loss durability');
    const run = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const inserted = ledger.upsertTemplate(run.id, {
      legacySlug: 'aromatherapy/example',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'example'),
      sourceHash: 'source-a',
      pageCount: 6,
      stage: 'repair_pending',
    }, 'test-v1');

    assert.equal(ledger.leaseTemplates({
      stages: ['repair_pending'],
      legacySlugs: ['aromatherapy/not-this-one'],
      claimedStage: 'repairing',
      owner: 'worker-1',
      limit: 8,
      runId: run.id,
    }).length, 0, 'an exact pilot selection never leases an unrelated template');

    const leases = ledger.leaseTemplates({
      stages: ['repair_pending'],
      legacySlugs: ['aromatherapy/example'],
      claimedStage: 'repairing',
      owner: 'worker-1',
      limit: 8,
      runId: run.id,
    });
    assert.equal(leases.length, 1);
    assert.equal(leases[0].id, inserted.id);
    assert.equal(leases[0].attempts, 1);
    assert.equal(ledger.leaseTemplates({
      stages: ['repairing'], claimedStage: 'repairing', owner: 'worker-2', limit: 1,
    }).length, 0);

    assert.equal(ledger.completeTemplateLease({
      templateId: inserted.id,
      leaseToken: leases[0].leaseToken,
      stage: 'render_pending',
      resultHash: 'result-a',
    }), true);
    assert.equal(ledger.getTemplate(inserted.id)?.attempts, 0, 'attempt count resets after a successful stage');
    const renderLease = ledger.leaseTemplates({
      stages: ['render_pending'],
      claimedStage: 'rendering',
      owner: 'renderer-1',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(renderLease);
    assert.equal(ledger.completeTemplateLease({
      templateId: inserted.id,
      leaseToken: renderLease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'result-a',
      qualityReceipt: 'receipt-a',
    }), true);

    const compositionLease = ledger.leaseTemplates({
      stages: ['verified', 'complete'],
      legacySlugs: [inserted.legacySlug],
      claimedStage: 'clustered',
      owner: 'composer-1',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(compositionLease, 'a completed pilot row can be re-leased for full-catalogue disposition reconciliation');
    assert.equal(ledger.completeTemplateLease({
      templateId: inserted.id,
      leaseToken: compositionLease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_alias',
      qualityReceipt: 'receipt-a',
    }), true);
    const canonicalLease = ledger.leaseTemplates({
      stages: ['verified', 'complete'],
      legacySlugs: [inserted.legacySlug],
      claimedStage: 'clustered',
      owner: 'composer-2',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(canonicalLease);
    assert.equal(ledger.completeTemplateLease({
      templateId: inserted.id,
      leaseToken: canonicalLease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      qualityReceipt: 'receipt-a',
    }), true);

    const pageId = ledger.upsertPage({
      templateId: inserted.id,
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source',
      resultHash: 'page-result',
      stage: 'verified',
      visibleTextLength: 100,
    });
    ledger.addIssue({
      templateId: inserted.id,
      pageId,
      runId: run.id,
      code: 'example_warning',
      severity: 'warning',
      message: 'Example',
    });
    ledger.upsertRender({
      templateId: inserted.id,
      pageId,
      runId: run.id,
      artifactHash: 'result-a',
      ruleVersion: 'test-v1',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'passed',
      thumbnailHash: 'a'.repeat(64),
      thumbnailBytes: 321,
      artifactPath: 'renders/thumbnails/example.webp',
    });
    ledger.upsertAlias({
      legacySlug: inserted.legacySlug,
      templateId: inserted.id,
      designId: 'design-a',
      contentPresetId: 'content-a',
      themePresetId: 'theme-a',
      qualityReceipt: 'receipt-a',
      status: 'passing',
    });
    ledger.addArtifact({
      runId: run.id,
      templateId: inserted.id,
      kind: 'content-preset',
      contentHash: 'artifact-a',
      relativePath: 'content/artifact-a.json',
      byteSize: 12,
      metadata: { safe: true },
    });
    ledger.finishRun(run.id, 'completed');

    const status = ledger.status();
    assert.equal(status.templatesByStage.complete, 1);
    assert.equal(status.templatesByDisposition.passing_design, 1);
    assert.equal(status.unresolvedIssuesBySeverity.warning, 1);
    assert.equal(status.renderCounts.passed, 1);
    assert.equal(ledger.reportData().totals.pages, 1);
    assert.equal(ledger.listTemplates({ stages: ['complete'], dispositions: ['passing_design'] })[0]?.legacySlug, inserted.legacySlug);
    assert.equal(ledger.getPage(pageId)?.role, 'home');
    assert.equal(ledger.listPages(inserted.id).length, 1);
    assert.equal(ledger.listRenders(inserted.id)[0]?.viewport, 'desktop');
    assert.equal(ledger.listRenders(inserted.id)[0]?.thumbnailHash, 'a'.repeat(64));
    assert.equal(ledger.listRenders(inserted.id)[0]?.thumbnailBytes, 321);
    assert.equal(ledger.listRenderHistory(inserted.id)[0]?.artifactHash, 'result-a');
    assert.equal(ledger.listAliases('passing')[0]?.designId, 'design-a');
    assert.equal(ledger.listIssues({ templateId: inserted.id, unresolved: true })[0]?.code, 'example_warning');
    assert.equal(ledger.resolveTemplateIssues(inserted.id), 1);
    assert.equal(ledger.resolveTemplateIssues(inserted.id), 0, 'bulk issue resolution is idempotent');
    assert.equal(ledger.listIssues({ templateId: inserted.id, unresolved: true }).length, 0);
    assert.deepEqual(ledger.listArtifacts({ kind: 'content-preset' })[0]?.metadata, { safe: true });
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('content-addressed artifacts retain immutable occurrence lineage across retries and runs', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-artifact-occurrences-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const firstRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(firstRun.id, {
      legacySlug: 'forensic-lineage',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'forensic-lineage'),
      sourceHash: 'source-a',
      stage: 'repair_pending',
    }, 'test-v1');
    const common = {
      templateId: template.id,
      kind: 'failed-primary-template',
      contentHash: 'tree-a',
      relativePath: 'artifacts/failed-primary/aromatherapy/forensic-lineage/tree-a',
      byteSize: 42,
    } as const;
    const firstAttempt = ledger.addArtifactOccurrence({
      ...common,
      runId: firstRun.id,
      occurrenceKey: 'repair-attempt:1',
      metadata: { run: 'first', attempt: 1 },
    });
    const retry = ledger.addArtifactOccurrence({
      ...common,
      runId: firstRun.id,
      occurrenceKey: 'repair-attempt:2',
      metadata: { run: 'first', attempt: 2 },
    });
    const secondRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const repeatedRun = ledger.addArtifactOccurrence({
      ...common,
      runId: secondRun.id,
      occurrenceKey: 'repair-attempt:1',
      metadata: { run: 'second', attempt: 1 },
    });
    const replay = ledger.addArtifactOccurrence({
      ...common,
      runId: secondRun.id,
      occurrenceKey: 'repair-attempt:1',
      metadata: { attempt: 1, run: 'second' },
    });
    assert.throws(() => ledger.addArtifactOccurrence({
      ...common,
      runId: secondRun.id,
      occurrenceKey: 'repair-attempt:1',
      metadata: { run: 'second', attempt: 99 },
    }), /replayed with conflicting metadata/);

    assert.equal(firstAttempt.artifactId, retry.artifactId);
    assert.equal(firstAttempt.artifactId, repeatedRun.artifactId);
    assert.notEqual(firstAttempt.occurrenceId, retry.occurrenceId);
    assert.notEqual(firstAttempt.occurrenceId, repeatedRun.occurrenceId);
    assert.equal(replay.occurrenceId, repeatedRun.occurrenceId, 'an exact attempt replay is idempotent');
    assert.equal(ledger.listArtifacts({ kind: common.kind }).length, 1, 'physical content stays deduplicated');
    const secondRunView = ledger.listArtifacts({ runId: secondRun.id, kind: common.kind });
    assert.equal(secondRunView.length, 1);
    assert.equal(secondRunView[0]?.runId, secondRun.id);
    assert.equal(secondRunView[0]?.templateId, template.id);
    assert.deepEqual(secondRunView[0]?.metadata, { run: 'second', attempt: 1 });
    assert.deepEqual(ledger.listArtifacts({ kind: common.kind })[0]?.metadata, {
      run: 'first',
      attempt: 1,
    }, 'physical artifact metadata is first-write immutable');

    const occurrences = ledger.listArtifactOccurrences({
      templateId: template.id,
      kind: common.kind,
    });
    assert.equal(occurrences.length, 3);
    assert.deepEqual(occurrences.map((occurrence) => ({
      runId: occurrence.runId,
      occurrenceKey: occurrence.occurrenceKey,
      metadata: occurrence.metadata,
    })), [
      { runId: firstRun.id, occurrenceKey: 'repair-attempt:1', metadata: { run: 'first', attempt: 1 } },
      { runId: firstRun.id, occurrenceKey: 'repair-attempt:2', metadata: { run: 'first', attempt: 2 } },
      { runId: secondRun.id, occurrenceKey: 'repair-attempt:1', metadata: { run: 'second', attempt: 1 } },
    ]);
    const totals = ledger.reportData().totals;
    assert.equal(totals.artifacts, 1);
    assert.equal(totals.artifactOccurrences, 3);
    assert.equal(totals.failedPrimaryArtifacts, 1);
    assert.equal(totals.failedPrimaryOccurrences, 3);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('schema v7 backfills the retained association from a v6 physical artifact row', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-artifact-occurrence-migration-'));
  const databasePath = join(scratch, 'ledger.sqlite');
  let ledger: LegacyLedger | undefined;
  try {
    ledger = new LegacyLedger({ databasePath });
    const run = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'migration-lineage',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'migration-lineage'),
      sourceHash: 'source-a',
      stage: 'repair_pending',
    }, 'test-v1');
    const artifactId = ledger.addArtifact({
      runId: run.id,
      templateId: template.id,
      kind: 'failed-primary-template',
      contentHash: 'tree-a',
      relativePath: 'artifacts/failed-primary/aromatherapy/migration-lineage/tree-a',
      byteSize: 42,
      metadata: { retained: true },
    });
    ledger.close();
    ledger = undefined;

    const downgrade = new DatabaseSync(databasePath);
    downgrade.exec('DROP TABLE artifact_occurrences; PRAGMA user_version = 6');
    downgrade.close();

    ledger = new LegacyLedger({ databasePath });
    const occurrences = ledger.listArtifactOccurrences({ artifactId });
    assert.equal(occurrences.length, 1);
    assert.equal(occurrences[0]?.runId, run.id);
    assert.equal(occurrences[0]?.templateId, template.id);
    assert.equal(occurrences[0]?.occurrenceKey, 'legacy');
    assert.deepEqual(occurrences[0]?.metadata, { retained: true });
    const scopedArtifact = ledger.listArtifacts({ runId: run.id, kind: 'failed-primary-template' })[0];
    assert.equal(scopedArtifact?.id, artifactId);
    assert.equal(scopedArtifact?.runId, run.id);
    assert.equal(scopedArtifact?.templateId, template.id);
    assert.deepEqual(scopedArtifact?.metadata, { retained: true });
  } finally {
    ledger?.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('a passing lease resolves source issues in the same transaction', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-atomic-issue-resolution-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const run = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'atomic-resolution',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'atomic-resolution'),
      sourceHash: 'source-a',
      stage: 'render_pending',
    }, 'test-v1');
    ledger.addIssue({
      templateId: template.id,
      runId: run.id,
      code: 'source_defect',
      severity: 'warning',
      message: 'Resolved by the verified artifact',
    });
    const lease = ledger.leaseTemplates({
      stages: ['render_pending'],
      claimedStage: 'rendering',
      owner: 'atomic-renderer',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: 'wrong-token',
      stage: 'verified',
      resolveIssues: true,
    }), false);
    assert.equal(ledger.listIssues({ templateId: template.id, unresolved: true }).length, 1);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: lease.leaseToken,
      stage: 'verified',
      qualityReceipt: 'receipt-a',
      resolveIssues: true,
    }), true);
    assert.equal(ledger.listIssues({ templateId: template.id, unresolved: true }).length, 0);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('current issue queries follow source, rule, and artifact while evidence recovery is resumable', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-current-issues-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const firstRun = ledger.createRun({
      command: 'run', ruleVersion: 'rule-v1', sourceRoot: join(scratch, 'source'), workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(firstRun.id, {
      legacySlug: 'evidence-recovery',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'evidence-recovery'),
      sourceHash: 'source-v1',
      stage: 'render_pending',
    }, 'rule-v1');
    const pageId = ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      sourceHash: 'page-v1',
      resultHash: 'page-result-v1',
      stage: 'static-passed',
    });
    const firstLease = ledger.leaseTemplates({
      stages: ['render_pending'], claimedStage: 'rendering', owner: 'renderer-v1', limit: 1, runId: firstRun.id,
    })[0]!;
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: firstLease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'artifact-v1',
      qualityReceipt: 'receipt-v1',
    }), true);
    ledger.upsertAlias({
      legacySlug: template.legacySlug,
      templateId: template.id,
      designId: 'design-v1',
      contentPresetId: 'content-v1',
      themePresetId: 'theme-v1',
      qualityReceipt: 'receipt-v1',
      status: 'passing',
    });
    ledger.addIssue({
      templateId: template.id,
      runId: firstRun.id,
      code: 'receipt_missing',
      severity: 'error',
      message: 'Final evidence disappeared',
    });
    ledger.addIssue({
      templateId: template.id,
      runId: firstRun.id,
      code: 'old_source_issue',
      severity: 'error',
      message: 'Superseded source issue',
      sourceHash: 'source-v0',
    });
    ledger.addIssue({
      templateId: template.id,
      runId: firstRun.id,
      code: 'old_rule_issue',
      severity: 'error',
      message: 'Superseded rule issue',
      ruleVersion: 'rule-v0',
    });
    ledger.addIssue({
      templateId: template.id,
      runId: firstRun.id,
      code: 'old_artifact_issue',
      severity: 'error',
      message: 'Superseded artifact issue',
      artifactHash: 'artifact-v0',
    });
    assert.equal(ledger.listIssues({ unresolved: true }).length, 4);
    assert.equal(ledger.listIssues({ unresolved: true, current: true }).length, 1);

    assert.equal(ledger.requeueTemplateAfterEvidenceFailure(
      template.id,
      'render_pending',
      'receipt missing',
      firstRun.id,
    ), true);
    const renderPending = ledger.getTemplate(template.id)!;
    assert.equal(renderPending.stage, 'render_pending');
    assert.equal(renderPending.resultHash, 'artifact-v1');
    assert.equal(renderPending.qualityReceipt, null);
    assert.equal(renderPending.terminalDisposition, null);
    assert.equal(ledger.listAliases()[0]?.status, 'rejected');
    assert.equal(ledger.getPage(pageId)?.stage, 'static-passed');

    const secondLease = ledger.leaseTemplates({
      stages: ['render_pending'], claimedStage: 'rendering', owner: 'renderer-v2', limit: 1, runId: firstRun.id,
    })[0]!;
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: secondLease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'artifact-v2',
      qualityReceipt: 'receipt-v2',
    }), true);
    assert.equal(ledger.listIssues({ unresolved: true }).length, 4, 'history remains retained');
    assert.equal(ledger.listIssues({ unresolved: true, current: true }).length, 0, 'old artifact issue is not current');
    assert.deepEqual(ledger.status().unresolvedIssuesBySeverity, {});

    assert.equal(ledger.requeueTemplateAfterEvidenceFailure(
      template.id,
      'repair_pending',
      'candidate bytes failed integrity',
      firstRun.id,
    ), true);
    const repairPending = ledger.getTemplate(template.id)!;
    assert.equal(repairPending.stage, 'repair_pending');
    assert.equal(repairPending.resultHash, null);
    assert.equal(ledger.getPage(pageId)?.stage, 'inventoried');
    assert.equal(ledger.getPage(pageId)?.resultHash, null);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('a poisoned render-preparation lease atomically returns only that template to repair', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-render-preparation-requeue-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const run = ledger.createRun({
      command: 'run', ruleVersion: 'rule-v1', sourceRoot: join(scratch, 'source'), workRoot: join(scratch, 'work'),
    });
    const poisoned = ledger.upsertTemplate(run.id, {
      legacySlug: 'poisoned-render-input',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'poisoned-render-input'),
      sourceHash: 'source-v1',
      pageCount: 1,
      stage: 'render_pending',
    }, 'rule-v1');
    const healthy = ledger.upsertTemplate(run.id, {
      legacySlug: 'healthy-render-input',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'healthy-render-input'),
      sourceHash: 'source-v1',
      pageCount: 1,
      stage: 'render_pending',
    }, 'rule-v1');
    const pageId = ledger.upsertPage({
      templateId: poisoned.id,
      relativePath: 'index.html',
      sourceHash: 'page-v1',
      resultHash: 'page-result-v1',
      stage: 'static-passed',
      visibleTextLength: 100,
    });
    ledger.upsertAlias({
      legacySlug: poisoned.legacySlug,
      templateId: poisoned.id,
      designId: 'design-v1',
      contentPresetId: 'content-v1',
      themePresetId: 'theme-v1',
      qualityReceipt: 'receipt-v1',
      status: 'passing',
    });
    const leases = ledger.leaseTemplates({
      stages: ['render_pending'], claimedStage: 'rendering', owner: 'renderer', limit: 2, runId: run.id,
    });
    const poisonedLease = leases.find((template) => template.id === poisoned.id)!;
    const healthyLease = leases.find((template) => template.id === healthy.id)!;
    assert.ok(poisonedLease);
    assert.ok(healthyLease);

    assert.equal(ledger.requeueLeasedTemplateForRepair({
      templateId: poisoned.id,
      leaseToken: poisonedLease.leaseToken,
      reason: 'Render preparation failed: candidate digest mismatch',
      runId: run.id,
      details: { priorArtifactHash: 'artifact-v1' },
    }), true);
    assert.equal(ledger.requeueLeasedTemplateForRepair({
      templateId: poisoned.id,
      leaseToken: poisonedLease.leaseToken,
      reason: 'stale duplicate',
      runId: run.id,
    }), false);

    const reset = ledger.getTemplate(poisoned.id)!;
    assert.equal(reset.stage, 'repair_pending');
    assert.equal(reset.resultHash, null);
    assert.equal(reset.qualityReceipt, null);
    assert.equal(reset.terminalDisposition, null);
    assert.equal(reset.leaseOwner, null);
    assert.equal(reset.attempts, 0);
    assert.equal(ledger.getPage(pageId)?.stage, 'superseded');
    assert.equal(ledger.getPage(pageId)?.resultHash, null);
    assert.equal(ledger.listAliases()[0]?.status, 'rejected');
    const currentIssues = ledger.listIssues({ unresolved: true, current: true });
    assert.equal(currentIssues.length, 1);
    assert.equal(currentIssues[0]?.code, 'render_preparation_failed');
    assert.match(currentIssues[0]?.message ?? '', /candidate digest mismatch/);

    const stillRendering = ledger.getTemplate(healthy.id)!;
    assert.equal(stillRendering.stage, 'rendering');
    assert.equal(stillRendering.leaseOwner, 'renderer');
    assert.equal(stillRendering.leaseExpiresAt !== null, true);
    assert.equal(ledger.completeTemplateLease({
      templateId: healthy.id,
      leaseToken: healthyLease.leaseToken,
      stage: 'verified',
    }), true);
    assert.ok(ledger.leaseTemplates({
      stages: ['repair_pending'], claimedStage: 'repairing', owner: 'repairer', limit: 1, runId: run.id,
    }).some((template) => template.id === poisoned.id));
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('render evidence history is retained while current queries follow artifact and rule version', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-render-history-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const firstRun = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(firstRun.id, {
      legacySlug: 'aromatherapy/history-example',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'history-example'),
      sourceHash: 'source-v1',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    const firstLease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'history-worker-v1',
      limit: 1,
      runId: firstRun.id,
    })[0];
    assert.ok(firstLease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: firstLease.leaseToken,
      stage: 'render_pending',
      resultHash: 'artifact-v1',
    }), true);
    const pageId = ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source',
      resultHash: 'page-v1',
      stage: 'static-passed',
    });
    ledger.upsertRender({
      templateId: template.id,
      pageId,
      runId: firstRun.id,
      artifactHash: 'artifact-v1',
      ruleVersion: 'rule-v1',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'passed',
    });

    const secondRun = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'rule-v2',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    ledger.upsertTemplate(secondRun.id, {
      legacySlug: template.legacySlug,
      niche: template.niche,
      sourcePath: template.sourcePath,
      sourceHash: 'source-v2',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v2');
    const secondLease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'history-worker-v2',
      limit: 1,
      runId: secondRun.id,
    })[0];
    assert.ok(secondLease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: secondLease.leaseToken,
      stage: 'render_pending',
      resultHash: 'artifact-v2',
    }), true);
    ledger.upsertRender({
      templateId: template.id,
      pageId,
      runId: firstRun.id,
      artifactHash: 'artifact-v2',
      ruleVersion: 'rule-v1',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'passed',
    });
    ledger.upsertRender({
      templateId: template.id,
      pageId,
      runId: secondRun.id,
      artifactHash: 'artifact-v2',
      ruleVersion: 'rule-v2',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'failed',
      error: 'current failure',
    });
    ledger.upsertRender({
      templateId: template.id,
      pageId,
      runId: secondRun.id,
      artifactHash: 'artifact-v2',
      ruleVersion: 'rule-v2',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'passed',
    });

    const history = ledger.listRenderHistory(template.id);
    assert.equal(history.length, 3);
    assert.deepEqual(new Set(history.map((render) => render.artifactHash)), new Set(['artifact-v1', 'artifact-v2']));
    const current = ledger.listRenders(template.id);
    assert.equal(current.length, 1);
    assert.equal(current[0]?.artifactHash, 'artifact-v2');
    assert.equal(current[0]?.ruleVersion, 'rule-v2');
    assert.equal(current[0]?.status, 'passed');
    assert.equal(current[0]?.attempts, 2, 'same artifact and rule upserts one current evidence row');
    assert.deepEqual(ledger.status().renderCounts, { passed: 1 });
    assert.equal(ledger.status().renderHistoryCount, 3);
    assert.equal(ledger.reportData().totals.renders, 1);
    assert.equal(ledger.reportData().totals.renderHistory, 3);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('inventory reconciliation preserves resume checkpoints and resets pages after source or rule changes', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-inventory-resume-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const firstRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(firstRun.id, {
      legacySlug: 'resume-checkpoint',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'resume-checkpoint'),
      sourceHash: 'tree-v1',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    const repairLease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'repair-v1',
      limit: 1,
      runId: firstRun.id,
    })[0];
    assert.ok(repairLease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: repairLease.leaseToken,
      stage: 'render_pending',
      resultHash: 'artifact-v1',
    }), true);
    const pageId = ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source-v1',
      resultHash: 'page-result-v1',
      stage: 'static-passed',
      visibleTextLength: 120,
    });
    ledger.upsertPage({
      templateId: template.id,
      relativePath: 'generated.html',
      role: 'other',
      sourceHash: 'generated',
      resultHash: 'generated-result-v1',
      stage: 'static-passed',
    });
    ledger.upsertRender({
      templateId: template.id,
      pageId,
      runId: firstRun.id,
      artifactHash: 'artifact-v1',
      ruleVersion: 'rule-v1',
      viewport: 'desktop',
      width: 1440,
      height: 900,
      status: 'passed',
    });

    ledger.reconcileInventoryPages(template.id, [{
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source-v1',
    }], false);
    const unchangedPages = new Map(ledger.listPages(template.id).map((page) => [page.relativePath, page]));
    assert.equal(unchangedPages.get('index.html')?.stage, 'static-passed');
    assert.equal(unchangedPages.get('index.html')?.resultHash, 'page-result-v1');
    assert.equal(unchangedPages.get('index.html')?.visibleTextLength, 120);
    assert.equal(unchangedPages.get('generated.html')?.stage, 'static-passed');
    assert.equal(ledger.listRenders(template.id).length, 1);

    const sourceChangeRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    ledger.upsertTemplate(sourceChangeRun.id, {
      legacySlug: template.legacySlug,
      niche: template.niche,
      sourcePath: template.sourcePath,
      sourceHash: 'tree-v2',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    ledger.reconcileInventoryPages(template.id, [{
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source-v2',
    }], true);
    const sourceChangedPages = new Map(ledger.listPages(template.id).map((page) => [page.relativePath, page]));
    assert.equal(sourceChangedPages.get('index.html')?.stage, 'inventoried');
    assert.equal(sourceChangedPages.get('index.html')?.resultHash, null);
    assert.equal(sourceChangedPages.get('index.html')?.visibleTextLength, null);
    assert.equal(sourceChangedPages.get('generated.html')?.stage, 'superseded');
    assert.equal(sourceChangedPages.get('generated.html')?.resultHash, null);
    assert.equal(ledger.listRenders(template.id).length, 0, 'old evidence is not current after the source reset');
    assert.equal(ledger.listRenderHistory(template.id).length, 1, 'resetting pages retains historical evidence');

    ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source-v2',
      resultHash: 'page-result-v2',
      stage: 'static-passed',
      visibleTextLength: 140,
    });
    const ruleChangeRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v2',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    ledger.upsertTemplate(ruleChangeRun.id, {
      legacySlug: template.legacySlug,
      niche: template.niche,
      sourcePath: template.sourcePath,
      sourceHash: 'tree-v2',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v2');
    ledger.reconcileInventoryPages(template.id, [{
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'page-source-v2',
    }], true);
    const ruleChangedPage = ledger.listPages(template.id).find((page) => page.relativePath === 'index.html');
    assert.equal(ruleChangedPage?.stage, 'inventoried');
    assert.equal(ruleChangedPage?.resultHash, null);
    assert.equal(ruleChangedPage?.visibleTextLength, null);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('moving an unchanged slug to another niche invalidates its artifact and receipt', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-inventory-niche-change-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const firstRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(firstRun.id, {
      legacySlug: 'moved-template',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'aromatherapy', 'moved-template'),
      sourceHash: 'same-tree',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'niche-test',
      limit: 1,
      runId: firstRun.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: lease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'old-artifact',
      qualityReceipt: 'receipt_old',
    }), true);
    ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'same-page',
      resultHash: 'old-page-artifact',
      stage: 'static-passed',
    });

    const secondRun = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const moved = ledger.upsertTemplate(secondRun.id, {
      legacySlug: template.legacySlug,
      niche: 'sound_bath',
      sourcePath: join(scratch, 'source', 'sound_bath', 'moved-template'),
      sourceHash: 'same-tree',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    assert.equal(moved.niche, 'sound_bath');
    assert.equal(moved.stage, 'repair_pending');
    assert.equal(moved.terminalDisposition, null);
    assert.equal(moved.resultHash, null);
    assert.equal(moved.qualityReceipt, null);
    ledger.reconcileInventoryPages(template.id, [{
      relativePath: 'index.html',
      role: 'home',
      sourceHash: 'same-page',
    }], true);
    assert.equal(ledger.listPages(template.id)[0]?.stage, 'inventoried');
    assert.equal(ledger.listPages(template.id)[0]?.resultHash, null);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('inventory reconciliation returns abandoned transient stages to resumable checkpoints', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-inventory-transient-resume-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const stoppedRun = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const nextRun = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const cases = [
      { slug: 'abandoned-repair', initial: 'repair_pending', claimed: 'repairing', expected: 'repair_pending' },
      { slug: 'abandoned-render', initial: 'render_pending', claimed: 'rendering', expected: 'render_pending' },
      { slug: 'abandoned-compose', initial: 'verified', claimed: 'clustered', expected: 'verified' },
    ] as const;

    for (const item of cases) {
      const template = ledger.upsertTemplate(stoppedRun.id, {
        legacySlug: item.slug,
        niche: 'aromatherapy',
        sourcePath: join(scratch, 'source', item.slug),
        sourceHash: `source-${item.slug}`,
        stage: item.initial,
      }, 'rule-v1');
      const lease = ledger.leaseTemplates({
        stages: [item.initial],
        claimedStage: item.claimed,
        owner: 'stopped-worker',
        limit: 1,
        leaseMs: 24 * 60 * 60_000,
        runId: stoppedRun.id,
      })[0];
      assert.ok(lease);
      assert.equal(lease.attempts, 1);

      const reconciled = ledger.upsertTemplate(nextRun.id, {
        legacySlug: item.slug,
        niche: 'aromatherapy',
        sourcePath: join(scratch, 'source', item.slug),
        sourceHash: `source-${item.slug}`,
        stage: 'repair_pending',
      }, 'rule-v1');
      assert.equal(reconciled.stage, item.expected);
      assert.equal(reconciled.attempts, 0, 'an abandoned process does not consume an attempt');
      assert.equal(reconciled.leaseOwner, null);
      assert.equal(reconciled.leaseExpiresAt, null);
      assert.equal(reconciled.lastRunId, nextRun.id);
    }

    // Also heals rows stranded by the pre-fix inventory behavior, where the
    // transient stage remained after its lease fields had already been cleared.
    ledger.upsertTemplate(stoppedRun.id, {
      legacySlug: 'already-stranded-render',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'already-stranded-render'),
      sourceHash: 'source-stranded',
      stage: 'rendering',
    }, 'rule-v1');
    const healed = ledger.upsertTemplate(nextRun.id, {
      legacySlug: 'already-stranded-render',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'already-stranded-render'),
      sourceHash: 'source-stranded',
      stage: 'repair_pending',
    }, 'rule-v1');
    assert.equal(healed.stage, 'render_pending');
    assert.equal(healed.leaseOwner, null);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('issue and transformation fingerprints make interrupted attempt replay idempotent', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-audit-idempotency-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const run = ledger.createRun({
      command: 'run',
      ruleVersion: 'rule-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'idempotent-template',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'idempotent-template'),
      sourceHash: 'source',
      pageCount: 1,
      stage: 'repair_pending',
    }, 'rule-v1');
    const pageId = ledger.upsertPage({
      templateId: template.id,
      relativePath: 'index.html',
      sourceHash: 'page-source',
    });

    const firstIssue = ledger.addIssue({
      templateId: template.id,
      pageId,
      runId: run.id,
      code: 'unsafe_claim',
      severity: 'warning',
      message: 'Removed unsupported proof',
      fingerprint: 'stable-issue-fingerprint',
      details: { selector: '.proof' },
    });
    const replayedIssue = ledger.addIssue({
      templateId: template.id,
      pageId,
      runId: run.id,
      code: 'unsafe_claim',
      severity: 'warning',
      message: 'Removed unsupported proof',
      fingerprint: 'stable-issue-fingerprint',
      details: { selector: '.proof' },
    });
    const firstTransformation = ledger.addTransformation({
      templateId: template.id,
      pageId,
      runId: run.id,
      ruleCode: 'remove_unsupported_proof',
      ruleVersion: 'rule-v1',
      beforeHash: 'before',
      afterHash: 'after',
      details: { selector: '.proof' },
    });
    const replayedTransformation = ledger.addTransformation({
      templateId: template.id,
      pageId,
      runId: run.id,
      ruleCode: 'remove_unsupported_proof',
      ruleVersion: 'rule-v1',
      beforeHash: 'before',
      afterHash: 'after',
      details: { selector: '.proof' },
    });

    assert.equal(replayedIssue, firstIssue);
    assert.equal(replayedTransformation, firstTransformation);
    assert.equal(ledger.reportData().totals.issues, 1);
    assert.equal(ledger.reportData().totals.transformations, 1);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('schema migrations retain v1 renders, deduplicate audit replays, and requeue unattested terminals', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-render-migration-'));
  const databasePath = join(scratch, 'ledger.sqlite');
  const raw = new DatabaseSync(databasePath);
  const timestamp = new Date().toISOString();
  try {
    raw.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE runs (
        id TEXT PRIMARY KEY, command TEXT NOT NULL, rule_version TEXT NOT NULL,
        source_root TEXT NOT NULL, work_root TEXT NOT NULL, state TEXT NOT NULL,
        resumed_from_run_id TEXT REFERENCES runs(id), options_json TEXT NOT NULL DEFAULT '{}',
        started_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT, error TEXT
      );
      CREATE TABLE templates (
        id INTEGER PRIMARY KEY, legacy_slug TEXT NOT NULL UNIQUE, niche TEXT NOT NULL,
        source_path TEXT NOT NULL UNIQUE, source_hash TEXT NOT NULL, foundation_id TEXT,
        page_count INTEGER NOT NULL DEFAULT 0, rule_version TEXT NOT NULL, stage TEXT NOT NULL,
        terminal_disposition TEXT, result_hash TEXT, quality_receipt TEXT,
        attempts INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_token TEXT,
        lease_expires_at TEXT, last_run_id TEXT REFERENCES runs(id), last_error TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE pages (
        id INTEGER PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        relative_path TEXT NOT NULL, role TEXT, source_hash TEXT NOT NULL, result_hash TEXT,
        stage TEXT NOT NULL DEFAULT 'discovered', visible_text_length INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(template_id, relative_path)
      );
      CREATE TABLE renders (
        id INTEGER PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE, run_id TEXT REFERENCES runs(id),
        viewport TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, status TEXT NOT NULL,
        screenshot_hash TEXT, perceptual_hash TEXT, ssim REAL, console_errors INTEGER NOT NULL DEFAULT 0,
        failed_requests INTEGER NOT NULL DEFAULT 0, axe_critical INTEGER NOT NULL DEFAULT 0,
        axe_serious INTEGER NOT NULL DEFAULT 0, horizontal_overflow_px REAL, artifact_path TEXT,
        error TEXT, attempts INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, UNIQUE(template_id, page_id, viewport)
      );
      CREATE TABLE issues (
        id INTEGER PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE, run_id TEXT REFERENCES runs(id),
        code TEXT NOT NULL, severity TEXT NOT NULL, message TEXT NOT NULL, fingerprint TEXT,
        details_json TEXT NOT NULL DEFAULT 'null', resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, resolved_at TEXT
      );
      CREATE TABLE transformations (
        id INTEGER PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE, run_id TEXT REFERENCES runs(id),
        rule_code TEXT NOT NULL, rule_version TEXT NOT NULL, before_hash TEXT, after_hash TEXT,
        details_json TEXT NOT NULL DEFAULT 'null', created_at TEXT NOT NULL
      );
      CREATE TABLE aliases (
        legacy_slug TEXT PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        cluster_id INTEGER,
        design_id TEXT NOT NULL,
        content_preset_id TEXT NOT NULL,
        theme_preset_id TEXT NOT NULL,
        quality_receipt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'candidate',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX renders_status_idx ON renders(status, viewport);
      PRAGMA user_version = 1;
    `);
    raw.prepare(`INSERT INTO runs
      (id, command, rule_version, source_root, work_root, state, options_json, started_at, updated_at)
      VALUES (?, 'pilot', 'rule-v1', ?, ?, 'completed', '{}', ?, ?)`)
      .run('run-v1', join(scratch, 'source'), join(scratch, 'work'), timestamp, timestamp);
    raw.prepare(`INSERT INTO templates
      (id, legacy_slug, niche, source_path, source_hash, page_count, rule_version, stage,
       terminal_disposition, result_hash, quality_receipt, attempts, last_run_id, created_at, updated_at)
      VALUES (1, 'legacy-template', 'aromatherapy', ?, 'source', 1, 'rule-v1',
       'complete', 'passing_design', 'artifact-current', 'receipt-old', 0, 'run-v1', ?, ?)`)
      .run(join(scratch, 'source', 'legacy-template'), timestamp, timestamp);
    raw.prepare(`INSERT INTO pages
      (id, template_id, relative_path, role, source_hash, result_hash, stage, created_at, updated_at)
      VALUES (1, 1, 'index.html', 'home', 'page-source', 'page-result', 'static-passed', ?, ?)`)
      .run(timestamp, timestamp);
    raw.prepare(`INSERT INTO renders
      (id, template_id, page_id, run_id, viewport, width, height, status, attempts, created_at, updated_at)
      VALUES (7, 1, 1, 'run-v1', 'desktop', 1440, 900, 'passed', 2, ?, ?)`)
      .run(timestamp, timestamp);
    raw.prepare(`INSERT INTO aliases
      (legacy_slug, template_id, design_id, content_preset_id, theme_preset_id,
       quality_receipt, status, created_at, updated_at)
      VALUES ('legacy-template', 1, 'design-old', 'content-old', 'theme-old',
       'receipt-old', 'passing', ?, ?)`)
      .run(timestamp, timestamp);
    for (const id of [1, 2]) {
      raw.prepare(`INSERT INTO issues
        (id, template_id, page_id, run_id, code, severity, message, fingerprint,
         details_json, resolved, created_at)
        VALUES (?, 1, 1, 'run-v1', 'duplicate_issue', 'warning', 'same issue',
         'same-fingerprint', '{"selector":".proof"}', 0, ?)`)
        .run(id, timestamp);
      raw.prepare(`INSERT INTO transformations
        (id, template_id, page_id, run_id, rule_code, rule_version, before_hash,
         after_hash, details_json, created_at)
        VALUES (?, 1, 1, 'run-v1', 'same_rule', 'rule-v1', 'before', 'after',
         '{"selector":".proof"}', ?)`)
        .run(id, timestamp);
    }
  } finally {
    raw.close();
  }

  const migrated = new LegacyLedger({ databasePath });
  try {
    assert.equal(migrated.listRenders(1).length, 0, 'unprovable v1 evidence must not count as current');
    const history = migrated.listRenderHistory(1);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.id, 7);
    assert.equal(history[0]?.artifactHash, 'legacy-unscoped:7');
    assert.equal(history[0]?.ruleVersion, 'rule-v1');
    assert.equal(history[0]?.attempts, 2);
    assert.equal(history[0]?.thumbnailHash, null);
    assert.equal(history[0]?.thumbnailBytes, null);
    assert.equal(migrated.listIssues().length, 1);
    assert.equal(migrated.getTemplate(1)?.stage, 'render_pending');
    assert.equal(migrated.getTemplate(1)?.qualityReceipt, null);
    assert.equal(migrated.listAliases('rejected')[0]?.legacySlug, 'legacy-template');
  } finally {
    migrated.close();
  }
  const versionCheck = new DatabaseSync(databasePath, { readOnly: true });
  try {
    assert.equal(Number((versionCheck.prepare('PRAGMA user_version').get() as { user_version: number }).user_version), LEGACY_SCHEMA_VERSION);
    const columns = versionCheck.prepare('PRAGMA table_info(transformations)').all() as Array<{ name: string }>;
    assert.ok(columns.some((column) => column.name === 'fingerprint'));
    const issueColumns = versionCheck.prepare('PRAGMA table_info(issues)').all() as Array<{ name: string }>;
    assert.ok(issueColumns.some((column) => column.name === 'source_hash'));
    assert.ok(issueColumns.some((column) => column.name === 'rule_version'));
    assert.ok(issueColumns.some((column) => column.name === 'artifact_hash'));
    const renderColumns = versionCheck.prepare('PRAGMA table_info(renders)').all() as Array<{ name: string }>;
    assert.ok(renderColumns.some((column) => column.name === 'thumbnail_hash'));
    assert.ok(renderColumns.some((column) => column.name === 'thumbnail_bytes'));
    const occurrenceColumns = versionCheck.prepare('PRAGMA table_info(artifact_occurrences)').all() as Array<{ name: string }>;
    assert.ok(occurrenceColumns.some((column) => column.name === 'artifact_id'));
    assert.ok(occurrenceColumns.some((column) => column.name === 'occurrence_key'));
    assert.equal(Number((versionCheck.prepare('SELECT COUNT(*) AS count FROM transformations').get() as { count: number }).count), 1);
  } finally {
    versionCheck.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('schema v6 invalidates terminal pre-customer-preview receipts and aliases', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-render-protocol-migration-'));
  const databasePath = join(scratch, 'ledger.sqlite');
  let ledger: LegacyLedger | undefined;
  try {
    ledger = new LegacyLedger({ databasePath });
    const template = ledger.upsertTemplate(null, {
      legacySlug: 'stale-preview-receipt',
      niche: 'aromatherapy',
      sourcePath: join(scratch, 'source', 'stale-preview-receipt'),
      sourceHash: 'source-hash',
      stage: 'complete',
      terminalDisposition: 'passing_design',
    }, DEFAULT_LEGACY_RULE_VERSION);
    const lease = ledger.leaseTemplates({
      stages: ['complete'],
      claimedStage: 'clustered',
      owner: 'protocol-migration-fixture',
      limit: 1,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: lease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'artifact-stale-v1',
      qualityReceipt: 'receipt-stale-v1',
    }), true);
    ledger.upsertAlias({
      legacySlug: template.legacySlug,
      templateId: template.id,
      designId: 'design-stale',
      contentPresetId: 'content-stale',
      themePresetId: 'theme-stale',
      qualityReceipt: 'receipt-stale-v1',
      status: 'passing',
    });
    ledger.close();
    ledger = undefined;

    const downgrade = new DatabaseSync(databasePath);
    downgrade.exec('PRAGMA user_version = 5');
    downgrade.close();

    ledger = new LegacyLedger({ databasePath });
    const migrated = ledger.getTemplate(template.id);
    assert.equal(migrated?.stage, 'render_pending');
    assert.equal(migrated?.terminalDisposition, null);
    assert.equal(migrated?.qualityReceipt, null);
    assert.equal(migrated?.attempts, 0);
    assert.match(migrated?.lastError ?? '', /evidence protocol v2.*customer-preview/i);
    assert.equal(ledger.listAliases('passing').length, 0);
    assert.equal(ledger.listAliases('rejected')[0]?.legacySlug, template.legacySlug);
  } finally {
    ledger?.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('model reservations enforce both caps and reconcile actual usage', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-budget-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite'), aiDollarCapUsd: 1, aiTokenCap: 100 });
  try {
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-a',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 40,
      estimatedOutputTokens: 20,
      estimatedCostUsd: 0.6,
    }), true);
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-a',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 40,
      estimatedOutputTokens: 20,
      estimatedCostUsd: 0.6,
    }), true, 'same request key is idempotent');
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-b',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 30,
      estimatedOutputTokens: 20,
      estimatedCostUsd: 0.5,
    }), false, 'aggregate reservation exceeds both caps');

    ledger.reconcileModelUsage({
      requestKey: 'fragment-a',
      model: 'gpt-5.6-terra',
      status: 'completed',
      actualInputTokens: 20,
      actualOutputTokens: 10,
      actualCostUsd: 0.25,
    });
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-b',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 30,
      estimatedOutputTokens: 20,
      estimatedCostUsd: 0.5,
    }), true);
    const budget = ledger.modelBudgetSnapshot();
    assert.equal(budget.accountedTokens, 80);
    assert.equal(budget.accountedCostUsd, 0.75);
    assert.equal(budget.tokensRemaining, 20);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('actual usage above a reservation saturates the hard cap idempotently', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-budget-overage-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite'), aiDollarCapUsd: 1, aiTokenCap: 100 });
  try {
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-overage',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 40,
      estimatedOutputTokens: 20,
      estimatedCostUsd: 0.6,
    }), true);
    const reconcile = () => ledger.reconcileModelUsage({
      requestKey: 'fragment-overage',
      model: 'gpt-5.6-terra',
      status: 'completed',
      actualInputTokens: 90,
      actualOutputTokens: 20,
      actualCostUsd: 0.7,
    });
    assert.deepEqual(reconcile(), { accepted: false, reason: 'token_ceiling' });
    assert.deepEqual(reconcile(), { accepted: false, reason: 'token_ceiling' });
    const budget = ledger.modelBudgetSnapshot();
    assert.equal(budget.actualTokens, 110, 'actual provider telemetry remains truthful');
    assert.equal(budget.accountedTokens, 100, 'authorization accounting never exceeds its cap');
    assert.equal(budget.tokensRemaining, 0);
    assert.equal(budget.exhausted, true);
    assert.equal(ledger.reserveModelUsage({
      requestKey: 'fragment-after-overage',
      model: 'gpt-5.6-terra',
      estimatedInputTokens: 1,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
    }), false, 'an overage cannot reopen apparent budget headroom');
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('an exclusive writer cancels orphaned runs but preserves the selected resume run', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-orphaned-runs-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const obsolete = ledger.createRun({
      command: 'pilot',
      ruleVersion: 'test-v0',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    const resumable = ledger.createRun({
      command: 'run',
      ruleVersion: 'test-v1',
      sourceRoot: join(scratch, 'source'),
      workRoot: join(scratch, 'work'),
    });
    assert.equal(ledger.cancelOrphanedRuns(resumable.id), 1);
    assert.equal(ledger.getRun(obsolete.id)?.state, 'cancelled');
    assert.match(ledger.getRun(obsolete.id)?.error ?? '', /process lock was no longer active/);
    assert.equal(ledger.getRun(resumable.id)?.state, 'running');
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('CLI injects stage services, records failure, and resumes the same run', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  const output: string[] = [];
  const errors: string[] = [];
  const runIds: string[] = [];

  try {
    const firstCode = await runLegacyCli([
      'run', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      io: { stdout: (message) => output.push(message), stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          runIds.push(context.runId);
          context.ledger.upsertTemplate(context.runId, {
            legacySlug: 'resume-example',
            niche: 'aromatherapy',
            sourcePath: join(sourceRoot, 'resume-example'),
            sourceHash: 'resume-source',
            pageCount: 1,
            stage: 'repair_pending',
          }, context.config.ruleVersion);
          assert.equal(context.ledger.leaseTemplates({
            stages: ['repair_pending'],
            claimedStage: 'repairing',
            owner: 'crashed-worker',
            limit: 1,
            leaseMs: 24 * 60 * 60_000,
            runId: context.runId,
          }).length, 1);
          throw new Error('planned interruption');
        },
      },
    });
    assert.equal(firstCode, 1);

    const secondCode = await runLegacyCli([
      'run', '--resume', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      io: { stdout: (message) => output.push(message), stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          runIds.push(context.runId);
          const recovered = context.ledger.getTemplateBySlug('resume-example');
          assert.equal(recovered?.stage, 'repair_pending');
          assert.equal(recovered?.leaseOwner, null);
          assert.equal(recovered?.leaseExpiresAt, null);
          assert.equal(recovered?.attempts, 0, 'a process interruption does not consume a template repair attempt');
          return { message: 'resumed' };
        },
      },
    });
    assert.equal(secondCode, 0);
    assert.equal(runIds.length, 2);
    assert.equal(runIds[0], runIds[1]);
    assert.ok(output.includes('resumed'));
    assert.ok(errors.includes('planned interruption'));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('CLI cancellation recovers leases, marks the run cancelled, removes its lock, and remains resumable', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-cancel-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const controller = new AbortController();
  const errors: string[] = [];
  let cancelledRunId = '';
  await mkdir(sourceRoot);

  try {
    const cancelledCode = await runLegacyCli([
      'run', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      signal: controller.signal,
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          cancelledRunId = context.runId;
          context.ledger.upsertTemplate(context.runId, {
            legacySlug: 'cancel-example',
            niche: 'aromatherapy',
            sourcePath: join(sourceRoot, 'cancel-example'),
            sourceHash: 'cancel-source',
            pageCount: 1,
            stage: 'repair_pending',
          }, context.config.ruleVersion);
          assert.equal(context.ledger.leaseTemplates({
            stages: ['repair_pending'],
            claimedStage: 'repairing',
            owner: 'cancelled-worker',
            limit: 1,
            runId: context.runId,
          }).length, 1);
          controller.abort(new LegacyCancellationError('Test cancellation requested.'));
          return { message: 'must not complete' };
        },
      },
    });
    assert.equal(cancelledCode, LEGACY_CANCEL_EXIT_CODE);
    assert.match(errors.at(-1) ?? '', /Recovered 1 in-progress template lease/);
    await assert.rejects(stat(join(workRoot, '.compiler.lock')), { code: 'ENOENT' });

    const ledger = new LegacyLedger({ databasePath: join(workRoot, 'ledger.sqlite') });
    try {
      assert.equal(ledger.getRun(cancelledRunId)?.state, 'cancelled');
      const template = ledger.getTemplateBySlug('cancel-example');
      assert.equal(template?.stage, 'repair_pending');
      assert.equal(template?.leaseOwner, null);
      assert.equal(template?.attempts, 0);
      assert.equal(ledger.findResumableRun('run', sourceRoot, DEFAULT_LEGACY_RULE_VERSION)?.id, cancelledRunId);
    } finally {
      ledger.close();
    }

    let resumedRunId = '';
    const resumedCode = await runLegacyCli([
      'run', '--resume', '--source', sourceRoot, '--work-root', workRoot,
    ], {
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: {
        run: async (context) => {
          resumedRunId = context.runId;
          return { message: 'resumed after cancellation' };
        },
      },
    });
    assert.equal(resumedCode, 0);
    assert.equal(resumedRunId, cancelledRunId);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('CLI requires a dry run for promotion', async () => {
  const errors: string[] = [];
  const code = await runLegacyCli(['promote'], {
    io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
  });
  assert.equal(code, 2);
  assert.match(errors[0], /safety-gated/);
});

test('CLI refuses an undersized pilot before creating a run', async () => {
  const errors: string[] = [];
  let invoked = false;
  const code = await runLegacyCli(['pilot', '--pilot-size', '1'], {
    io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
    services: { pilot: async () => { invoked = true; } },
  });
  assert.equal(code, 2);
  assert.equal(invoked, false);
  assert.match(errors[0] ?? '', /--pilot-size must be at least 100/);
});

test('CLI refuses a second writer while an active compiler lock exists', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-lock-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const errors: string[] = [];
  await mkdir(sourceRoot);
  await mkdir(workRoot);
  await writeFile(join(workRoot, '.compiler.lock'), JSON.stringify({
    version: 1,
    pid: process.pid,
    token: 'active-test-lock',
    startedAt: new Date().toISOString(),
  }));
  try {
    const code = await runLegacyCli(['inventory', '--source', sourceRoot, '--work-root', workRoot], {
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { inventory: async () => { throw new Error('second writer reached the pipeline'); } },
    });
    assert.equal(code, 1);
    assert.match(errors[0] ?? '', /Another legacy compiler is active/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('CLI never reclaims a fresh partially-written writer lock', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-cli-partial-lock-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const errors: string[] = [];
  await mkdir(sourceRoot);
  await mkdir(workRoot);
  await writeFile(join(workRoot, '.compiler.lock'), '{');
  try {
    const code = await runLegacyCli(['inventory', '--source', sourceRoot, '--work-root', workRoot], {
      io: { stdout: () => undefined, stderr: (message) => errors.push(message) },
      services: { inventory: async () => { throw new Error('partial lock was incorrectly reclaimed'); } },
    });
    assert.equal(code, 1);
    assert.match(errors[0] ?? '', /initializing its writer lock/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

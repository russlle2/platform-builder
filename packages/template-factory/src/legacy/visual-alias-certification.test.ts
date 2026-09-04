import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import type { RepairResult } from './contracts.js';
import type { DedupeCandidate, VisualAliasEvidence } from './dedupe.js';
import { LegacyLedger } from './ledger.js';
import {
  certifyVisualAliasCompositions,
  composeVisualAliasArtifactFiles,
  materializeArtifact,
  validatePromotionComposition,
  verifyStaticArtifact,
} from './pipeline.js';
import type { RenderEvidence } from './render.js';
import { renderTemplateTasks } from './render.js';
import type { LegacyCommandContext, LegacyTemplateRecord } from './types.js';

const PASSING_EVIDENCE: VisualAliasEvidence = {
  domSimilarity: 1,
  desktopSsim: 1,
  mobileSsim: 1,
  desktopPerceptualHashDistance: 0,
  mobilePerceptualHashDistance: 0,
  pages: [{
    page: 'index.html',
    desktopSsim: 1,
    mobileSsim: 1,
    desktopPerceptualHashDistance: 0,
    mobilePerceptualHashDistance: 0,
  }],
};

function repaired(slug: string, layout: 'grid' | 'flex', heading: string, color: string): RepairResult {
  const result = repairLegacyTemplate({
    slug,
    niche: 'wellness_coach',
    ruleVersion: 'visual-alias-test-v1',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1>${heading}</h1><p>A clear and practical introduction gives visitors enough useful information to understand the service and choose their next step with confidence. ${layout === 'grid' ? 'Thoughtful planning supports steady progress.' : 'Practical reflection supports meaningful progress.'}</p><a href="mailto:hello@example.com">Contact the studio</a><img src="assets/img/hero.svg" alt="Calm abstract landscape"></main></body></html>`],
      ['assets/css/styles.css', `body{color:${color};background:#fff;font-family:Arial,sans-serif}.unused-layout-hook{display:${layout}}`],
      ['assets/img/hero.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" fill="#dce8e2"/></svg>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: heading, EMAIL: 'hello@example.com' })],
    ]),
  });
  result.files.set('.dailyclarity/rehabilitation.json', `${JSON.stringify({
    version: 1,
    ruleVersion: 'visual-alias-test-v1',
    sourceHash: `source-${slug}`,
    repairMode: 'primary',
    sourcePreserved: true,
  }, null, 2)}\n`);
  assert.equal(
    verifyStaticArtifact(result.files, result.fields).passed,
    true,
    verifyStaticArtifact(result.files, result.fields).errors.map((error) => `${error.code}: ${error.detail}`).join('\n'),
  );
  return result;
}

function asCandidate(result: RepairResult): DedupeCandidate {
  return {
    fingerprint: result.fingerprint,
    catalogTemplate: result.catalogTemplate,
    design: result.design,
    contentPreset: result.contentPreset,
    themePreset: result.themePreset,
  };
}

async function setupPair(): Promise<{
  scratch: string;
  context: LegacyCommandContext;
  ledger: LegacyLedger;
  canonical: DedupeCandidate;
  candidate: DedupeCandidate;
  canonicalTemplate: LegacyTemplateRecord;
  template: LegacyTemplateRecord;
  originalAliasFiles: Map<string, string | Uint8Array>;
}> {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-visual-alias-cert-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({
    sourceRoot,
    workRoot,
    databasePath: 'ledger.sqlite',
    ruleVersion: 'visual-alias-test-v1',
    chromiumWorkers: 1,
  });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
  const context: LegacyCommandContext = {
    command: 'run',
    config,
    flags: { resume: true, dryRun: false, json: false },
    ledger,
    runId: run.id,
  };
  const canonicalRepair = repaired('visual-canonical', 'grid', 'North Star Coaching', '#223344');
  const candidateRepair = repaired('visual-candidate', 'flex', 'Open Trail Coaching', '#334455');
  canonicalRepair.files.set('assets/fonts/canonical-support.woff2', new Uint8Array([1, 3, 3, 7]));
  const canonical = asCandidate(canonicalRepair);
  const candidate = asCandidate(candidateRepair);
  assert.notEqual(canonical.fingerprint.exactDesignHash, candidate.fingerprint.exactDesignHash);
  assert.notEqual(canonical.contentPreset.id, candidate.contentPreset.id);
  assert.notEqual(canonical.themePreset.id, candidate.themePreset.id);

  const insert = async (result: RepairResult): Promise<LegacyTemplateRecord> => {
    const sourceHash = `source-${result.manifest.legacySlug}`;
    const record = ledger.upsertTemplate(run.id, {
      legacySlug: result.manifest.legacySlug,
      niche: result.manifest.niche,
      sourcePath: join(sourceRoot, result.manifest.legacySlug),
      sourceHash,
      pageCount: result.manifest.pages.length,
      stage: 'repair_pending',
    }, config.ruleVersion);
    const artifact = await materializeArtifact(context, record, result.files);
    for (const page of result.manifest.pages) {
      ledger.upsertPage({
        templateId: record.id,
        relativePath: page,
        role: result.manifest.pageRoles[page] ?? 'other',
        sourceHash: `page-source-${page}`,
        resultHash: result.files.has(page) ? result.qualityReceipt.artifactHash : undefined,
        stage: 'static-passed',
      });
    }
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      legacySlugs: [record.legacySlug],
      claimedStage: 'repairing',
      owner: `setup-${record.legacySlug}`,
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: record.id,
      leaseToken: lease.leaseToken,
      stage: 'verified',
      resultHash: artifact.treeHash,
      qualityReceipt: `receipt_initial_${record.legacySlug}`,
    }), true);
    return ledger.getTemplate(record.id)!;
  };

  const canonicalTemplate = await insert(canonicalRepair);
  const template = await insert(candidateRepair);
  return {
    scratch,
    context,
    ledger,
    canonical,
    candidate,
    canonicalTemplate,
    template,
    originalAliasFiles: new Map(candidateRepair.files),
  };
}

test('visual alias composition receives its own full render matrix, current receipt, and byte-exact promotion source', async () => {
  const fixture = await setupPair();
  try {
    const priorHash = fixture.template.resultHash;
    const priorStaticReceipt = JSON.parse(String(
      fixture.originalAliasFiles.get('.dailyclarity/quality-receipt.json'),
    ));
    const results = await certifyVisualAliasCompositions(fixture.context, [{
      canonical: fixture.canonical,
      candidate: fixture.candidate,
      canonicalTemplate: fixture.canonicalTemplate,
      template: fixture.template,
      evidence: PASSING_EVIDENCE,
    }]);
    assert.equal(results.length, 1);
    assert.equal(results[0]!.passed, true, results[0]!.issues.join('\n'));

    const current = fixture.ledger.getTemplate(fixture.template.id)!;
    assert.equal(current.stage, 'verified');
    assert.notEqual(current.resultHash, priorHash);
    assert.equal(current.resultHash, results[0]!.artifactHash);
    assert.equal(current.qualityReceipt, results[0]!.qualityReceipt);
    const renders = fixture.ledger.listRenders(current.id);
    assert.equal(renders.length, 2);
    assert.deepEqual(renders.map((render) => render.viewport).sort(), ['desktop', 'mobile']);
    assert.ok(renders.every((render) => render.status === 'passed' && render.artifactHash === current.resultHash));

    const artifact = fixture.ledger.listArtifacts({ templateId: current.id, kind: 'candidate-template' })
      .find((entry) => entry.contentHash === current.resultHash);
    assert.ok(artifact);
    const artifactRoot = resolve(fixture.context.config.workRoot, artifact.relativePath);
    const design = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'design.json'), 'utf8'));
    const content = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'content-preset.json'), 'utf8'));
    const theme = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'theme-preset.json'), 'utf8'));
    const localCatalog = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'catalog-v3.json'), 'utf8'));
    const localStaticReceipt = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'quality-receipt.json'), 'utf8'));
    const templateManifest = JSON.parse(await readFile(join(artifactRoot, 'template.json'), 'utf8'));
    const rehabilitation = JSON.parse(await readFile(join(artifactRoot, '.dailyclarity', 'rehabilitation.json'), 'utf8'));
    assert.equal(design.id, fixture.canonical.design.id);
    assert.equal(content.id, fixture.candidate.contentPreset.id);
    assert.equal(theme.id, fixture.candidate.themePreset.id);
    assert.equal(rehabilitation.visualAliasComposition.canonicalLegacySlug, fixture.canonicalTemplate.legacySlug);
    assert.equal(rehabilitation.visualAliasComposition.priorStaticReceiptId, priorStaticReceipt.id);
    assert.notEqual(localStaticReceipt.id, priorStaticReceipt.id);
    assert.equal(localStaticReceipt.scope, 'visual-alias-composition-static-preflight');
    assert.equal(localStaticReceipt.status, 'passed');
    assert.equal(localStaticReceipt.supersedes, priorStaticReceipt.id);
    assert.equal(localStaticReceipt.designId, fixture.canonical.design.id);
    assert.equal(localStaticReceipt.contentPresetId, fixture.candidate.contentPreset.id);
    assert.equal(localStaticReceipt.themePresetId, fixture.candidate.themePreset.id);
    assert.equal(localCatalog.qualityReceipt, localStaticReceipt.id);
    assert.equal(templateManifest.qualityReceipt, localStaticReceipt.id);
    assert.notEqual(current.qualityReceipt, localStaticReceipt.id, 'browser-final and local static receipts have separate scopes');
    assert.deepEqual(
      [...await readFile(join(artifactRoot, 'assets', 'fonts', 'canonical-support.woff2'))],
      [1, 3, 3, 7],
    );

    const receiptArtifact = fixture.ledger.listArtifacts({ templateId: current.id, kind: 'quality-receipt' })
      .find((entry) => `receipt_${entry.contentHash}` === current.qualityReceipt);
    assert.ok(receiptArtifact);
    const receipt = JSON.parse(await readFile(resolve(fixture.context.config.workRoot, receiptArtifact.relativePath), 'utf8'));
    assert.equal(receipt.artifactHash, current.resultHash);
    assert.equal(receipt.checks.desktop, 'passed');
    assert.equal(receipt.checks.mobile, 'passed');
    assert.equal(receipt.pages.length, 2);

    const mapping = {
      legacySlug: current.legacySlug,
      niche: current.niche,
      designId: fixture.canonical.design.id,
      contentPresetId: fixture.candidate.contentPreset.id,
      themePresetId: fixture.candidate.themePreset.id,
      qualityReceipt: current.qualityReceipt!,
      canonicalLegacySlug: fixture.canonicalTemplate.legacySlug,
      disposition: 'alias' as const,
    };
    await assert.doesNotReject(validatePromotionComposition(
      fixture.context,
      current,
      mapping,
      fixture.canonicalTemplate,
    ));

    const corrupted = composeVisualAliasArtifactFiles({
      canonical: fixture.canonical,
      candidate: fixture.candidate,
      sourceFiles: fixture.originalAliasFiles,
      sourceArtifactHash: priorHash!,
    }).files;
    const composedHtml = String(corrupted.get('index.html'));
    const corruptedHtml = composedHtml.replace('Practical reflection', 'Unreceipted mutation');
    assert.notEqual(corruptedHtml, composedHtml);
    corrupted.set('index.html', corruptedHtml);
    const corruptArtifact = await materializeArtifact(fixture.context, current, corrupted);
    const corruptionLease = fixture.ledger.leaseTemplates({
      stages: ['verified'],
      legacySlugs: [current.legacySlug],
      claimedStage: 'composed',
      owner: 'corruption-proof',
      limit: 1,
      runId: fixture.context.runId,
    })[0];
    assert.ok(corruptionLease);
    assert.equal(fixture.ledger.completeTemplateLease({
      templateId: current.id,
      leaseToken: corruptionLease.leaseToken,
      stage: 'verified',
      resultHash: corruptArtifact.treeHash,
    }), true);
    await assert.rejects(
      validatePromotionComposition(
        fixture.context,
        fixture.ledger.getTemplate(current.id)!,
        mapping,
        fixture.canonicalTemplate,
      ),
      /do not reproduce the browser-verified artifact/i,
    );
  } finally {
    fixture.ledger.close();
    await rm(fixture.scratch, { recursive: true, force: true });
  }
});

test('incomplete composed-alias browser evidence preserves the original passing artifact and receipt', async () => {
  const fixture = await setupPair();
  try {
    const priorHash = fixture.template.resultHash;
    const priorReceipt = fixture.template.qualityReceipt;
    const failingRender: typeof renderTemplateTasks = async (_root, tasks) => tasks.flatMap((task) => (
      ['desktop', 'mobile'] as const
    ).map((viewport): RenderEvidence => ({
      key: task.key,
      page: task.page,
      viewport,
      passed: viewport === 'desktop',
      attempts: 1,
      durationMs: 1,
      screenshotSha256: `screenshot-${viewport}`,
      perceptualHash: '0000000000000000',
      visibleTextLength: 100,
      editSlotCount: 3,
      imageSlotCount: 1,
      issues: viewport === 'desktop' ? [] : [{
        code: 'browser_failure',
        severity: 'critical',
        detail: 'simulated incomplete mobile QA',
      }],
    })));
    const results = await certifyVisualAliasCompositions(fixture.context, [{
      canonical: fixture.canonical,
      candidate: fixture.candidate,
      canonicalTemplate: fixture.canonicalTemplate,
      template: fixture.template,
      evidence: PASSING_EVIDENCE,
    }], failingRender);

    assert.equal(results[0]!.passed, false);
    assert.match(results[0]!.issues.join('\n'), /mobile:browser_failure/);
    const current = fixture.ledger.getTemplate(fixture.template.id)!;
    assert.equal(current.stage, 'verified');
    assert.equal(current.resultHash, priorHash);
    assert.equal(current.qualityReceipt, priorReceipt);
    assert.equal(fixture.ledger.listRenders(current.id).length, 0);
    assert.equal(
      fixture.ledger.listArtifacts({ templateId: current.id, kind: 'candidate-template' })
        .filter((artifact) => artifact.contentHash === current.resultHash).length,
      1,
    );
  } finally {
    fixture.ledger.close();
    await rm(fixture.scratch, { recursive: true, force: true });
  }
});

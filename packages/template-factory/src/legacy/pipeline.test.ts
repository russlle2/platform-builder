import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { AssetVendor } from './assets.js';
import { repairLegacyTemplate } from './compose.js';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { sha256, stableStringify } from './contracts.js';
import { LegacyLedger } from './ledger.js';
import {
  composeCatalogTemplateText,
  hasCompletePassingRenderMatrix,
  materializeArtifact,
  repairOne,
  validatePromotionSourceState,
  validatePilotGateAuthorization,
  verifyStaticArtifact,
  writePilotGate,
} from './pipeline.js';
import type { LegacyTemplateInventory } from './inventory.js';
import type { LegacyCommandContext } from './types.js';
import { LEGACY_PILOT_GATE_VERSION, LegacyCancellationError } from './types.js';

function artifactContext(
  config: ReturnType<typeof resolveLegacyConfig>,
  ledger: LegacyLedger,
  runId: string,
): LegacyCommandContext {
  return {
    command: 'run',
    config,
    flags: { resume: true, dryRun: false, json: false },
    ledger,
    runId,
  };
}

test('render completion requires one passing result per page and viewport', () => {
  const complete = [
    { page: 'index.html', viewport: 'desktop' as const, passed: true },
    { page: 'index.html', viewport: 'mobile' as const, passed: true },
    { page: 'about.html', viewport: 'desktop' as const, passed: true },
    { page: 'about.html', viewport: 'mobile' as const, passed: true },
  ];
  assert.equal(hasCompletePassingRenderMatrix(complete, ['index.html', 'about.html']), true);
  assert.equal(hasCompletePassingRenderMatrix([], []), false);
  assert.equal(hasCompletePassingRenderMatrix(complete.slice(0, 3), ['index.html', 'about.html']), false);
  assert.equal(hasCompletePassingRenderMatrix([
    complete[0]!,
    complete[0]!,
    complete[2]!,
    complete[3]!,
  ], ['index.html', 'about.html']), false);
  assert.equal(hasCompletePassingRenderMatrix([
    ...complete.slice(0, 3),
    { ...complete[3]!, passed: false },
  ], ['index.html', 'about.html']), false);
});

test('third-attempt cancellation retains its lease for resumable run recovery', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-repair-cancel-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', ruleVersion: 'test-v1' });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'cancel-on-third-attempt',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'missing-template'),
      sourceHash: 'source-hash',
      stage: 'repair_pending',
    }, config.ruleVersion);
    for (let attempt = 1; attempt < 3; attempt += 1) {
      const lease = ledger.leaseTemplates({
        stages: ['repair_pending'],
        claimedStage: 'repairing',
        owner: `cancel-test-${attempt}`,
        limit: 1,
        runId: run.id,
      })[0];
      assert.ok(lease);
      assert.equal(ledger.failTemplateLease(lease.id, lease.leaseToken, 'repair_pending', 'transient'), true);
    }
    const thirdLease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'cancel-test-3',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(thirdLease);
    assert.equal(thirdLease.attempts, 3);
    const cancellation = new AbortController();
    cancellation.abort(new LegacyCancellationError('operator cancelled'));
    const context = { ...artifactContext(config, ledger, run.id), signal: cancellation.signal };
    const result = await repairOne(context, thirdLease, new AssetVendor(join(workRoot, 'asset-cache')));
    assert.equal(result, 'cancelled');
    assert.equal(ledger.getTemplate(template.id)?.stage, 'repairing');
    assert.equal(ledger.getTemplate(template.id)?.attempts, 3);

    assert.equal(ledger.cancelRunAndRecoverLeases(run.id, 'operator cancelled'), 1);
    const recovered = ledger.getTemplate(template.id)!;
    assert.equal(recovered.stage, 'repair_pending');
    assert.equal(recovered.attempts, 2);
    assert.equal(ledger.getRun(run.id)?.state, 'cancelled');
    const resumedLease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'resumed-after-cancel',
      limit: 1,
      maxAttempts: 3,
      runId: run.id,
    })[0];
    assert.ok(resumedLease);
    assert.equal(resumedLease.attempts, 3);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('canonical design plus a legacy slug preset exactly materializes its deployable text', () => {
  const make = (slug: string, heading: string, color: string) => repairLegacyTemplate({
    slug,
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', `<!doctype html><html><head><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1>${heading}</h1><p>Book a conversation.</p><a href="mailto:hello@example.com">Email</a></main></body></html>`],
      ['assets/css/styles.css', `body{color:${color};font-family:Arial,sans-serif}`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: heading, EMAIL: 'hello@example.com' })],
    ]),
  });
  const canonical = make('canonical', 'North Star Coaching', '#223344');
  const alias = make('alias', 'Open Trail Coaching', '#334455');
  assert.equal(canonical.design.id, alias.design.id);

  const materialized = composeCatalogTemplateText(
    canonical.design,
    alias.contentPreset,
    alias.themePreset,
  );
  for (const [path, value] of materialized) {
    assert.equal(value, alias.files.get(path), path);
  }
});

test('deterministic repair emits an uploader-safe, ID-addressable static artifact', () => {
  const repaired = repairLegacyTemplate({
    slug: 'wellness-coach-sample',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="assets/css/styles.css"><script>alert('legacy')</script></head><body><header><nav><a href="index.html">Home</a></nav></header><main><h1>Bright Path Coaching</h1><section class="testimonials"><h2>Testimonials</h2><blockquote>Guaranteed results for 100% of clients</blockquote></section><p>Only $499 today.</p><a href="mailto:hello@example.com">Contact us</a></main></body></html>`],
      ['assets/css/styles.css', 'body{color:#224433;font-family:Arial,sans-serif}'],
      ['template.json', JSON.stringify({ name: 'Sample', pages: ['index.html'] })],
      ['fields.json', JSON.stringify({ placeholders: {
        BUSINESS_NAME: 'Bright Path Coaching',
        EMAIL: 'hello@example.com',
      } })],
    ]),
  });
  const result = verifyStaticArtifact(repaired.files, repaired.fields);
  assert.equal(result.passed, true, result.errors.map((error) => `${error.code}: ${error.detail}`).join('\n'));
  const html = String(repaired.files.get('index.html'));
  assert.match(html, /data-dc-edit-id=/);
  assert.match(html, /\{\{BUSINESS_NAME\}\}/);
  assert.match(html, /mailto:\{\{EMAIL\}\}/);
  assert.match(html, /Contact for current pricing/);
  assert.doesNotMatch(html, /Guaranteed results|Testimonials|\$499|alert\(/i);
});

test('static gate rejects content metadata that cannot exactly recompose nested media', () => {
  const repaired = repairLegacyTemplate({
    slug: 'composition-integrity',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Profile <img src="assets/profile.svg" alt="Practitioner portrait"></a></main></body></html>'],
      ['assets/profile.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const corrupted = new Map(repaired.files);
  const preset = JSON.parse(String(corrupted.get('.dailyclarity/content-preset.json'))) as { images: unknown[] };
  preset.images = [];
  corrupted.set('.dailyclarity/content-preset.json', `${JSON.stringify(preset, null, 2)}\n`);

  const result = verifyStaticArtifact(corrupted, repaired.fields);
  assert.equal(result.passed, false);
  assert.ok(result.errors.some((error) => error.code === 'content_composition_mismatch'));
});

test('static gate rejects unresolved local assets and duplicate stable IDs', () => {
  const html = '<!doctype html><html><body><main><h1 data-dc-edit-id="same">{{BUSINESS_NAME}}</h1><p data-dc-edit-id="same">Text</p><img src="missing.jpg" data-dc-image-id="hero"></main><script src="assets/js/dc-compat.js"></script><a href="mailto:{{EMAIL}}">Email</a></body></html>';
  const result = verifyStaticArtifact(
    new Map<string, string | Uint8Array>([
      ['index.html', html],
      ['assets/js/dc-compat.js', ''],
    ]),
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  );
  assert.equal(result.passed, false);
  assert.ok(result.errors.some((error) => error.code === 'duplicate_edit_ids'));
  assert.ok(result.errors.some((error) => error.code === 'missing_local_reference'));
});

test('static gate permits an inline SVG namespace but rejects remote image dependencies', () => {
  const safeHtml = '<!doctype html><html><body><main><h1 data-dc-edit-id="heading">{{BUSINESS_NAME}}</h1><p data-dc-edit-id="copy">Useful content for this template remains visible and editable.</p><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg></main><script src="assets/js/dc-compat.js"></script><a href="mailto:{{EMAIL}}">Email</a></body></html>';
  const safe = verifyStaticArtifact(
    new Map<string, string | Uint8Array>([['index.html', safeHtml], ['assets/js/dc-compat.js', '']]),
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  );
  assert.equal(safe.passed, true, safe.errors.map((error) => `${error.code}: ${error.detail}`).join('\n'));

  const unsafe = verifyStaticArtifact(
    new Map<string, string | Uint8Array>([
      ['index.html', safeHtml.replace('</main>', '<img srcset="https://images.example.test/a.jpg 1x"></main>')],
      ['assets/js/dc-compat.js', ''],
    ]),
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  );
  assert.equal(unsafe.passed, false);
  assert.ok(unsafe.errors.some((error) => error.code === 'remote_dependency'));

  const unnamedForm = verifyStaticArtifact(
    new Map<string, string | Uint8Array>([
      ['index.html', safeHtml.replace('</main>', '<form id="external-form" data-dc-standard-form="safe"></form><label>Message <textarea form="external-form" required></textarea></label></main>')],
      ['assets/js/dc-compat.js', ''],
    ]),
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  );
  assert.equal(unnamedForm.passed, false);
  assert.ok(unnamedForm.errors.some((error) => error.code === 'unnamed_form_controls'));
});

test('static gate resolves entity-quoted inline CSS URLs without hiding remote imports', () => {
  const base = '<!doctype html><html><body style="background-image:url(&quot;assets/img/pattern.svg&quot;)"><main><h1 data-dc-edit-id="heading">{{BUSINESS_NAME}}</h1><p data-dc-edit-id="copy">Editable copy.</p></main><script src="assets/js/dc-compat.js"></script><a href="mailto:{{EMAIL}}">Email</a></body></html>';
  const files = new Map<string, string | Uint8Array>([
    ['index.html', base],
    ['assets/img/pattern.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ['assets/js/dc-compat.js', ''],
  ]);
  const safe = verifyStaticArtifact(files, [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]);
  assert.equal(safe.passed, true, safe.errors.map((error) => `${error.code}: ${error.detail}`).join('\n'));

  files.set('assets/css/unsafe.css', '@import "https://example.test/remote.css";');
  const unsafe = verifyStaticArtifact(files, [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]);
  assert.equal(unsafe.passed, false);
  assert.ok(unsafe.errors.some((error) => error.code === 'remote_dependency'));
});

test('static gate ignores inert CSS comments and nested data-SVG paint URLs', () => {
  const html = '<!doctype html><html><head><style>/* data URL (also intended as assets/img/not-a-reference.svg) */ .hero{background:url("data:image/svg+xml,%3Csvg%3E%3Cpath fill=%27url(%23paint)%27/%3E%3C/svg%3E")}</style></head><body><main><h1 data-dc-edit-id="heading">{{BUSINESS_NAME}}</h1><p data-dc-edit-id="copy">Editable copy.</p></main><script src="assets/js/dc-compat.js"></script><a href="mailto:{{EMAIL}}">Email</a></body></html>';
  const result = verifyStaticArtifact(
    new Map<string, string | Uint8Array>([['index.html', html], ['assets/js/dc-compat.js', '']]),
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  );
  assert.equal(result.passed, true, result.errors.map((error) => `${error.code}: ${error.detail}`).join('\n'));
});

test('repair preserves valid fragments, neutralizes missing fragments, and the static gate verifies both pages', () => {
  const repaired = repairLegacyTemplate({
    slug: 'fragment-links',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><body><main><h1>Studio</h1><a href="#missing">Missing section</a><a href="about.html#bio">Read the bio</a></main></body></html>'],
      ['about.html', '<!doctype html><html><body><main><h1 id="bio">About the studio</h1><a href="index.html">Home</a></main></body></html>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(repaired.files.get('index.html'));
  assert.match(html, /href="#"[^>]*>Missing section/);
  assert.match(html, /href="about\.html#bio"/);
  const verified = verifyStaticArtifact(repaired.files, repaired.fields);
  assert.equal(verified.passed, true, verified.errors.map((error) => `${error.code}: ${error.detail}`).join('\n'));

  const corrupted = new Map(repaired.files);
  corrupted.set('index.html', html.replace('about.html#bio', 'about.html#absent'));
  assert.ok(verifyStaticArtifact(corrupted, repaired.fields).errors
    .some((error) => error.code === 'missing_fragment_reference'));
});

test('artifact reuse validates content and repairs ledger registration after a crash boundary', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-artifact-resume-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const files = new Map<string, string | Uint8Array>([
    ['index.html', '<!doctype html><html><body><main>Safe candidate</main></body></html>'],
    ['assets/site.css', 'body{color:#123456}'],
  ]);
  let firstLedger: LegacyLedger | undefined;
  let secondLedger: LegacyLedger | undefined;
  try {
    const firstConfig = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'first.sqlite', ruleVersion: 'test-v1' });
    await ensureWorkLayout(firstConfig);
    firstLedger = new LegacyLedger({ databasePath: firstConfig.databasePath });
    const firstRun = firstLedger.createRun({
      command: 'run', ruleVersion: firstConfig.ruleVersion, sourceRoot, workRoot,
    });
    const firstTemplate = firstLedger.upsertTemplate(firstRun.id, {
      legacySlug: 'artifact-resume',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'artifact-resume'),
      sourceHash: 'source-hash',
      stage: 'repair_pending',
    }, firstConfig.ruleVersion);
    const first = await materializeArtifact(artifactContext(firstConfig, firstLedger, firstRun.id), firstTemplate, files);
    assert.equal(firstLedger.listArtifacts({ templateId: firstTemplate.id, kind: 'candidate-template' }).length, 1);
    firstLedger.close();
    firstLedger = undefined;

    const currentPath = join(workRoot, 'artifacts', 'candidates', 'aromatherapy', 'artifact-resume', 'current.json');
    await unlink(currentPath);
    const secondConfig = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'second.sqlite', ruleVersion: 'test-v1' });
    secondLedger = new LegacyLedger({ databasePath: secondConfig.databasePath });
    const secondRun = secondLedger.createRun({
      command: 'run', ruleVersion: secondConfig.ruleVersion, sourceRoot, workRoot,
    });
    const secondTemplate = secondLedger.upsertTemplate(secondRun.id, {
      legacySlug: 'artifact-resume',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'artifact-resume'),
      sourceHash: 'source-hash',
      stage: 'repair_pending',
    }, secondConfig.ruleVersion);
    const reused = await materializeArtifact(artifactContext(secondConfig, secondLedger, secondRun.id), secondTemplate, files);
    assert.equal(reused.treeHash, first.treeHash);
    assert.equal(secondLedger.listArtifacts({ templateId: secondTemplate.id, kind: 'candidate-template' }).length, 1);
    assert.equal(JSON.parse(await readFile(currentPath, 'utf8')).treeHash, first.treeHash);

    const candidatePage = join(reused.directory, 'index.html');
    const original = await readFile(candidatePage, 'utf8');
    await writeFile(candidatePage, original.replace('Safe', 'Evil'));
    await assert.rejects(
      materializeArtifact(artifactContext(secondConfig, secondLedger, secondRun.id), secondTemplate, files),
      /digest mismatch: index\.html/,
    );
  } finally {
    firstLedger?.close();
    secondLedger?.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('a resumed pilot still fails when an earlier verified template used a neutral fallback', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-pilot-fallback-resume-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', ruleVersion: 'test-v1' });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'pilot', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'fallback-resume',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'fallback-resume'),
      sourceHash: 'source-hash',
      stage: 'repair_pending',
    }, config.ruleVersion);
    const files = new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><body><main>Neutral fallback</main></body></html>'],
      ['.dailyclarity/rehabilitation.json', `${JSON.stringify({
        version: 1,
        ruleVersion: config.ruleVersion,
        sourceHash: 'source-hash',
        repairMode: 'neutral_fallback',
        renderRemediation: null,
        sourcePreserved: true,
      }, null, 2)}\n`],
    ]);
    const artifact = await materializeArtifact(artifactContext(config, ledger, run.id), template, files);
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'prior-pilot-worker',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: lease.leaseToken,
      stage: 'verified',
      resultHash: artifact.treeHash,
      qualityReceipt: 'receipt_prior',
    }), true);
    const selected: LegacyTemplateInventory[] = [{
      key: 'aromatherapy/fallback-resume',
      niche: 'aromatherapy',
      slug: 'fallback-resume',
      sourceDir: join(sourceRoot, 'fallback-resume'),
      sourceTreeHash: 'source-hash',
      sourceBytes: 0,
      files: [],
      pages: [],
      declaredPages: [],
      rawManifest: {},
      rawFields: {},
      issues: [],
    }];
    const gate = await writePilotGate(
      artifactContext(config, ledger, run.id),
      selected,
      'catalog-hash',
      { requested: 1, repaired: 0, staticFailed: 0, neutralFallbacks: 0, skipped: 1 },
      {
        templates: 0,
        passedTemplates: 0,
        failedTemplates: 0,
        renders: 0,
        criticalDefects: 0,
        seriousDefects: 0,
        neutralFallbacks: 0,
      },
      {
        contractVersion: 3,
        ruleVersion: config.ruleVersion,
        generatedAt: new Date().toISOString(),
        sourceTemplates: 1,
        canonicalDesigns: 1,
        templates: [],
        gallery: {},
      },
    );
    const payload = JSON.parse(await readFile(gate.path, 'utf8')) as {
      passed: boolean;
      fallbackSlugs: string[];
      selected: Array<{ cohort: string }>;
      gates: { primaryRepairPreserved: boolean };
    };
    assert.equal(gate.passed, false);
    assert.equal(payload.passed, false);
    assert.deepEqual(payload.fallbackSlugs, ['fallback-resume']);
    assert.equal(payload.selected[0]?.cohort, 'aromatherapy:legacy-undated');
    assert.equal(payload.gates.primaryRepairPreserved, false);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('pilot evidence rehashes candidate files and the final receipt instead of trusting ledger labels', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-pilot-integrity-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', ruleVersion: 'test-v1' });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'pilot', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'tampered-pilot',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'tampered-pilot'),
      sourceHash: 'source-hash',
      stage: 'repair_pending',
    }, config.ruleVersion);
    const artifact = await materializeArtifact(artifactContext(config, ledger, run.id), template, new Map([
      ['index.html', '<!doctype html><html><body><main><h1>Safe candidate</h1></main></body></html>'],
      ['.dailyclarity/rehabilitation.json', `${JSON.stringify({
        version: 1,
        ruleVersion: config.ruleVersion,
        sourceHash: 'source-hash',
        repairMode: 'deterministic',
        renderRemediation: null,
        sourcePreserved: true,
      }, null, 2)}\n`],
    ]));
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'pilot-worker',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: template.id,
      leaseToken: lease.leaseToken,
      stage: 'verified',
      resultHash: artifact.treeHash,
      qualityReceipt: 'receipt_deadbeef',
    }), true);

    const receiptPath = join(config.artifactRoot, 'receipts', 'aromatherapy', 'tampered-pilot', 'receipt_deadbeef.json');
    await mkdir(join(config.artifactRoot, 'receipts', 'aromatherapy', 'tampered-pilot'), { recursive: true });
    await writeFile(receiptPath, `${JSON.stringify({
      id: 'receipt_deadbeef',
      version: 1,
      legacySlug: 'tampered-pilot',
      niche: 'aromatherapy',
      sourceHash: 'source-hash',
      artifactHash: artifact.treeHash,
      ruleVersion: config.ruleVersion,
      repairMode: 'deterministic',
      renderRemediation: null,
      sourcePreserved: true,
      generatedAt: new Date().toISOString(),
      checks: { static: 'passed', desktop: 'passed', mobile: 'passed', criticalDefects: 0, seriousDefects: 0 },
      pages: [],
      tampered: true,
    }, null, 2)}\n`);
    ledger.addArtifact({
      runId: run.id,
      templateId: template.id,
      kind: 'quality-receipt',
      contentHash: 'deadbeef',
      relativePath: relative(config.workRoot, receiptPath),
      byteSize: (await readFile(receiptPath)).byteLength,
    });
    await writeFile(join(artifact.directory, 'index.html'), '<!doctype html><html><body>tampered after rendering</body></html>');

    const selected: LegacyTemplateInventory[] = [{
      key: 'aromatherapy/tampered-pilot',
      niche: 'aromatherapy',
      slug: 'tampered-pilot',
      sourceDir: join(sourceRoot, 'tampered-pilot'),
      sourceTreeHash: 'source-hash',
      sourceBytes: 0,
      files: [],
      pages: [],
      declaredPages: [],
      rawManifest: {},
      rawFields: {},
      issues: [],
    }];
    const gate = await writePilotGate(
      artifactContext(config, ledger, run.id),
      selected,
      'catalog-hash',
      { requested: 1, repaired: 0, staticFailed: 0, neutralFallbacks: 0, skipped: 1 },
      {
        templates: 0,
        passedTemplates: 0,
        failedTemplates: 0,
        renders: 0,
        criticalDefects: 0,
        seriousDefects: 0,
        neutralFallbacks: 0,
      },
      {
        contractVersion: 3,
        ruleVersion: config.ruleVersion,
        generatedAt: new Date().toISOString(),
        sourceTemplates: 1,
        canonicalDesigns: 1,
        templates: [{
          legacySlug: 'tampered-pilot',
          canonicalLegacySlug: 'tampered-pilot',
          designId: 'design_test',
          contentPresetId: 'content_test',
          themePresetId: 'theme_test',
          niche: 'aromatherapy',
          qualityReceipt: 'receipt_deadbeef',
          disposition: 'canonical',
        }],
        gallery: { aromatherapy: ['design_test'] },
      },
    );
    const payload = JSON.parse(await readFile(gate.path, 'utf8')) as { evidenceIssues: string[] };
    assert.equal(gate.passed, false);
    assert.ok(payload.evidenceIssues.some((issue) => /candidate artifact failed integrity validation.*digest mismatch: index\.html/i.test(issue)));
    assert.ok(payload.evidenceIssues.some((issue) => /final quality receipt does not attest the current passing artifact/i.test(issue)));
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('pilot gate rejects a stranded render, zero evidence, and partial catalogue coverage', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-pilot-incomplete-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', ruleVersion: 'test-v1' });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'pilot', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const selected: LegacyTemplateInventory[] = Array.from({ length: 100 }, (_, index) => {
      const slug = `pilot-${String(index).padStart(3, '0')}`;
      return {
        key: `aromatherapy/${slug}`,
        niche: 'aromatherapy',
        slug,
        sourceDir: join(sourceRoot, slug),
        sourceTreeHash: `source-${slug}`,
        sourceBytes: 0,
        files: [],
        pages: [],
        declaredPages: [],
        rawManifest: {},
        rawFields: {},
        issues: [],
      };
    });
    ledger.upsertTemplate(run.id, {
      legacySlug: selected[0]!.slug,
      niche: selected[0]!.niche,
      sourcePath: selected[0]!.sourceDir,
      sourceHash: selected[0]!.sourceTreeHash,
      stage: 'rendering',
    }, config.ruleVersion);
    const coverageOnly: LegacyTemplateInventory = {
      ...selected[0]!,
      key: 'sound_bath/pilot-coverage-only',
      niche: 'sound_bath',
      slug: 'pilot-coverage-only',
      sourceDir: join(sourceRoot, 'pilot-coverage-only'),
      sourceTreeHash: 'source-pilot-coverage-only',
      pages: [{
        name: 'booking.html',
        role: 'booking',
        bytes: 1,
        sha256: 'booking-source',
        tokens: [],
        remoteUrls: [],
      }],
    };

    const gate = await writePilotGate(
      artifactContext(config, ledger, run.id),
      selected,
      'catalog-hash',
      { requested: 100, repaired: 0, staticFailed: 0, neutralFallbacks: 0, skipped: 100 },
      {
        templates: 0,
        passedTemplates: 0,
        failedTemplates: 0,
        renders: 0,
        criticalDefects: 0,
        seriousDefects: 0,
        neutralFallbacks: 0,
      },
      {
        contractVersion: 3,
        ruleVersion: config.ruleVersion,
        generatedAt: new Date().toISOString(),
        sourceTemplates: 0,
        canonicalDesigns: 0,
        templates: [],
        gallery: {},
      },
      [...selected, coverageOnly],
    );
    const payload = JSON.parse(await readFile(gate.path, 'utf8')) as {
      version: number;
      passed: boolean;
      evidenceIssues: string[];
      coverage: { missing: string[] };
      gates: {
        minimumPilotSizeMet: boolean;
        exactCatalogCoverage: boolean;
        everyObservedDimensionCovered: boolean;
        currentEvidenceComplete: boolean;
      };
    };
    assert.equal(gate.passed, false);
    assert.equal(payload.version, LEGACY_PILOT_GATE_VERSION);
    assert.equal(payload.gates.minimumPilotSizeMet, true);
    assert.equal(payload.gates.exactCatalogCoverage, false);
    assert.equal(payload.gates.everyObservedDimensionCovered, false);
    assert.equal(payload.gates.currentEvidenceComplete, false);
    assert.ok(payload.coverage.missing.some((item) => item === 'niches:sound_bath'));
    assert.ok(payload.coverage.missing.some((item) => item === 'topologies:booking'));
    assert.ok(payload.evidenceIssues.some((issue) => /pilot catalogue accounts for 0\/100/i.test(issue)));
    assert.ok(payload.evidenceIssues.some((issue) => /pilot-000: stage is rendering/i.test(issue)));
    assert.ok(payload.evidenceIssues.some((issue) => /pilot-000\/.*missing current render evidence|pilot-000: no current static-passed pages/i.test(issue)));
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('full-run authorization rejects legacy pilot gate schemas', () => {
  assert.throws(
    () => validatePilotGateAuthorization({
      version: LEGACY_PILOT_GATE_VERSION - 1,
      passed: true,
      ruleVersion: 'test-v1',
      catalogHash: 'catalog-hash',
    }, 'test-v1'),
    new RegExp(`gate schema is stale.*v${LEGACY_PILOT_GATE_VERSION}`, 'i'),
  );
});

test('full-run authorization requires complete, internally consistent dimension coverage', () => {
  const slugs = Array.from({ length: 100 }, (_, index) => `pilot-${String(index).padStart(3, '0')}`);
  const coverage = {
    niches: ['aromatherapy'],
    foundations: ['aromatherapy:layout-family-calm'],
    cohorts: ['foundation:calm'],
    topologies: ['home'],
    issueCodes: ['unsafe-url'],
  };
  const gate = {
    version: LEGACY_PILOT_GATE_VERSION,
    passed: true,
    ruleVersion: 'test-v1',
    catalogHash: 'catalog-hash',
    selected: slugs.map((legacySlug) => ({ legacySlug })),
    selectedCount: slugs.length,
    uniqueSelectedCount: slugs.length,
    selectionHash: sha256(stableStringify(slugs)),
    catalogSourceTemplates: slugs.length,
    coverage: {
      universe: coverage,
      selected: coverage,
      missing: [],
      universeHash: sha256(stableStringify(coverage)),
    },
    gates: {
      noCriticalDefects: true,
      deterministicFailureRateBelowTwoPercent: true,
      minimumPilotSizeMet: true,
      uniqueSelection: true,
      exactCatalogCoverage: true,
      everyObservedDimensionCovered: true,
      currentEvidenceComplete: true,
      everyPilotTemplatePassed: true,
      primaryRepairPreserved: true,
    },
  };
  assert.equal(validatePilotGateAuthorization(gate, 'test-v1').coverageUniverseHash, gate.coverage.universeHash);
  assert.throws(
    () => validatePilotGateAuthorization({
      ...gate,
      coverage: { ...gate.coverage, selected: { ...coverage, topologies: [] } },
    }, 'test-v1'),
    /selected coverage is incomplete/i,
  );
  assert.throws(
    () => validatePilotGateAuthorization({
      ...gate,
      coverage: { ...gate.coverage, missing: ['topologies:booking'] },
    }, 'test-v1'),
    /does not cover every observed catalogue dimension/i,
  );
});

test('promotion requires current source hashes, niche identity, receipts, and repair rule', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-promotion-source-state-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot, { recursive: true });
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', ruleVersion: 'test-v1' });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'promote', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const inserted = ledger.upsertTemplate(run.id, {
      legacySlug: 'promotion-shape',
      niche: 'aromatherapy',
      sourcePath: join(sourceRoot, 'promotion-shape'),
      sourceHash: 'source-v1',
      stage: 'repair_pending',
    }, config.ruleVersion);
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'promotion-test',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    assert.equal(ledger.completeTemplateLease({
      templateId: inserted.id,
      leaseToken: lease.leaseToken,
      stage: 'complete',
      terminalDisposition: 'passing_design',
      resultHash: 'artifact-v1',
      qualityReceipt: 'receipt_v1',
    }), true);
    const template = ledger.getTemplate(inserted.id)!;
    const source: LegacyTemplateInventory = {
      key: 'aromatherapy/promotion-shape',
      niche: 'aromatherapy',
      slug: 'promotion-shape',
      sourceDir: join(sourceRoot, 'promotion-shape'),
      sourceTreeHash: 'source-v1',
      sourceBytes: 0,
      files: [],
      pages: [],
      declaredPages: [],
      rawManifest: {},
      rawFields: {},
      issues: [],
    };
    const catalog = {
      contractVersion: 3 as const,
      ruleVersion: config.ruleVersion,
      generatedAt: new Date().toISOString(),
      sourceTemplates: 1,
      canonicalDesigns: 1,
      templates: [{
        legacySlug: source.slug,
        canonicalLegacySlug: source.slug,
        designId: 'design_v1',
        contentPresetId: 'content_v1',
        themePresetId: 'theme_v1',
        niche: source.niche,
        qualityReceipt: 'receipt_v1',
        disposition: 'canonical' as const,
      }],
      gallery: { aromatherapy: [source.slug] },
    };
    ledger.upsertAlias({
      legacySlug: source.slug,
      templateId: template.id,
      designId: 'design_v1',
      contentPresetId: 'content_v1',
      themePresetId: 'theme_v1',
      qualityReceipt: 'receipt_v1',
      status: 'passing',
    });
    const aliases = ledger.listAliases('passing');
    const valid = {
      ruleVersion: config.ruleVersion,
      templates: [template],
      aliases,
      inventory: { templateCount: 1, templates: [source] },
      catalog,
    };
    assert.doesNotThrow(() => validatePromotionSourceState(valid));
    assert.throws(
      () => validatePromotionSourceState({ ...valid, inventory: { templateCount: 1, templates: [{ ...source, sourceTreeHash: 'changed-source' }] } }),
      /stale source hash/i,
    );
    assert.throws(
      () => validatePromotionSourceState({ ...valid, inventory: { templateCount: 1, templates: [{ ...source, niche: 'sound_bath' }] } }),
      /stale niche identity/i,
    );
    assert.throws(
      () => validatePromotionSourceState({ ...valid, catalog: { ...catalog, ruleVersion: 'old-rule' } }),
      /stale repair-rule version/i,
    );
    assert.throws(
      () => validatePromotionSourceState({
        ...valid,
        catalog: { ...catalog, templates: [{ ...catalog.templates[0]!, qualityReceipt: 'receipt_old' }] },
      }),
      /catalogue receipt is stale/i,
    );
    assert.throws(
      () => validatePromotionSourceState({
        ...valid,
        aliases: [{ ...aliases[0]!, designId: 'design_stale' }],
      }),
      /alias record is stale/i,
    );
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

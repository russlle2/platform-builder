import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { AssetVendor } from './assets.js';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { sha256 } from './contracts.js';
import { loadFoundationRegistry } from './foundation-alignment.js';
import { inventoryLegacyTemplate } from './inventory.js';
import { LegacyLedger } from './ledger.js';
import { repairOne } from './pipeline.js';
import type { LegacyCommandContext } from './types.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FOUNDATIONS_ROOT = join(PACKAGE_ROOT, 'foundations');

const values: Readonly<Record<string, string>> = {
  BUSINESS_NAME: 'Cerulean Lantern Collective',
  PRACTITIONER_NAME: 'Avery Rowan',
  EMAIL: 'hello@cerulean-lantern.test',
  PHONE: '+1 646 555 0142',
  CITY: 'Beacon',
  STATE: 'New York',
  TAGLINE: 'A singular source tagline worth preserving',
  CTA_LABEL: 'Begin with Cerulean',
  HERO_HEADLINE: 'A uniquely authored foundation headline',
  HERO_SUBHEADLINE: 'Source-owned editorial copy remains intact before ordinary repair.',
  SECTION_1_HEADING: 'First source heading',
  SECTION_1_BODY: 'First source body explains a calm, practical service without unsupported promises.',
  SECTION_2_HEADING: 'Second source heading',
  SECTION_2_BODY: 'Second source body gives visitors useful context and a clear next step.',
  SECTION_3_HEADING: 'Third source heading',
  SECTION_3_BODY: 'Third source body describes the practice in grounded and verifiable terms.',
  FAQ_Q1: 'What happens first?',
  FAQ_A1: 'Ask the practice about current availability and what to expect.',
  FAQ_Q2: 'Where are sessions offered?',
  FAQ_A2: 'Confirm current location and remote-session details directly.',
  FAQ_Q3: 'How should I prepare?',
  FAQ_A3: 'Bring any questions and share only information you are comfortable discussing.',
  FAQ_Q4: 'How do I get started?',
  FAQ_A4: 'Use the contact form to request current details.',
};

function hydrate(html: string): string {
  return html.replace(/\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g, (_full, token: string) => values[token] ?? `Safe ${token}`);
}

test('repair pipeline applies hash-bound foundation alignment before deterministic repair', { timeout: 60_000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'dc-foundation-pipeline-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const niche = 'aromatherapy' as const;
  const slug = 'foundation-pipeline-fixture';
  const templateRoot = join(sourceRoot, niche, slug);
  const indexPath = join(templateRoot, 'index.html');
  const aboutPath = join(templateRoot, 'about.html');
  let ledger: LegacyLedger | undefined;
  try {
    await mkdir(templateRoot, { recursive: true });
    const checkedInFoundation = await readFile(join(FOUNDATIONS_ROOT, niche, 'foundation-01.html'), 'utf8');
    const indexHtml = hydrate(checkedInFoundation)
      .replace(/<!--\s*PAGES:[^>]+-->/i, '<!-- PAGES: index.html, about.html -->')
      .replace('</head>', '<style id="variation-overrides">:root{--primary:#135780;--font:"Outfit",sans-serif}</style></head>');
    const aboutHtml = `<!doctype html><html lang="en"><head><title>About Cerulean Lantern Collective</title></head><body>
<header><p>A singular source tagline worth preserving</p></header>
<main><h1>About Cerulean Lantern Collective</h1><p>This independently authored inner-page sentence must survive foundation alignment.</p><a href="about.html">Begin with Cerulean</a></main>
<footer><p>Avery Rowan</p><p>Beacon, New York</p><a href="mailto:hello@cerulean-lantern.test">Email</a><a href="tel:+1 646 555 0142">Call</a></footer>
</body></html>`;
    await writeFile(indexPath, indexHtml, 'utf8');
    await writeFile(aboutPath, aboutHtml, 'utf8');
    await writeFile(join(templateRoot, 'template.json'), `${JSON.stringify({
      name: 'Pipeline fixture',
      pages: ['index.html', 'about.html'],
    }, null, 2)}\n`, 'utf8');
    await writeFile(join(templateRoot, 'fields.json'), `${JSON.stringify({ fields: [
      { name: 'BUSINESS_NAME', default: 'Wrong stale business' },
      { name: 'PRACTITIONER_NAME', default: 'Wrong stale practitioner' },
      { name: 'TAGLINE', default: 'Wrong stale tagline' },
      { name: 'CTA_LABEL', default: 'Wrong stale CTA' },
      { name: 'EMAIL', type: 'email', default: 'wrong@example.test' },
      { name: 'PHONE', type: 'tel', default: '+1 212 555 0100' },
    ] }, null, 2)}\n`, 'utf8');

    const sourceIndexBefore = sha256(await readFile(indexPath, 'utf8'));
    const inventory = await inventoryLegacyTemplate(sourceRoot, niche, slug);
    assert.deepEqual(inventory.foundation, { niche, layoutFamily: 'hero-left' });
    const config = resolveLegacyConfig({
      sourceRoot,
      workRoot,
      databasePath: 'ledger.sqlite',
      ruleVersion: 'foundation-pipeline-test-v1',
    });
    await ensureWorkLayout(config);
    ledger = new LegacyLedger({ databasePath: config.databasePath });
    const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: slug,
      niche,
      sourcePath: templateRoot,
      sourceHash: inventory.sourceTreeHash,
      foundationId: `${niche} layout-family-hero-left`,
      pageCount: inventory.pages.length,
      stage: 'repair_pending',
    }, config.ruleVersion);
    const lease = ledger.leaseTemplates({
      stages: ['repair_pending'],
      claimedStage: 'repairing',
      owner: 'foundation-pipeline-test',
      limit: 1,
      runId: run.id,
    })[0];
    assert.ok(lease);
    const context: LegacyCommandContext = {
      command: 'run',
      config,
      flags: { resume: true, dryRun: false, json: false },
      ledger,
      runId: run.id,
    };
    const vendor = new AssetVendor(join(workRoot, 'asset-cache'));
    await vendor.initialize();
    const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
    const outcome = await repairOne(context, lease, vendor, undefined, registry);
    assert.equal(outcome, 'repaired');
    assert.equal(sha256(await readFile(indexPath, 'utf8')), sourceIndexBefore, 'immutable source index changed');

    const artifact = ledger.listArtifacts({ templateId: template.id, kind: 'candidate-template' })[0];
    assert.ok(artifact);
    const artifactRoot = resolve(workRoot, artifact.relativePath);
    const rehabilitation = JSON.parse(await readFile(
      join(artifactRoot, '.dailyclarity', 'rehabilitation.json'),
      'utf8',
    )) as Record<string, any>;
    const alignment = rehabilitation.foundationAlignment as Record<string, any>;
    assert.equal(alignment.foundationId, 'foundation:aromatherapy:hero-left');
    assert.equal(alignment.sourceIndexSha256, sourceIndexBefore);
    assert.equal(alignment.sourceTreeSha256, inventory.sourceTreeHash);
    assert.equal(alignment.sourceUnchanged, true);
    assert.equal(alignment.editorialPreserved, true);
    assert.match(alignment.foundationSha256, /^[a-f0-9]{64}$/);
    assert.match(alignment.registrySha256, /^[a-f0-9]{64}$/);
    assert.match(alignment.identityAlignedSha256, /^[a-f0-9]{64}$/);
    assert.match(alignment.capturedIdentitySha256, /^[a-f0-9]{64}$/);
    assert.ok(alignment.slotCount > alignment.identityAlignedSlotCount);
    assert.ok(alignment.restoredTokens.includes('HERO_HEADLINE'));
    assert.ok(alignment.capturedIdentityFields.includes('TAGLINE'));

    const emittedAbout = await readFile(join(artifactRoot, 'about.html'), 'utf8');
    assert.match(emittedAbout, /\{\{BUSINESS_NAME\}\}/);
    assert.match(emittedAbout, /This independently authored inner-page sentence/);
    assert.doesNotMatch(emittedAbout, /Wrong stale|Cerulean Lantern Collective/);
    const fields = JSON.parse(await readFile(join(artifactRoot, 'fields.json'), 'utf8')) as {
      fields: Array<{ name: string; default?: string }>;
    };
    assert.equal(fields.fields.find((field) => field.name === 'TAGLINE')?.default, values.TAGLINE);
    assert.equal(fields.fields.find((field) => field.name === 'CTA_LABEL')?.default, values.CTA_LABEL);

    const audit = new DatabaseSync(config.databasePath, { readOnly: true });
    try {
      const row = audit.prepare(`
        SELECT rule_code, before_hash, after_hash, details_json
        FROM transformations
        WHERE template_id = ? AND rule_code = 'align-checked-in-foundation'
      `).get(template.id) as Record<string, string> | undefined;
      assert.ok(row);
      assert.equal(row.rule_code, 'align-checked-in-foundation');
      assert.equal(row.before_hash, sourceIndexBefore);
      assert.equal(row.after_hash, alignment.identityAlignedSha256);
      assert.equal(JSON.parse(row.details_json).foundationSha256, alignment.foundationSha256);
    } finally {
      audit.close();
    }
  } finally {
    ledger?.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

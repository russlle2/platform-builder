import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  FOUNDATION_IDENTITY_TOKENS,
  FOUNDATION_LAYOUT_FAMILIES,
  FoundationAlignmentError,
  loadFoundationRegistry,
  matchMarkedFoundation,
  planFoundationAlignment,
  planFoundationAlignmentFromFiles,
} from './foundation-alignment.js';
import { sha256 } from './contracts.js';
import {
  ACTIVE_LEGACY_NICHES,
  type ActiveLegacyNiche,
} from './inventory.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FOUNDATIONS_ROOT = join(PACKAGE_ROOT, 'foundations');
const DEFAULT_REAL_CORPUS = 'C:\\Users\\chris\\platform-builder\\platform-builder';
const REAL_CORPUS_ROOT = resolve(process.env.DAILY_CLARITY_LEGACY_SOURCE ?? DEFAULT_REAL_CORPUS);
const VALID_MARKER = /<!--\s*FOUNDATION:\s*([a-z0-9_]+)\s+layout-family-([a-z0-9-]+)\s*-->/i;

const identityValues: Readonly<Record<string, string>> = {
  BUSINESS_NAME: 'Alignment Studio',
  PRACTITIONER_NAME: 'Jordan Rivera',
  EMAIL: 'hello@alignment.test',
  PHONE: '+1 (212) 555-0199',
  CITY: 'Beacon',
  STATE: 'New York',
  TAGLINE: 'Grounded care for real life',
  CTA_LABEL: 'Schedule a conversation',
};

function hydrateFoundation(html: string): string {
  return html.replace(/\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g, (_full, token: string) => (
    identityValues[token] ?? `Original ${token.toLowerCase().replace(/_/g, ' ')} copy`
  ));
}

test('registry hash-binds the complete 5 x 12 checked-in foundation matrix', async () => {
  const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
  assert.equal(registry.descriptors.length, 60);
  assert.equal(registry.byKey.size, 60);
  assert.equal(new Set(registry.descriptors.map((item) => item.sha256)).size, 60);
  assert.equal(new Set(registry.descriptors.map((item) => item.structureSha256)).size, 60);
  assert.match(registry.sha256, /^[a-f0-9]{64}$/);

  for (const niche of ACTIVE_LEGACY_NICHES) {
    for (const layoutFamily of FOUNDATION_LAYOUT_FAMILIES) {
      const descriptor = registry.byKey.get(`${niche}/layout-family-${layoutFamily}`);
      assert.ok(descriptor, `${niche}/${layoutFamily}`);
      assert.equal(sha256(await readFile(descriptor.absolutePath, 'utf8')), descriptor.sha256);
      for (const token of ['BUSINESS_NAME', 'PRACTITIONER_NAME', 'EMAIL', 'PHONE', 'CITY', 'STATE', 'TAGLINE', 'CTA_LABEL']) {
        assert.ok(descriptor.tokens.includes(token), `${descriptor.key} should expose ${token}`);
      }
    }
  }
});

test('alignment restores positional tokens while preserving copy, theme, media, and source bytes', async () => {
  const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
  const foundation = registry.byKey.get('aromatherapy/layout-family-hero-left')!;
  const sourceHtml = hydrateFoundation(foundation.html)
    .replace('<title>Alignment Studio — Aromatherapy</title>', '<title>A calmer aromatherapy practice</title>')
    .replace('</head>', `<style id="variation-overrides">
:root { --primary: #123456; --accent: rgb(10 20 30); --font-heading: "Outfit", sans-serif; }
body { font-family: "Inter", system-ui, sans-serif; }
</style></head>`)
    .replace(
      '<section class="hero hero-left"',
      '<section class="hero hero-left hero-bg"',
    )
    .replace(
      '<div class="hero-grid">',
      '<img class="hero-bg-img" src="assets/hero.webp" alt="" role="presentation" loading="eager" fetchpriority="high"><div class="hero-grid">',
    );
  const before = sha256(sourceHtml);
  const result = planFoundationAlignment({
    sourceHtml,
    sourceName: 'fixture/index.html',
    declaredNiche: 'aromatherapy',
    registry,
    stylesheets: {
      'assets/css/styles.css': ':root { --surface: #fefefe; } h1 { font-family: "Fraunces", serif; }',
    },
  });

  assert.equal(sha256(sourceHtml), before);
  assert.equal(result.sourceUnchanged, true);
  assert.equal(result.normalizedSourceSha256, result.roundTripSha256);
  assert.equal(result.identity.BUSINESS_NAME, 'Alignment Studio');
  assert.equal(result.identity.PRACTITIONER_NAME, 'Jordan Rivera');
  assert.equal(result.identity.EMAIL, 'hello@alignment.test');
  assert.equal(result.identity.PHONE, '+1 (212) 555-0199');
  assert.match(result.alignedHtml, /\{\{BUSINESS_NAME\}\}/);
  assert.match(result.alignedHtml, /\{\{PRACTITIONER_NAME\}\}/);
  assert.match(result.alignedHtml, /\{\{EMAIL\}\}/);
  assert.match(result.alignedHtml, /hero-bg-img/);
  assert.match(result.alignedHtml, /variation-overrides/);
  assert.match(result.identityAlignedHtml, /<title>A calmer aromatherapy practice<\/title>/);
  assert.match(result.identityAlignedHtml, /\{\{BUSINESS_NAME\}\}/);
  assert.doesNotMatch(result.identityAlignedHtml, /\{\{HERO_HEADLINE\}\}/);
  assert.match(result.identityAlignedHtml, /Original hero headline copy/);
  assert.equal(result.editorialPreservedInIdentityAlignment, true);
  assert.ok(result.identityAlignedSlots.length > 0);
  assert.ok(result.editorialContent.some((entry) => entry.value === 'A calmer aromatherapy practice'));
  assert.ok(result.editorialContent.some((entry) => entry.value.includes('Original hero headline copy')));
  for (const color of ['#123456', '#fefefe', 'rgb(10 20 30)']) {
    assert.ok(result.theme.colors.includes(color), color);
  }
  assert.ok(result.theme.fonts.some((font) => font.includes('Inter')));
  assert.ok(result.theme.fonts.some((font) => font.includes('Fraunces')));
  assert.ok(result.slots.every((slot) => slot.tokens.length > 0));
});

test('matcher rejects lying markers, changed topology, changed static contracts, and ambiguous markers', async () => {
  const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
  const foundation = registry.byKey.get('aromatherapy/layout-family-hero-left')!;
  const source = hydrateFoundation(foundation.html);

  const lyingMarker = source.replace('layout-family-hero-left -->', 'layout-family-hero-centered -->');
  assert.equal(matchMarkedFoundation(lyingMarker, 'aromatherapy', registry).matched, false);
  assert.equal(
    (matchMarkedFoundation(lyingMarker, 'aromatherapy', registry) as { code: string }).code,
    'foundation-marker-structure-mismatch',
  );

  const changedTopology = source.replace('<main id="main">', '<main id="main"><aside>untrusted insertion</aside>');
  assert.equal(
    (matchMarkedFoundation(changedTopology, 'aromatherapy', registry) as { code: string }).code,
    'foundation-structure-mismatch',
  );

  const changedStaticContract = source.replace('Primary navigation', 'Secondary navigation');
  assert.equal(
    (matchMarkedFoundation(changedStaticContract, 'aromatherapy', registry) as { code: string }).code,
    'foundation-static-contract-mismatch',
  );

  const duplicateMarker = `${source}\n<!-- FOUNDATION: aromatherapy layout-family-hero-left -->`;
  assert.equal(
    (matchMarkedFoundation(duplicateMarker, 'aromatherapy', registry) as { code: string }).code,
    'foundation-marker-ambiguous',
  );

  assert.equal(
    (matchMarkedFoundation(source, 'sound_bath', registry) as { code: string }).code,
    'foundation-marker-niche-mismatch',
  );
});

test('alignment restores a required identity token even when its generated default is empty', async () => {
  const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
  const foundation = registry.byKey.get('aromatherapy/layout-family-hero-left')!;
  const withoutBusinessIdentity = hydrateFoundation(foundation.html)
    .replace(/Alignment Studio/g, '');
  const result = planFoundationAlignment({
    sourceHtml: withoutBusinessIdentity,
    declaredNiche: 'aromatherapy',
    registry,
  });
  assert.equal(result.identity.BUSINESS_NAME, undefined);
  assert.match(result.alignedHtml, /\{\{BUSINESS_NAME\}\}/);
  assert.ok(result.slots.some((slot) => slot.tokens.includes('BUSINESS_NAME')));
});

test('registry refuses a foundation whose filename and marker disagree', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'dc-foundation-registry-'));
  try {
    const path = join(scratch, 'aromatherapy', 'foundation-01.html');
    await mkdir(dirname(path), { recursive: true });
    const source = await readFile(join(FOUNDATIONS_ROOT, 'aromatherapy', 'foundation-01.html'), 'utf8');
    await writeFile(path, source.replace('layout-family-hero-left', 'layout-family-hero-centered'), 'utf8');
    await assert.rejects(
      () => loadFoundationRegistry(scratch, { requireComplete: false }),
      /foundation-registry-marker/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('identity classification covers every runtime alias required by legacy composition', () => {
  const requiredAliases = [
    'BUSINESS_NAME', 'PRACTICE_NAME', 'BRAND_NAME', 'STUDIO_NAME',
    'PRACTITIONER_NAME', 'OWNER_NAME', 'COACH_NAME', 'THERAPIST_NAME',
    'EMAIL', 'CONTACT_EMAIL', 'PHONE', 'PHONE_NUMBER', 'CONTACT_PHONE',
    'ADDRESS', 'STREET_ADDRESS', 'CITY', 'STATE', 'ZIP', 'HOURS',
    'TAGLINE', 'DESCRIPTION', 'CTA_LABEL', 'PRIMARY_CTA_LABEL',
    'CTA_URL', 'PRIMARY_CTA_URL', 'BOOKING_URL',
  ];
  for (const token of requiredAliases) {
    assert.ok(FOUNDATION_IDENTITY_TOKENS.includes(token as never), token);
  }
});

test('the immutable real corpus binds all 4,937 marked templates to all 60 foundations', {
  skip: !existsSync(REAL_CORPUS_ROOT),
  timeout: 120_000,
}, async () => {
  const registry = await loadFoundationRegistry(FOUNDATIONS_ROOT);
  const representatives = new Map<string, { niche: ActiveLegacyNiche; htmlPath: string }>();
  const failures: string[] = [];
  let marked = 0;

  for (const niche of ACTIVE_LEGACY_NICHES) {
    const entries = await readdir(join(REAL_CORPUS_ROOT, niche), { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const htmlPath = join(REAL_CORPUS_ROOT, niche, entry.name, 'index.html');
      if (!existsSync(htmlPath)) continue;
      const html = await readFile(htmlPath, 'utf8');
      if (!VALID_MARKER.test(html)) continue;
      marked += 1;
      const match = matchMarkedFoundation(html, niche, registry);
      if (!match.matched) {
        failures.push(`${niche}/${entry.name}: ${match.code}: ${match.detail}`);
        continue;
      }
      if (!representatives.has(match.foundation.key)) {
        representatives.set(match.foundation.key, { niche, htmlPath });
      }
    }
  }

  assert.equal(marked, 4_937);
  assert.deepEqual(failures, []);
  assert.equal(representatives.size, 60);

  for (const [key, representative] of representatives) {
    const stylesheet = join(dirname(representative.htmlPath), 'assets', 'css', 'styles.css');
    const paths = [representative.htmlPath, ...(existsSync(stylesheet) ? [stylesheet] : [])];
    const before = await Promise.all(paths.map(async (path) => sha256(await readFile(path, 'utf8'))));
    const plan = await planFoundationAlignmentFromFiles({
      sourceHtmlPath: representative.htmlPath,
      stylesheetPaths: existsSync(stylesheet) ? [stylesheet] : [],
      declaredNiche: representative.niche,
      registry,
    });
    assert.equal(plan.foundationId, `foundation:${key.replace('/layout-family-', ':')}`);
    assert.equal(plan.normalizedSourceSha256, plan.roundTripSha256);
    assert.ok(plan.slots.length > 0);
    assert.equal(plan.sourceProof.every((proof) => proof.unchanged), true);
    const after = await Promise.all(paths.map(async (path) => sha256(await readFile(path, 'utf8'))));
    assert.deepEqual(after, before, `${key} source changed`);
  }
});

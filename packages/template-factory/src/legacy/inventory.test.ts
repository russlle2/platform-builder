import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  inferGenerationCohort,
  inferPageRole,
  inventoryLegacyCatalog,
  inventoryLegacyTemplate,
  pilotCoverageDimensions,
  selectStratifiedPilot,
  type ActiveLegacyNiche,
  type LegacyTemplateInventory,
} from './inventory.js';

test('generation cohorts follow immutable slug waves independently of foundation lineage', () => {
  assert.equal(
    inferGenerationCohort('aromatherapy-2026-02-16T14-59-46-083Z-001'),
    'generated:2026-02-16',
  );
  assert.equal(
    inferGenerationCohort('aromatherapy-MORE-2026-02-17T15-15-57-303Z-026'),
    'more:2026-02-17',
  );
  assert.equal(inferGenerationCohort('hand-authored-legacy-template'), 'legacy-undated');
  assert.equal(pilotCoverageDimensions(pilotTemplate({
    slug: 'aromatherapy-MORE-2026-02-17T15-15-57-303Z-026',
    foundation: 'calm',
  })).cohort, 'aromatherapy:more:2026-02-17');
});

function pilotTemplate(input: {
  slug: string;
  niche?: ActiveLegacyNiche;
  roles?: string[];
  issueCodes?: string[];
  foundation?: string;
  hash?: string;
}): LegacyTemplateInventory {
  const niche = input.niche ?? 'aromatherapy';
  return {
    key: `${niche}/${input.slug}`,
    niche,
    slug: input.slug,
    sourceDir: 'unused',
    sourceTreeHash: input.hash ?? input.slug.padStart(64, '0'),
    sourceBytes: 1,
    files: [],
    pages: (input.roles ?? ['home']).map((role, index) => ({
      name: index === 0 ? 'index.html' : `${role}-${index}.html`,
      role,
      bytes: 1,
      sha256: `${input.slug}-${index}`,
      tokens: [],
      remoteUrls: [],
    })),
    declaredPages: [],
    ...(input.foundation ? { foundation: { niche, layoutFamily: input.foundation } } : {}),
    rawManifest: {},
    rawFields: {},
    issues: (input.issueCodes ?? []).map((code) => ({
      code,
      severity: 'warning',
      detail: code,
      fingerprint: `${input.slug}-${code}`,
    })),
  };
}

function coverageKeys(templates: readonly LegacyTemplateInventory[]): string[] {
  return [...new Set(templates.flatMap((template) => {
    const dimensions = pilotCoverageDimensions(template);
    return [
      `niche:${dimensions.niche}`,
      ...(dimensions.foundation ? [`foundation:${dimensions.foundation}`] : []),
      `cohort:${dimensions.cohort}`,
      `topology:${dimensions.topology}`,
      ...dimensions.issueCodes.map((code) => `issue:${code}`),
    ];
  }))].sort();
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dc-legacy-inventory-'));
  const template = join(root, 'aromatherapy', 'sample-001');
  await mkdir(join(template, 'assets'), { recursive: true });
  await writeFile(join(template, 'index.html'), `<!-- FOUNDATION: aromatherapy layout-family-calm -->
<!doctype html><html><head></head><body><main><h1>{{BUSINESS_NAME}}</h1></main></body></html>`);
  await writeFile(join(template, 'contact.html'), '<!doctype html><html><body>{{EMAIL}}</body></html>');
  await writeFile(join(template, 'template.json'), JSON.stringify({ pages: ['index.html', 'contact.html'] }));
  await writeFile(join(template, 'fields.json'), JSON.stringify({ placeholders: { BUSINESS_NAME: 'Example', EMAIL: 'hello@example.com' } }));
  await writeFile(join(template, 'assets', 'style.css'), 'body { color: #123456 }');
  return root;
}

test('inventory hashes a template deterministically without changing its source', async () => {
  const root = await fixture();
  try {
    const before = await readFile(join(root, 'aromatherapy', 'sample-001', 'index.html'), 'utf8');
    const first = await inventoryLegacyTemplate(root, 'aromatherapy', 'sample-001');
    const second = await inventoryLegacyTemplate(root, 'aromatherapy', 'sample-001');
    assert.equal(first.sourceTreeHash, second.sourceTreeHash);
    assert.equal(first.pages.length, 2);
    assert.deepEqual(first.foundation, { niche: 'aromatherapy', layoutFamily: 'calm' });
    assert.deepEqual(first.pages.find((page) => page.name === 'contact.html')?.tokens, ['EMAIL']);
    assert.equal(await readFile(join(root, 'aromatherapy', 'sample-001', 'index.html'), 'utf8'), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('catalog inventory supports a deliberately partial safety-scoped run', async () => {
  const root = await fixture();
  try {
    const result = await inventoryLegacyCatalog(root, {
      niches: ['aromatherapy'],
      expectedCounts: false,
      workers: 2,
    });
    assert.equal(result.templateCount, 1);
    assert.equal(result.fileCount, 5);
    assert.equal(result.pageCount, 2);
    assert.equal(result.countsByNiche.aromatherapy, 1);
    assert.match(result.catalogHash, /^[a-f0-9]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('inventory normalizes legacy page aliases before comparing them with disk', async () => {
  const root = await fixture();
  try {
    const template = join(root, 'aromatherapy', 'sample-001');
    await writeFile(join(template, 'template.json'), JSON.stringify({
      paths: [
        { path: '/' },
        { slug: 'contact.html' },
      ],
    }));
    const result = await inventoryLegacyTemplate(root, 'aromatherapy', 'sample-001');
    assert.deepEqual(result.declaredPages, ['contact.html', 'index.html']);
    assert.equal(result.issues.some((item) => item.code === 'missing_declared_page'), false);
    assert.equal(result.issues.some((item) => item.code === 'undeclared_page'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('role inference and stratified selection remain deterministic', () => {
  assert.equal(inferPageRole('pricing-and-packages.html'), 'pricing');
  assert.equal(inferPageRole('index.html'), 'home');
  const sample = Array.from({ length: 10 }, (_, index) => ({
    key: `aromatherapy/sample-${index}`,
    niche: 'aromatherapy' as const,
    slug: `sample-${index}`,
    sourceDir: 'unused',
    sourceTreeHash: String(index).padStart(64, '0'),
    sourceBytes: 1,
    files: [],
    pages: [{ name: 'index.html', role: index % 2 ? 'home' : 'about', bytes: 1, sha256: 'a', tokens: [], remoteUrls: [] }],
    declaredPages: ['index.html'],
    rawManifest: {},
    rawFields: {},
    issues: index % 3 ? [] : [{ code: 'shape', severity: 'warning' as const, detail: 'shape', fingerprint: 'x' }],
  }));
  assert.deepEqual(
    selectStratifiedPilot(sample, 5).map((item) => item.key),
    selectStratifiedPilot([...sample].reverse(), 5).map((item) => item.key),
  );
  assert.equal(new Set(selectStratifiedPilot(sample, 5).map((item) => item.key)).size, 5);
});

test('pilot selection covers every observed niche, foundation, cohort, exact topology, and issue code before fill', () => {
  const sample = [
    pilotTemplate({ slug: 'a', foundation: 'calm', roles: ['home', 'about'], issueCodes: ['unsafe-url'], hash: '01' }),
    pilotTemplate({ slug: 'b', foundation: 'bold', roles: ['home', 'pricing'], hash: '02' }),
    pilotTemplate({ slug: 'c', niche: 'holistic_medicine', foundation: 'clinical', roles: ['home', 'contact'], issueCodes: ['sensitive-form'], hash: '03' }),
    pilotTemplate({ slug: 'd', roles: ['home', 'detail', 'detail'], issueCodes: ['duplicate-page'], hash: '04' }),
    pilotTemplate({ slug: 'e', niche: 'holistic_medicine', roles: ['home', 'faq'], hash: '05' }),
    pilotTemplate({ slug: 'f', foundation: 'calm', roles: ['home', 'about'], hash: '06' }),
    pilotTemplate({ slug: 'g', foundation: 'bold', roles: ['home', 'pricing'], hash: '07' }),
    pilotTemplate({ slug: 'h', roles: ['home', 'detail', 'detail'], hash: '08' }),
  ];

  const selected = selectStratifiedPilot(sample, 5);
  assert.equal(selected.length, 5);
  assert.deepEqual(coverageKeys(selected), coverageKeys(sample));
  assert.equal(pilotCoverageDimensions(sample[3]!).topology, 'detail+detail+home');
});

test('pilot selection fails clearly when requested capacity cannot cover all observed dimensions', () => {
  const sample = [
    pilotTemplate({ slug: 'one', foundation: 'one', roles: ['home'], hash: '01' }),
    pilotTemplate({ slug: 'two', foundation: 'two', roles: ['about'], hash: '02' }),
    pilotTemplate({ slug: 'three', foundation: 'three', roles: ['contact'], hash: '03' }),
  ];

  assert.throws(
    () => selectStratifiedPilot(sample, 2),
    /Pilot size 2 cannot cover every observed niche, foundation, cohort, page topology, and issue code.*Increase --pilot-size/i,
  );
});

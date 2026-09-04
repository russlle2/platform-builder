import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import { sha256 } from './contracts.js';
import {
  loadHomepageDonor,
  selectNearestHomepageDonor,
  type HomepageDonor,
} from './homepage-donor.js';
import type { ActiveLegacyNiche, LegacyTemplateInventory } from './inventory.js';

function template(input: {
  slug: string;
  niche?: ActiveLegacyNiche;
  home?: string;
  layout?: string;
  voice?: string;
  offer?: string;
  issueSeverity?: 'warning' | 'error' | 'critical';
  sourceDir?: string;
  aboutBytes?: number;
}): LegacyTemplateInventory {
  const niche = input.niche ?? 'aromatherapy';
  const pages = [
    ...(input.home ? [{ name: 'index.html', role: 'home', bytes: Buffer.byteLength(input.home), sha256: sha256(input.home), tokens: ['BUSINESS_NAME'], remoteUrls: [] }] : []),
    { name: 'about.html', role: 'about', bytes: input.aboutBytes ?? 500, sha256: sha256(`${input.slug}:about`), tokens: ['BUSINESS_NAME', 'PRACTITIONER_NAME'], remoteUrls: [] },
    { name: 'services.html', role: 'services', bytes: 700, sha256: sha256(`${input.slug}:services`), tokens: ['BUSINESS_NAME', 'SERVICES'], remoteUrls: [] },
  ];
  return {
    key: `${niche}/${input.slug}`,
    niche,
    slug: input.slug,
    sourceDir: input.sourceDir ?? join('source', niche, input.slug),
    sourceTreeHash: sha256(`${input.slug}:tree`),
    sourceBytes: pages.reduce((sum, page) => sum + page.bytes, 0),
    files: pages.map((page) => ({ relativePath: page.name, bytes: page.bytes, sha256: page.sha256, kind: 'html' as const })),
    pages,
    declaredPages: pages.map((page) => page.name),
    rawManifest: {
      layoutFamily: input.layout ?? 'earthy_warm',
      voiceFamily: input.voice ?? 'minimal_poetic',
      offerModel: input.offer ?? 'events_series',
      requiredSections: ['hero', 'benefits', 'faq'],
      pages: pages.map((page) => page.name),
    },
    rawFields: {},
    issues: input.issueSeverity ? [{
      code: 'fixture-issue',
      severity: input.issueSeverity,
      detail: 'fixture issue',
      fingerprint: sha256(`${input.slug}:issue`),
    }] : [],
  };
}

test('homepage donor selection is same-niche, safety-gated, and design-nearest', () => {
  const target = template({ slug: 'target', aboutBytes: 510 });
  const exactHome = '<!doctype html><html><body><header>exact</header><main>home</main></body></html>';
  const exact = template({ slug: 'exact', home: exactHome, aboutBytes: 515 });
  const unsafeExact = template({ slug: 'unsafe-exact', home: exactHome, issueSeverity: 'error', aboutBytes: 510 });
  const crossNicheExact = template({ slug: 'cross-niche', niche: 'sound_bath', home: exactHome, aboutBytes: 510 });
  const farther = template({ slug: 'farther', home: exactHome, layout: 'bold_playful', voice: 'clinical_calm', offer: 'membership', aboutBytes: 510 });

  const selected = selectNearestHomepageDonor(target, [farther, crossNicheExact, unsafeExact, exact, target]);
  assert.equal(selected?.template.slug, 'exact');
  assert.ok((selected?.score ?? Number.POSITIVE_INFINITY) < 1);
  assert.equal(selectNearestHomepageDonor(target, [crossNicheExact, unsafeExact]), undefined);
  assert.equal(selectNearestHomepageDonor(exact, [target]), undefined, 'templates that already have a home never borrow one');
});

test('loaded donor is hash-bound to immutable inventory evidence', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-home-donor-'));
  const html = '<!doctype html><html><body><main>home</main></body></html>';
  try {
    await mkdir(scratch, { recursive: true });
    await writeFile(join(scratch, 'index.html'), html, 'utf8');
    const candidate = template({ slug: 'donor', home: html, sourceDir: scratch });
    const target = template({ slug: 'target' });
    const selection = selectNearestHomepageDonor(target, [candidate]);
    assert.ok(selection);
    const donor = await loadHomepageDonor(selection);
    assert.equal(donor.contentHash, sha256(html));

    await writeFile(join(scratch, 'index.html'), `${html}\nchanged`, 'utf8');
    await assert.rejects(() => loadHomepageDonor(selection), /changed after inventory/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('missing-home repair uses the selected donor shell and retains a safe local fallback', () => {
  const about = '<!doctype html><html><head><title>About</title></head><body data-shell="local"><header>Local header</header><main><p>This target-owned sentence is long enough to become the preserved safe source excerpt.</p></main></body></html>';
  const donorHtml = '<!doctype html><html><head><title>Donor</title></head><body data-shell="nearest"><header>Nearest header</header><main><p>Donor homepage copy must be replaced.</p></main></body></html>';
  const donor: HomepageDonor = {
    legacySlug: 'nearest-design',
    niche: 'aromatherapy',
    html: donorHtml,
    contentHash: sha256(donorHtml),
    sourceTreeHash: sha256('nearest-tree'),
    selectionScore: 0.125,
  };

  const fromDonor = repairLegacyTemplate({
    slug: 'missing-home',
    niche: 'aromatherapy',
    files: new Map([['about.html', about]]),
    homepageDonor: donor,
  });
  const donorHome = String(fromDonor.files.get('index.html'));
  assert.match(donorHome, /data-shell="nearest"/);
  assert.match(donorHome, /data-dc-page-role="home"/);
  assert.match(donorHome, /This target-owned sentence/);
  assert.doesNotMatch(donorHome, /Donor homepage copy must be replaced/);
  assert.match(fromDonor.transformations.find((item) => item.rule === 'reconstruct-missing-homepage')?.detail ?? '', /nearest-design/);

  const localFallback = repairLegacyTemplate({
    slug: 'missing-home-without-donor',
    niche: 'aromatherapy',
    files: new Map([['about.html', about]]),
  });
  assert.match(String(localFallback.files.get('index.html')), /data-shell="local"/);
  assert.throws(() => repairLegacyTemplate({
    slug: 'cross-niche-donor',
    niche: 'aromatherapy',
    files: new Map([['about.html', about]]),
    homepageDonor: { ...donor, niche: 'sound_bath' },
  }), /Invalid homepage donor/);
});

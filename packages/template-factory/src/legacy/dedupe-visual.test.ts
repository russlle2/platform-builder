import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDedupeClusters,
  checkCompositionCompatibility,
  createDedupeFingerprint,
  type DedupeCandidate,
  type VisualAliasEvidence,
} from './dedupe.js';

const PASSING_EVIDENCE: VisualAliasEvidence = {
  domSimilarity: 0.98,
  desktopSsim: 0.995,
  mobileSsim: 0.995,
  desktopPerceptualHashDistance: 4,
  mobilePerceptualHashDistance: 4,
  pages: [{
    page: 'index.html',
    desktopSsim: 0.995,
    mobileSsim: 0.995,
    desktopPerceptualHashDistance: 4,
    mobilePerceptualHashDistance: 4,
  }],
};

function candidate(input: {
  slug: string;
  layout: string;
  niche?: string;
  role?: string;
  foundation?: string;
  extraSlot?: boolean;
  includeAbout?: boolean;
}): DedupeCandidate {
  const niche = input.niche ?? 'wellness_coach';
  const role = input.role ?? 'home';
  const extraMarkup = input.extraSlot
    ? '<p data-dc-edit-id="summary"><!--dc-content:summary--></p>'
    : '';
  const pages: Record<string, string> = {
    'index.html': '<!doctype html><html><body><main>'
      + '<h1 data-dc-edit-id="headline"><!--dc-content:headline--></h1>'
      + extraMarkup
      + '<img data-dc-image-id="hero" src="__DC_IMAGE_hero__" alt="">'
      + '</main></body></html>',
  };
  const styles = {
    'assets/css/styles.css': `.hero{display:${input.layout};color:var(--dc-theme-primary)}`,
  };
  const pageRoles: Record<string, string> = { 'index.html': role };
  if (input.includeAbout) {
    pages['about.html'] = pages['index.html'];
    pageRoles['about.html'] = 'about';
  }
  const contentHash = `content-hash-${input.slug}`;
  const themeHash = `theme-hash-${input.slug}`;
  const fingerprint = createDedupeFingerprint({
    legacySlug: input.slug,
    niche,
    ...(input.foundation ? { foundation: input.foundation } : {}),
    pages,
    styles,
    pageRoles,
    contentHash,
    themeHash,
  });
  const design = {
    id: `design_${fingerprint.exactDesignHash.slice(0, 24)}`,
    niche,
    ...(input.foundation ? { foundation: input.foundation } : {}),
    pages,
    styles,
    pageRoles,
    structureHash: fingerprint.structureHash,
    domHash: fingerprint.domHash,
    cssHash: fingerprint.cssHash,
  };
  const entries = [{
    nodeId: 'headline',
    page: 'index.html',
    html: `Headline for ${input.slug}`,
    text: `Headline for ${input.slug}`,
  }];
  if (input.extraSlot) {
    entries.push({
      nodeId: 'summary',
      page: 'index.html',
      html: `Summary for ${input.slug}`,
      text: `Summary for ${input.slug}`,
    });
  }
  if (input.includeAbout) {
    entries.push({
      nodeId: 'headline',
      page: 'about.html',
      html: `About ${input.slug}`,
      text: `About ${input.slug}`,
    });
  }
  const images = [{
    slotId: 'hero',
    page: 'index.html',
    kind: 'image' as const,
    source: `assets/img/${input.slug}.webp`,
    attribute: 'src' as const,
  }];
  if (input.includeAbout) images.push({ ...images[0]!, page: 'about.html' });
  const contentPreset = {
    id: `content_${input.slug}`,
    legacySlug: input.slug,
    entries,
    images,
    hash: contentHash,
  };
  const themePreset = {
    id: `theme_${input.slug}`,
    legacySlug: input.slug,
    tokens: [{ id: 'primary', value: input.slug.endsWith('a') ? '#112233' : '#223344', kind: 'color' as const }],
    fontImports: [],
    hash: themeHash,
  };
  return {
    fingerprint,
    design,
    contentPreset,
    themePreset,
    catalogTemplate: {
      legacySlug: input.slug,
      designId: design.id,
      contentPresetId: contentPreset.id,
      themePresetId: themePreset.id,
      niche,
      qualityReceipt: `receipt_${input.slug}`,
    },
  };
}

test('aliases differing irregular design hashes only with complete boundary-passing visual evidence', () => {
  const left = candidate({ slug: 'visual-a', layout: 'grid' });
  const right = candidate({ slug: 'visual-b', layout: 'flex' });
  assert.notEqual(left.fingerprint.exactDesignHash, right.fingerprint.exactDesignHash);
  assert.equal(checkCompositionCompatibility(left, right).pass, false);

  let evidenceCalls = 0;
  const clusters = buildDedupeClusters([right, left], (canonical, proposed) => {
    evidenceCalls += 1;
    assert.equal(canonical.fingerprint.legacySlug, 'visual-a');
    assert.equal(proposed.fingerprint.legacySlug, 'visual-b');
    return PASSING_EVIDENCE;
  });

  assert.equal(evidenceCalls, 1);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.canonicalLegacySlug, 'visual-a');
  assert.equal(clusters[0]!.designId, left.design.id);
  assert.deepEqual(
    clusters[0]!.aliases.map((alias) => ({
      slug: alias.legacySlug,
      content: alias.contentPresetId,
      theme: alias.themePresetId,
      reason: alias.reason,
    })),
    [
      { slug: 'visual-a', content: 'content_visual-a', theme: 'theme_visual-a', reason: 'distinct' },
      { slug: 'visual-b', content: 'content_visual-b', theme: 'theme_visual-b', reason: 'verified-visual-equivalence' },
    ],
  );
});

test('validates page-bound CSS background presets against their design stylesheet', () => {
  const value = candidate({ slug: 'css-background', layout: 'grid' });
  value.design.styles['assets/css/styles.css'] += '.banner{background-image:url("__DC_IMAGE_css_hero__")}';
  value.contentPreset.images.push({
    slotId: 'css_hero',
    page: 'index.html',
    kind: 'background',
    source: 'assets/img/background.webp',
    stylesheet: 'assets/css/styles.css',
    selector: '.banner',
    attribute: 'css-url',
  });

  assert.deepEqual(checkCompositionCompatibility(value, value).issues, []);
  assert.equal(buildDedupeClusters([value]).length, 1);
});

test('keeps irregular designs distinct below any one visual threshold', async (t) => {
  const failures: Array<[string, VisualAliasEvidence]> = [
    ['DOM similarity', { ...PASSING_EVIDENCE, domSimilarity: 0.979999 }],
    ['desktop SSIM', { ...PASSING_EVIDENCE, desktopSsim: 0.994999 }],
    ['mobile SSIM', { ...PASSING_EVIDENCE, mobileSsim: 0.994999 }],
    ['desktop perceptual hash', { ...PASSING_EVIDENCE, desktopPerceptualHashDistance: 5 }],
    ['mobile perceptual hash', { ...PASSING_EVIDENCE, mobilePerceptualHashDistance: 5 }],
  ];

  for (const [name, evidence] of failures) {
    await t.test(name, () => {
      const left = candidate({ slug: 'threshold-a', layout: 'grid' });
      const right = candidate({ slug: 'threshold-b', layout: 'flex' });
      const clusters = buildDedupeClusters([left, right], () => evidence);
      assert.equal(clusters.length, 2);
      assert.deepEqual(clusters.map((cluster) => cluster.aliases[0]!.legacySlug), ['threshold-a', 'threshold-b']);
    });
  }
});

test('requires a complete passing page-by-viewport visual matrix', () => {
  const left = candidate({ slug: 'visual-pages-a', layout: 'grid', includeAbout: true });
  const right = candidate({ slug: 'visual-pages-b', layout: 'flex', includeAbout: true });

  assert.equal(buildDedupeClusters([left, right], () => PASSING_EVIDENCE).length, 2);
  const fullEvidence: VisualAliasEvidence = {
    ...PASSING_EVIDENCE,
    pages: [
      PASSING_EVIDENCE.pages[0]!,
      { ...PASSING_EVIDENCE.pages[0]!, page: 'about.html' },
    ],
  };
  assert.equal(buildDedupeClusters([left, right], () => fullEvidence).length, 1);
  const failedInnerPage: VisualAliasEvidence = {
    ...fullEvidence,
    pages: fullEvidence.pages.map((page) => page.page === 'about.html'
      ? { ...page, mobileSsim: 0.994 }
      : page),
  };
  assert.equal(buildDedupeClusters([left, right], () => failedInnerPage).length, 2);
});

test('requires same niche and page roles before requesting visual evidence', () => {
  const base = candidate({ slug: 'scope-a', layout: 'grid' });
  const otherNiche = candidate({ slug: 'scope-b', layout: 'flex', niche: 'aromatherapy' });
  const otherRoles = candidate({ slug: 'scope-c', layout: 'block', role: 'about' });
  let evidenceCalls = 0;
  const clusters = buildDedupeClusters([base, otherNiche, otherRoles], () => {
    evidenceCalls += 1;
    return PASSING_EVIDENCE;
  });

  assert.equal(evidenceCalls, 0);
  assert.equal(clusters.length, 3);
});

test('keeps foundations and preset-incompatible irregular designs out of the visual lane', () => {
  const foundationA = candidate({ slug: 'foundation-a', layout: 'grid', foundation: 'shared-foundation' });
  const foundationB = candidate({ slug: 'foundation-b', layout: 'flex', foundation: 'shared-foundation' });
  const canonical = candidate({ slug: 'preset-a', layout: 'grid' });
  const incompatible = candidate({ slug: 'preset-b', layout: 'flex', extraSlot: true });
  let evidenceCalls = 0;
  const evidence = () => {
    evidenceCalls += 1;
    return PASSING_EVIDENCE;
  };

  assert.equal(buildDedupeClusters([foundationA, foundationB], evidence).length, 2);
  assert.equal(buildDedupeClusters([canonical, incompatible], evidence).length, 2);
  assert.equal(evidenceCalls, 0);
});

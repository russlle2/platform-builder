import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { hydrateTemplate } from '../../../apps/generator-app/src/lib/templates/template-hydration.js';
import { normalizeFoundationForPublication } from './assembler.js';
import {
  buildCuratedCopy,
  exportCuratedTemplates,
  parseCuratedExportArgs,
} from './curated-export.js';

test('publication normalization removes synthetic proof blocks only', () => {
  const source = `
    <section class="services"><h2>Services</h2></section>
    <section class="testimonials layout-a"><h2>What clients share</h2><blockquote>Sample</blockquote></section>
    <section class="contact"><h2>Contact</h2></section>`;
  const normalized = normalizeFoundationForPublication(source);

  assert.match(normalized, /class="services"/);
  assert.match(normalized, /class="contact"/);
  assert.doesNotMatch(normalized, /testimonials|What clients share|blockquote/i);
});

test('curated copy is deterministic, niche-specific, and free of claim placeholders', () => {
  const first = buildCuratedCopy('aromatherapy', 0);
  const again = buildCuratedCopy('aromatherapy', 0);
  const other = buildCuratedCopy('sound_bath', 0);

  assert.deepEqual(first, again);
  assert.notEqual(first.title, other.title);
  assert.doesNotMatch(JSON.stringify(first), /\{\{|testimonials?|\$\s*\d|\b\d{1,3}%\b/i);
});

test('CLI requires an explicit output and parses bounded selection options', () => {
  assert.throws(() => parseCuratedExportArgs([]), /--output is required/);
  assert.deepEqual(
    parseCuratedExportArgs([
      '--',
      '--output',
      'C:/tmp/curated',
      '--niche=aromatherapy',
      '--limit-per-niche',
      '2',
      '--replace',
    ]),
    {
      outputRoot: 'C:/tmp/curated',
      niches: ['aromatherapy'],
      limitPerNiche: 2,
      replace: true,
    },
  );
});

test('offline exporter produces reproducible v2-ready output', { timeout: 30_000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'curated-export-'));
  const firstRoot = join(scratch, 'first');
  const secondRoot = join(scratch, 'second');

  try {
    const first = await exportCuratedTemplates({
      outputRoot: firstRoot,
      niches: ['aromatherapy'],
      limitPerNiche: 2,
    });
    const second = await exportCuratedTemplates({
      outputRoot: secondRoot,
      niches: ['aromatherapy'],
      limitPerNiche: 2,
    });

    assert.equal(first.contractVersion, 2);
    assert.equal(first.templateCount, 2);
    assert.deepEqual(first, second);
    assert.equal(first.countsByNiche.aromatherapy, 2);

    const templateRoot = join(firstRoot, 'aromatherapy', first.templates[0]!.slug);
    const [indexHtml, aboutHtml, contactHtml, fieldsRaw, receiptRaw] = await Promise.all([
      readFile(join(templateRoot, 'index.html'), 'utf-8'),
      readFile(join(templateRoot, 'about.html'), 'utf-8'),
      readFile(join(templateRoot, 'contact.html'), 'utf-8'),
      readFile(join(templateRoot, 'fields.json'), 'utf-8'),
      readFile(join(firstRoot, 'curated-report.json'), 'utf-8'),
    ]);
    const fields = JSON.parse(fieldsRaw) as { fields: Array<{ name: string; default?: string }> };
    const address = fields.fields.find((field) => field.name === 'ADDRESS');

    assert.doesNotMatch(indexHtml, /<section[^>]+class=["'][^"']*testimonial/i);
    assert.match(contactHtml, /<form id="inquiry"/);
    assert.match(contactHtml, /name="email"/);
    assert.match(indexHtml, /\{\{ADDRESS\}\}/);
    assert.doesNotMatch(indexHtml, /\{\{(?:CITY|STATE)\}\}/);
    assert.match(aboutHtml, /\{\{DESCRIPTION\}\}/);
    assert.match(aboutHtml, /\{\{SERVICES\}\}/);
    assert.equal(address?.default, 'Serving the local area');
    assert.deepEqual(JSON.parse(receiptRaw), first);

    await assert.rejects(
      exportCuratedTemplates({
        outputRoot: firstRoot,
        niches: ['aromatherapy'],
        limitPerNiche: 1,
      }),
      /pass --replace/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('all 60 curated templates hydrate internal CTA links to declared pages', { timeout: 60_000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'curated-cta-smoke-'));
  const outputRoot = join(scratch, 'all');

  try {
    const report = await exportCuratedTemplates({ outputRoot });
    assert.equal(report.templateCount, 60);

    let templatesWithCta = 0;
    let pagesWithCta = 0;
    for (const receipt of report.templates) {
      const templateRoot = join(outputRoot, receipt.niche, receipt.slug);
      const [templateRaw, fieldsRaw] = await Promise.all([
        readFile(join(templateRoot, 'template.json'), 'utf-8'),
        readFile(join(templateRoot, 'fields.json'), 'utf-8'),
      ]);
      const template = JSON.parse(templateRaw) as { pages: string[] };
      const fields = JSON.parse(fieldsRaw) as {
        fields: Array<{ name: string; type?: string; default?: string }>;
      };

      assert.equal(template.pages.length, 6, `${receipt.slug} must expose six editable pages`);
      assert.ok(template.pages.includes('contact.html'), `${receipt.slug} must declare contact.html`);

      let templateHasCta = false;
      for (const page of template.pages) {
        const source = await readFile(join(templateRoot, page), 'utf-8');
        if (!source.includes('{{PRIMARY_CTA_URL}}')) continue;

        templateHasCta = true;
        pagesWithCta += 1;
        for (const target of ['/contact.html', 'contact.html']) {
          const hydrated = hydrateTemplate(source, { PRIMARY_CTA_URL: target }, fields.fields);
          assert.ok(
            hydrated.includes(`href="${target}"`) || hydrated.includes(`href='${target}'`),
            `${receipt.slug}/${page} must retain the internal CTA target`,
          );
          assert.doesNotMatch(hydrated, /https:\/\/contact\.html/i);

          const declaredTarget = target.replace(/^\//, '').split(/[?#]/, 1)[0]!;
          assert.ok(
            template.pages.includes(declaredTarget),
            `${receipt.slug}/${page} CTA must resolve to a declared page`,
          );
        }
      }

      assert.ok(templateHasCta, `${receipt.slug} must expose an editable internal CTA`);
      templatesWithCta += 1;
    }

    assert.equal(templatesWithCta, 60);
    assert.equal(pagesWithCta, 60);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

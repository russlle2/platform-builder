import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
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

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assembleTemplate } from './assembler.js';
import { runQA } from './qa.js';

const FOUNDATION = `<!doctype html>
<!-- PAGES: index.html, about.html, services.html, faq.html, book.html -->
<html lang="en">
<head><title>{{PAGE_TITLE}}</title><style>body { color: #222; }</style></head>
<body>
<header><nav>
  <a href="index.html">Home</a><a href="about.html">About</a>
  <a href="services.html">Services</a><a href="faq.html">FAQ</a>
  <a href="book.html">{{CTA_LABEL}}</a>
</nav></header>
<main><h1>{{BUSINESS_NAME}}</h1><p>{{HERO_HEADLINE}}</p>
<p>{{HERO_SUBHEADLINE}}</p><p>{{PRACTITIONER_NAME}}</p>
<p>{{TAGLINE}}</p><a href="mailto:{{EMAIL}}">{{EMAIL}}</a>
<p>{{CITY}}, {{STATE}}</p><p>{{SECTION_1_BODY}}</p></main>
<footer><p>{{BUSINESS_NAME}}</p><p>{{PHONE}}</p></footer>
</body></html>`;

test('assembly retains only declared customer tokens and escapes generated copy', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'template-factory-'));
  const foundationPath = join(scratch, 'foundation.html');
  await writeFile(foundationPath, FOUNDATION, 'utf-8');

  try {
    const outputDir = await assembleTemplate({
      niche: 'aromatherapy',
      foundationPath,
      colorSchemeId: 'original',
      fontVariationId: 'original',
      structureVariationId: 'original',
      outputSlug: 'contract-test',
      outputRoot: join(scratch, 'out'),
      copy: {
        title: 'Calm & Clear',
        metaDescription: 'Specific, thoughtful care.',
        heroHeadline: '<script>alert("no")</script> Feel grounded',
        heroSubheadline: 'Support created for real life.',
        practitionerTagline: 'Evidence-informed, human care',
        ctaLabel: 'Book a conversation',
        sections: [
          { id: 'care', heading: 'Personalized care', body: 'A clear plan.' },
          { id: 'process', heading: 'Our process', body: 'Practical support.' },
        ],
        faq: [
          { q: 'What should I expect?', a: 'A welcoming conversation.' },
          { q: 'How do I begin?', a: 'Choose a time that works.' },
        ],
      },
    });

    const [indexHtml, rawFields, qa] = await Promise.all([
      readFile(join(outputDir, 'index.html'), 'utf-8'),
      readFile(join(outputDir, 'fields.json'), 'utf-8'),
      runQA(outputDir),
    ]);
    const fields = JSON.parse(rawFields) as {
      fields: Array<{ name: string; default?: string }>;
    };

    assert.match(indexHtml, /\{\{BUSINESS_NAME\}\}/);
    assert.match(indexHtml, /\{\{PRACTITIONER_NAME\}\}/);
    assert.doesNotMatch(indexHtml, /\{\{HERO_HEADLINE\}\}/);
    assert.match(indexHtml, /&lt;script&gt;alert\(&quot;no&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(indexHtml, /hello@example\.com|Dr\. Morgan Ellis|\(555\)/i);
    assert.deepEqual(
      fields.fields.map((field) => field.name).sort(),
      [
        'ADDRESS',
        'BUSINESS_NAME',
        'CTA_LABEL',
        'DESCRIPTION',
        'EMAIL',
        'PHONE',
        'PRACTITIONER_NAME',
        'PRIMARY_CTA_URL',
        'SERVICES',
        'TAGLINE',
      ],
    );
    assert.equal(qa.pass, true, qa.errors.join('\n'));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assembleTemplate } from './assembler.js';
import type { CopyJSON } from './copywriter.js';
import { runQA } from './qa.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const foundationsRoot = join(packageRoot, 'foundations');

const fixtureCopy: CopyJSON = {
  title: 'A thoughtful practice',
  metaDescription: 'Practical, personal support for everyday life.',
  heroHeadline: 'Care designed around you',
  heroSubheadline: 'A clear and welcoming way to begin.',
  practitionerTagline: 'Grounded care, thoughtfully delivered',
  ctaLabel: 'Book a conversation',
  sections: [
    { id: 'approach', heading: 'Our approach', body: 'Support shaped around your goals.' },
    { id: 'services', heading: 'Ways we can help', body: 'Choose the care that fits your needs.' },
    { id: 'process', heading: 'What to expect', body: 'A simple path from first call to next step.' },
  ],
  faq: [
    { q: 'How do I start?', a: 'Choose a convenient time to connect.' },
    { q: 'What happens next?', a: 'We will clarify your goals together.' },
    { q: 'Is this personalized?', a: 'Yes. Your plan is shaped around your needs.' },
    { q: 'Can I ask questions first?', a: 'Absolutely. A first conversation is welcome.' },
  ],
};

test('every checked-in foundation assembles into a valid personalized template', { timeout: 30_000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'template-foundations-'));
  const failures: string[] = [];

  try {
    const niches = (await readdir(foundationsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const niche of niches) {
      const files = (await readdir(join(foundationsRoot, niche)))
        .filter((file) => /^foundation-\d+\.html$/.test(file))
        .sort();
      for (const file of files) {
        try {
          const slug = `${niche}-${basename(file, '.html')}`;
          const outputDir = await assembleTemplate({
            niche,
            foundationPath: join(foundationsRoot, niche, file),
            colorSchemeId: 'original',
            fontVariationId: 'original',
            structureVariationId: 'original',
            outputSlug: slug,
            outputRoot: join(scratch, 'out'),
            copy: fixtureCopy,
          });
          const qa = await runQA(outputDir);
          if (!qa.pass) failures.push(`${niche}/${file}: ${qa.errors.join('; ')}`);
        } catch (error) {
          failures.push(
            `${niche}/${file}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    assert.deepEqual(failures, []);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

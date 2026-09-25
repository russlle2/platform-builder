import assert from 'node:assert/strict';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import { createNeutralFallbackFiles } from './fallback.js';
import { verifyStaticArtifact } from './pipeline.js';

test('niche-neutral fallback remains multi-page, editable, and contract safe', () => {
  const files = createNeutralFallbackFiles({
    slug: 'legacy-unrecoverable',
    niche: 'sound_bath',
    pages: ['about.html', 'pricing.html', 'contact.html'],
    reason: 'fixture failure',
  });
  const repaired = repairLegacyTemplate({
    slug: 'legacy-unrecoverable',
    niche: 'sound_bath',
    files,
  });
  const result = verifyStaticArtifact(repaired.files, repaired.fields);
  assert.equal(result.passed, true, result.errors.map((error) => error.detail).join('\n'));
  assert.equal(repaired.manifest.pages.length, 4);
  assert.doesNotMatch(String(repaired.files.get('index.html')), /class="skip-link"[^>]*data-dc-edit-id/);
  assert.match(String(repaired.files.get('pricing.html')), /Contact for current pricing/);
  assert.match(String(repaired.files.get('contact.html')), /name="message"/);
});

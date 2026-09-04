import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeManifest, declaredPagesFromManifest } from './contracts.js';

test('normalizes legacy page objects, roots, slugs, and extensions', () => {
  assert.deepEqual(declaredPagesFromManifest({
    pages: [
      { path: '/' },
      { path: '/services.html' },
      { slug: 'contact.html' },
      { file: './about' },
      { filename: 'nested/faq.htm' },
      { file: 'assets/css/styles.css' },
    ],
  }), [
    'about.html',
    'contact.html',
    'index.html',
    'nested/faq.htm',
    'services.html',
  ]);
});

test('supports observed page aliases and keyed page manifests', () => {
  assert.deepEqual(declaredPagesFromManifest({ pageList: ['/', '/about'] }), ['about.html', 'index.html']);
  assert.deepEqual(declaredPagesFromManifest({ paths: ['/', '/book.html'] }), ['book.html', 'index.html']);
  assert.deepEqual(declaredPagesFromManifest({
    files: ['index.html', 'contact.html', 'assets/css/styles.css', 'assets/js/main.js'],
  }), ['contact.html', 'index.html']);
  assert.deepEqual(declaredPagesFromManifest({
    pages: {
      'index.html': { sections: ['hero'] },
      '/services.html': { sections: ['offers'] },
    },
  }), ['index.html', 'services.html']);
});

test('canonicalizes sectionPack and programModel aliases', () => {
  const csv = canonicalizeManifest({
    name: 'Legacy Coach',
    sectionPack: ' hero, faq, hero, cta ',
    programModel: 'cohort',
  }, {
    slug: 'legacy-coach',
    niche: 'wellness_coach',
    pages: ['/', '/about', 'contact.html'],
  });
  assert.deepEqual(csv.pages, ['about.html', 'contact.html', 'index.html']);
  assert.deepEqual(csv.requiredSections, ['cta', 'faq', 'hero']);
  assert.equal(csv.offerModel, 'cohort');

  const array = canonicalizeManifest({ sectionPack: ['pricing', 'hero'] }, {
    slug: 'legacy-practice',
    niche: 'holistic_medicine',
    pages: [],
  });
  assert.deepEqual(array.requiredSections, ['hero', 'pricing']);
});

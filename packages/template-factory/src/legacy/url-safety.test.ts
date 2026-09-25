import assert from 'node:assert/strict';
import test from 'node:test';
import {
  containsUnsafeCssReferences,
  containsUnsafeSrcset,
  isSafeEmbeddedRasterDataUrl,
  isUnsafeStaticUrl,
  normalizedUrlProbe,
} from './url-safety.js';

test('normalizes controls before bounding the URL scheme probe', () => {
  const padding = '\t'.repeat(300);
  const obfuscated = `${padding}d${padding}a${padding}t${padding}a:text/html,blocked`;
  assert.match(normalizedUrlProbe(obfuscated), /^data:text\/html/);
  assert.equal(isUnsafeStaticUrl('link', 'href', obfuscated), true);
});

test('allows only non-empty base64 raster data in audited image contexts', () => {
  const raster = 'data:image/png;base64,AAAA';
  assert.equal(isSafeEmbeddedRasterDataUrl(raster), true);
  assert.equal(isUnsafeStaticUrl('img', 'src', raster), false);
  assert.equal(isUnsafeStaticUrl('video', 'poster', raster), false);
  assert.equal(isUnsafeStaticUrl('a', 'href', raster), true);
  assert.equal(isUnsafeStaticUrl('img', 'src', 'data:image/svg+xml,<svg/>'), true);
  assert.equal(isUnsafeStaticUrl('img', 'src', 'data:image/png;base64,'), true);
  assert.equal(isUnsafeStaticUrl('img', 'src', 'blob:https://example.test/id'), true);
});

test('rejects embedded candidate sets and CSS imports including escaped schemes', () => {
  assert.equal(containsUnsafeSrcset(`local.webp 1x, ${'\n'.repeat(700)}blob:https://example.test/id 2x`), true);
  assert.equal(containsUnsafeCssReferences('.hero{background:url("data:image/png;base64,AAAA")}'), false);
  assert.equal(containsUnsafeCssReferences('@import url("data:image/png;base64,AAAA");'), true);
  assert.equal(containsUnsafeCssReferences('.hero{background:url("d\\61 ta:text/html,blocked")}'), true);
  assert.equal(containsUnsafeCssReferences('/* url(data:text/html,ignored) */ .hero{background:url(local.webp)}'), false);
});

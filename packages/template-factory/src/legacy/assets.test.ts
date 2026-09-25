import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import {
  AssetVendor,
  assetLicenseManifest,
  readAssetLicenseManifest,
  validateAssetLicenseManifest,
  vendorRemoteAssets,
} from './assets.js';

test('asset vendor rejects unapproved and non-HTTPS origins before network access', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-'));
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    await assert.rejects(() => vendor.get('http://images.unsplash.com/photo-x'), /not approved/);
    await assert.rejects(() => vendor.get('https://example.com/image.jpg'), /not approved/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('asset rewrite leaves ordinary links and data images intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-'));
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const files = new Map<string, string | Uint8Array>([
      ['index.html', '<a href="https://example.com">External</a><img src="data:image/svg+xml,x">'],
    ]);
    const result = await vendorRemoteAssets(files, vendor);
    assert.equal(result.assets.length, 0);
    assert.equal(result.files.get('index.html'), files.get('index.html'));
    assert.match(assetLicenseManifest([]), /"version": 1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('asset rewrite vendors parse5-escaped remote image query strings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-html-entity-'));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(Buffer.from('image-bytes'), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  })) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const source = 'https://images.unsplash.com/photo-entity?w=1200&h=700&q=82';
    const result = await vendorRemoteAssets(new Map([
      ['index.html', `<img src="${source.replace(/&/g, '&amp;')}" alt="">`],
    ]), vendor);
    const html = String(result.files.get('index.html'));
    assert.equal(result.assets.length, 1);
    assert.doesNotMatch(html, /https:\/\//i);
    assert.match(html, /src="assets\/vendor\/[a-f0-9]{64}\.jpg"/i);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('asset vendor refuses a redirect hop that leaves the approved host allowlist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-redirect-'));
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(null, {
      status: 302,
      headers: { location: 'https://unapproved.example/redirected-image.jpg' },
    });
  }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const asset = await vendor.get('https://images.unsplash.com/photo-redirect-test');
    assert.equal(asset.fallback, true);
    assert.equal(requests, 1, 'the unapproved redirect destination must never be requested');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('asset vendor refuses approved-host redirects that cross a license boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-license-redirect-'));
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requests.push(url);
    if (url.startsWith('https://images.unsplash.com/')) {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://fonts.gstatic.com/s/inter/v18/not-an-image.woff2' },
      });
    }
    return new Response(Buffer.from('google-font-bytes'), {
      status: 200,
      headers: { 'content-type': 'font/woff2' },
    });
  }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const asset = await vendor.get('https://images.unsplash.com/photo-license-boundary');
    assert.equal(requests.length, 2);
    assert.equal(asset.fallback, true);
    assert.equal(asset.licenseName, 'DailyClarity first-party generated placeholder');
    assert.match(asset.finalUrl, /^local:\/\/dailyclarity\/generated-asset\//);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('generated fallbacks use truthful first-party provenance and corrupted cache bytes are repaired', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-fallback-'));
  const sourceUrl = 'https://images.unsplash.com/photo-cache-integrity?w=1200';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('offline test'); }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const first = await vendor.get(sourceUrl);
    assert.equal(first.fallback, true);
    assert.equal(first.licenseName, 'DailyClarity first-party generated placeholder');
    assert.equal(first.licenseUrl, 'local://dailyclarity/generated-asset');
    assert.match(first.finalUrl, /^local:\/\/dailyclarity\/generated-asset\/[a-f0-9]{64}\.svg$/);

    const objectPath = join(vendor.objectRoot, first.cacheFilename);
    await writeFile(objectPath, 'corrupted cache bytes');
    const repaired = await vendor.get(sourceUrl);
    const repairedBytes = await readFile(objectPath);
    assert.equal(repaired.sha256, createHash('sha256').update(repairedBytes).digest('hex'));
    assert.equal(repaired.bytes, repairedBytes.byteLength);

    const index = JSON.parse(await readFile(vendor.indexPath, 'utf8')) as {
      assets: Record<string, Record<string, unknown>>;
    };
    index.assets[sourceUrl] = {
      ...index.assets[sourceUrl],
      finalUrl: sourceUrl,
      licenseName: 'Unsplash License',
      licenseUrl: 'https://unsplash.com/license',
    };
    await writeFile(vendor.indexPath, `${JSON.stringify(index, null, 2)}\n`);

    const resumed = new AssetVendor(root);
    await resumed.initialize();
    const normalized = await resumed.get(sourceUrl);
    assert.equal(normalized.fallback, true);
    assert.equal(normalized.licenseName, 'DailyClarity first-party generated placeholder');
    assert.equal(normalized.licenseUrl, 'local://dailyclarity/generated-asset');
    assert.match(normalized.finalUrl, /^local:\/\/dailyclarity\/generated-asset\//);
    const persisted = JSON.parse(await readFile(resumed.indexPath, 'utf8')) as {
      assets: Record<string, { licenseName: string; licenseUrl: string; finalUrl: string }>;
    };
    assert.equal(persisted.assets[sourceUrl]?.licenseName, normalized.licenseName);
    assert.equal(persisted.assets[sourceUrl]?.licenseUrl, normalized.licenseUrl);
    assert.equal(persisted.assets[sourceUrl]?.finalUrl, normalized.finalUrl);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('deterministically sanitized fallback SVGs are re-attested with preserved provenance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-svg-reattest-'));
  const sourceUrl = 'https://images.unsplash.com/photo-svg-reattest?w=1200';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('offline test'); }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const first = await vendorRemoteAssets(new Map<string, string | Uint8Array>([[
      'index.html',
      `<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1><p>Useful introduction copy for the fixture.</p><img src="${sourceUrl}" alt="Practice setting"></main></body></html>`,
    ]]), vendor);
    const originalSvg = first.assets[0];
    assert.ok(originalSvg);
    assert.equal(originalSvg.contentType, 'image/svg+xml');

    const repaired = repairLegacyTemplate({
      slug: 'svg-reattest-fixture',
      niche: 'wellness_coach',
      files: first.files,
    });
    const final = await vendorRemoteAssets(repaired.files, vendor);
    const manifest = readAssetLicenseManifest(final.files);
    const attestedSvg = manifest.find((asset) => asset.sourceUrl === originalSvg.sourceUrl);
    assert.ok(attestedSvg, JSON.stringify({ originalSvg, manifest }, null, 2));
    assert.notEqual(attestedSvg.cacheFilename, originalSvg.cacheFilename, 'SVG sanitation must produce a newly addressed object');
    assert.equal(attestedSvg.licenseName, 'DailyClarity first-party generated placeholder');
    assert.deepEqual(validateAssetLicenseManifest(final.files), []);
    assert.match(String(final.files.get('index.html')), new RegExp(attestedSvg.cacheFilename.replace('.', '\\.')));
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('cached bytes cannot inherit forged source, redirect, or license provenance on resume', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-provenance-'));
  const sourceUrl = 'https://images.unsplash.com/photo-provenance-integrity?w=1200';
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(Buffer.from(`image-bytes-${requests}`), {
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
    });
  }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const first = await vendor.get(sourceUrl);
    assert.equal(first.fallback, false);
    assert.equal(requests, 1);

    const index = JSON.parse(await readFile(vendor.indexPath, 'utf8')) as {
      assets: Record<string, Record<string, unknown>>;
    };
    index.assets[sourceUrl] = {
      ...index.assets[sourceUrl],
      sourceUrl: 'https://fonts.gstatic.com/s/forged/example.woff2',
      finalUrl: 'https://unapproved.example/tracker.jpg',
      licenseName: 'Invented permissive license',
      licenseUrl: 'https://unapproved.example/license',
    };
    await writeFile(vendor.indexPath, `${JSON.stringify(index, null, 2)}\n`);

    const resumed = new AssetVendor(root);
    await resumed.initialize();
    const repaired = await resumed.get(sourceUrl);
    assert.equal(requests, 2, 'invalid provenance must force a fresh approved fetch');
    assert.equal(repaired.sourceUrl, sourceUrl);
    assert.equal(repaired.finalUrl, sourceUrl);
    assert.equal(repaired.licenseName, 'Unsplash License');
    assert.equal(repaired.licenseUrl, 'https://unsplash.com/license');

    const persisted = JSON.parse(await readFile(resumed.indexPath, 'utf8')) as {
      assets: Record<string, Record<string, unknown>>;
    };
    assert.equal(persisted.assets[sourceUrl]?.sourceUrl, sourceUrl);
    assert.equal(persisted.assets[sourceUrl]?.licenseName, 'Unsplash License');

    const forgedManifestFiles = new Map<string, string | Uint8Array>([
      [`assets/vendor/${repaired.cacheFilename}`, await readFile(join(resumed.objectRoot, repaired.cacheFilename))],
      ['.dailyclarity/assets.json', assetLicenseManifest([{
        ...repaired,
        finalUrl: 'https://unapproved.example/tracker.jpg',
        licenseName: 'Invented permissive license',
      }])],
    ]);
    assert.match(validateAssetLicenseManifest(forgedManifestFiles).join('\n'), /manifest is malformed/i);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

test('Google Fonts CSS and its nested font are finally attested after deterministic repair', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-assets-google-fonts-'));
  const originalFetch = globalThis.fetch;
  const stylesheetUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
  const fontUrl = 'https://fonts.gstatic.com/s/inter/v18/example.woff2';
  const fontBytes = Buffer.from('fixture-woff2-bytes');
  globalThis.fetch = (async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === stylesheetUrl.replace(/ /g, '%20')) {
      return new Response(`@font-face{font-family:'Inter';font-style:normal;font-weight:400;src:url(${fontUrl}) format('woff2')}`, {
        status: 200,
        headers: { 'content-type': 'text/css; charset=utf-8' },
      });
    }
    if (url === fontUrl) {
      return new Response(fontBytes, { status: 200, headers: { 'content-type': 'font/woff2' } });
    }
    throw new Error(`Unexpected fixture URL: ${url}`);
  }) as typeof fetch;
  try {
    const vendor = new AssetVendor(root);
    await vendor.initialize();
    const first = await vendorRemoteAssets(new Map([[
      'index.html',
      `<!doctype html><html lang="en"><head><title>Font fixture</title><link rel="stylesheet" href="${stylesheetUrl}"></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>A practical introduction long enough for safe publication.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`,
    ]]), vendor);
    const repaired = repairLegacyTemplate({
      slug: 'google-font-fixture',
      niche: 'wellness_coach',
      files: first.files,
    });
    const final = await vendorRemoteAssets(repaired.files, vendor);
    const manifest = readAssetLicenseManifest(final.files);

    assert.deepEqual(validateAssetLicenseManifest(final.files), []);
    assert.equal(manifest.length, 2, JSON.stringify(manifest, null, 2));
    assert.deepEqual(new Set(manifest.map((asset) => asset.sourceUrl)), new Set([stylesheetUrl, fontUrl]));
    assert.ok(manifest.every((asset) => asset.licenseName === 'Google Fonts / upstream font license'));
    assert.ok(manifest.every((asset) => !('author' in asset)), 'unknown font authors must not be invented');
    for (const asset of manifest) {
      const emitted = final.files.get(`assets/vendor/${asset.cacheFilename}`);
      assert.ok(emitted !== undefined);
      const bytes = typeof emitted === 'string' ? Buffer.from(emitted) : Buffer.from(emitted);
      assert.equal(asset.bytes, bytes.byteLength);
      assert.equal(asset.sha256, createHash('sha256').update(bytes).digest('hex'));
      assert.ok(asset.cacheFilename.startsWith(`${asset.sha256}.`));
    }
    const stylesheet = manifest.find((asset) => asset.sourceUrl === stylesheetUrl)!;
    const font = manifest.find((asset) => asset.sourceUrl === fontUrl)!;
    assert.match(String(final.files.get('index.html')), new RegExp(`assets/vendor/${stylesheet.cacheFilename.replace('.', '\\.')}`));
    assert.match(String(final.files.get(`assets/vendor/${stylesheet.cacheFilename}`)), new RegExp(font.cacheFilename.replace('.', '\\.')));
    final.files.set(`assets/vendor/${font.cacheFilename}`, Buffer.from('tampered-font'));
    assert.match(validateAssetLicenseManifest(final.files).join('\n'), /does not match emitted bytes/);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});

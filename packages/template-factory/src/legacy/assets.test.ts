import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { AssetVendor, assetLicenseManifest, vendorRemoteAssets } from './assets.js';

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

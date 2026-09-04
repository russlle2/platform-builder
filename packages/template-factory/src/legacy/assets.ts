import { createHash } from 'node:crypto';
import { copyFile, link, lstat, mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { dirname, extname, join, posix, relative } from 'node:path';
import { durableAtomicWriteFile } from './config.js';

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_APPROVED_REDIRECTS = 5;
const GENERATED_ASSET_ORIGIN = 'local://dailyclarity/generated-asset';
const GENERATED_ASSET_LICENSE = 'DailyClarity first-party generated placeholder';
const APPROVED_HOSTS = new Set([
  'images.unsplash.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

export interface VendedAsset {
  sourceUrl: string;
  finalUrl: string;
  sha256: string;
  bytes: number;
  contentType: string;
  cacheFilename: string;
  retrievedAt: string;
  licenseName: string;
  licenseUrl: string;
  fallback: boolean;
}

interface AssetIndex {
  version: 1;
  assets: Record<string, VendedAsset>;
}

export interface VendorResult {
  files: Map<string, string | Uint8Array>;
  assets: VendedAsset[];
  warnings: string[];
}

export interface AssetLicenseManifestDocument {
  version: 1;
  assets: VendedAsset[];
}

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function bytesOf(value: string | Uint8Array): Buffer {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
}

function vendorPath(filename: string): string | null {
  const normalized = filename.replace(/\\/g, '/');
  return /^assets\/vendor\/[A-Za-z0-9._-]+$/.test(normalized) ? normalized : null;
}

function assetIdentity(asset: VendedAsset): string {
  return `${asset.cacheFilename}\0${asset.sourceUrl}\0${asset.finalUrl}`;
}

function assertApprovedUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !APPROVED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`Remote asset host is not approved: ${url.origin}`);
  }
  if (url.username || url.password) throw new Error('Remote asset URL must not contain credentials');
  return url;
}

function licenseFor(url: URL): Pick<VendedAsset, 'licenseName' | 'licenseUrl'> {
  if (url.hostname === 'images.unsplash.com') {
    return {
      licenseName: 'Unsplash License',
      licenseUrl: 'https://unsplash.com/license',
    };
  }
  return {
    licenseName: 'Google Fonts / upstream font license',
    licenseUrl: 'https://fonts.google.com/attribution',
  };
}

function sharesLicensePolicy(left: URL, right: URL): boolean {
  const leftLicense = licenseFor(left);
  const rightLicense = licenseFor(right);
  return leftLicense.licenseName === rightLicense.licenseName
    && leftLicense.licenseUrl === rightLicense.licenseUrl;
}

function truthfulFallbackRecord(record: VendedAsset): VendedAsset {
  if (!record.fallback) return record;
  return {
    ...record,
    finalUrl: `${GENERATED_ASSET_ORIGIN}/${record.cacheFilename}`,
    licenseName: GENERATED_ASSET_LICENSE,
    licenseUrl: GENERATED_ASSET_ORIGIN,
  };
}

function assetProvenanceMatchesPolicy(asset: VendedAsset): boolean {
  if (asset.fallback) {
    let source: URL;
    try {
      source = new URL(asset.sourceUrl);
    } catch {
      return false;
    }
    return source.protocol === 'https:'
      && !source.username
      && !source.password
      && asset.finalUrl === `${GENERATED_ASSET_ORIGIN}/${asset.cacheFilename}`
      && asset.licenseName === GENERATED_ASSET_LICENSE
      && asset.licenseUrl === GENERATED_ASSET_ORIGIN;
  }

  try {
    const source = assertApprovedUrl(asset.sourceUrl);
    const final = assertApprovedUrl(asset.finalUrl);
    const expectedLicense = licenseFor(source);
    return source.toString() === asset.sourceUrl
      && sharesLicensePolicy(source, final)
      && asset.licenseName === expectedLicense.licenseName
      && asset.licenseUrl === expectedLicense.licenseUrl;
  } catch {
    return false;
  }
}

function indexedAssetForKey(key: string, value: unknown): VendedAsset | null {
  if (!isVendedAssetShape(value)) return null;
  const corrected = truthfulFallbackRecord(value);
  // The URL key is the request identity. A byte-valid object stored under a
  // different source URL must never be allowed to inherit that source's
  // license attestation after a damaged or tampered resume.
  if (corrected.sourceUrl !== key || !assetProvenanceMatchesPolicy(corrected)) return null;
  return corrected;
}

async function fetchApprovedAsset(
  initial: URL,
  init: Omit<RequestInit, 'redirect'>,
): Promise<{ response: Response; finalUrl: URL }> {
  let current = assertApprovedUrl(initial.toString());
  for (let redirect = 0; redirect <= MAX_APPROVED_REDIRECTS; redirect += 1) {
    const response = await fetch(current, { ...init, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) {
      const responseUrl = response.url ? assertApprovedUrl(response.url) : current;
      return { response, finalUrl: responseUrl };
    }
    if (redirect === MAX_APPROVED_REDIRECTS) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Asset exceeded ${MAX_APPROVED_REDIRECTS} approved redirects`);
    }
    const location = response.headers.get('location');
    await response.body?.cancel().catch(() => undefined);
    if (!location) throw new Error(`Asset redirect HTTP ${response.status} has no location`);
    current = assertApprovedUrl(new URL(location, current).toString());
  }
  throw new Error('Asset redirect handling reached an unreachable state');
}

async function cachedAssetMatches(objectRoot: string, asset: VendedAsset): Promise<boolean> {
  if (
    !/^[a-f0-9]{64}\.[a-z0-9]{1,6}$/.test(asset.cacheFilename)
    || !asset.cacheFilename.startsWith(`${asset.sha256}.`)
    || !/^[a-f0-9]{64}$/.test(asset.sha256)
    || !Number.isSafeInteger(asset.bytes)
    || asset.bytes < 0
  ) return false;
  const location = join(objectRoot, asset.cacheFilename);
  const details = await lstat(location).catch(() => null);
  if (!details?.isFile() || details.isSymbolicLink() || details.size !== asset.bytes) return false;
  return hash(await readFile(location)) === asset.sha256;
}

async function writeContentAddressedObject(path: string, body: Buffer, digest: string): Promise<void> {
  const existing = await lstat(path).catch(() => null);
  if (existing?.isFile() && !existing.isSymbolicLink()) {
    const bytes = await readFile(path);
    if (bytes.byteLength === body.byteLength && hash(bytes) === digest) return;
    await unlink(path);
  } else if (existing) {
    if (existing.isSymbolicLink()) await unlink(path);
    else throw new Error(`Asset cache object path is not a regular file: ${path}`);
  }
  await durableAtomicWriteFile(path, body);
  const written = await readFile(path);
  if (written.byteLength !== body.byteLength || hash(written) !== digest) {
    throw new Error(`Asset cache object digest mismatch after write: ${digest}`);
  }
}

function extensionFor(contentType: string, url: URL): string {
  const type = contentType.split(';')[0]!.trim().toLowerCase();
  const byType: Record<string, string> = {
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'font/otf': '.otf',
    'font/ttf': '.ttf',
    'font/woff': '.woff',
    'font/woff2': '.woff2',
    'application/font-woff': '.woff',
    'text/css': '.css',
  };
  const fromType = byType[type];
  if (fromType) return fromType;
  const fromPath = extname(url.pathname).toLowerCase();
  return /^\.[a-z0-9]{1,6}$/.test(fromPath) ? fromPath : '.bin';
}

function neutralSvg(sourceUrl: string): Buffer {
  const seed = hash(sourceUrl);
  const first = `#${seed.slice(0, 6)}`;
  const second = `#${seed.slice(6, 12)}`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="Calm abstract wellness background"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="1250" cy="210" r="330" fill="#fff" opacity=".16"/><circle cx="330" cy="820" r="430" fill="#fff" opacity=".12"/></svg>`,
    'utf8',
  );
}

async function linkOrCopy(source: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const existing = await stat(target).catch(() => null);
  if (existing?.isFile()) return;
  try {
    await link(source, target);
  } catch {
    await copyFile(source, target);
  }
}

function collectRemoteAssetUrls(filename: string, text: string): string[] {
  const urls = new Set<string>();
  const add = (candidate: string): void => {
    const cleaned = candidate.trim().replace(/&amp;/g, '&');
    if (!/^https:\/\//i.test(cleaned)) return;
    try {
      // Collection is intentionally broader than the download allowlist.
      // Unapproved sources are replaced by a generated local asset without
      // making a network request.
      new URL(cleaned);
      urls.add(cleaned);
    } catch {
      // Malformed URLs are handled by the static contract instead of fetched.
    }
  };

  if (/\.css$/i.test(filename)) {
    for (const match of text.matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/gi)) add(match[2]!);
    for (const match of text.matchAll(/@import\s+(?:url\()?\s*(['"])(https:\/\/[^'"]+)\1\s*\)?/gi)) add(match[2]!);
  } else if (/\.html?$/i.test(filename)) {
    for (const match of text.matchAll(/\b(?:src|poster)\s*=\s*(['"])(https:\/\/[^'"]+)\1/gi)) add(match[2]!);
    for (const match of text.matchAll(/<link\b[^>]*\brel\s*=\s*(['"])[^'"]*stylesheet[^'"]*\1[^>]*\bhref\s*=\s*(['"])(https:\/\/[^'"]+)\2/gi)) add(match[3]!);
    for (const match of text.matchAll(/<link\b[^>]*\bhref\s*=\s*(['"])(https:\/\/[^'"]+)\1[^>]*\brel\s*=\s*(['"])[^'"]*stylesheet[^'"]*\3/gi)) add(match[2]!);
    for (const match of text.matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/gi)) add(match[2]!);
  }
  return [...urls];
}

export class AssetVendor {
  readonly cacheRoot: string;
  readonly objectRoot: string;
  readonly indexPath: string;
  #index: AssetIndex = { version: 1, assets: {} };
  #pending = new Map<string, Promise<VendedAsset>>();
  #saveQueue: Promise<void> = Promise.resolve();

  constructor(cacheRoot: string) {
    this.cacheRoot = cacheRoot;
    this.objectRoot = join(cacheRoot, 'objects');
    this.indexPath = join(cacheRoot, 'index.json');
  }

  async initialize(): Promise<void> {
    await mkdir(this.objectRoot, { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.indexPath, 'utf8')) as AssetIndex;
      if (parsed?.version === 1 && parsed.assets && typeof parsed.assets === 'object') {
        this.#index = parsed;
        let normalized = false;
        for (const [key, value] of Object.entries(this.#index.assets)) {
          const corrected = indexedAssetForKey(key, value);
          if (!corrected) {
            delete this.#index.assets[key];
            normalized = true;
            continue;
          }
          if (
            corrected.finalUrl !== value.finalUrl
            || corrected.licenseName !== value.licenseName
            || corrected.licenseUrl !== value.licenseUrl
          ) {
            this.#index.assets[key] = corrected;
            normalized = true;
          }
        }
        if (normalized) await this.#saveIndex();
      }
    } catch {
      this.#index = { version: 1, assets: {} };
    }
  }

  async #saveIndex(): Promise<void> {
    const save = this.#saveQueue.then(async () => {
      const ordered: AssetIndex = {
        version: 1,
        assets: Object.fromEntries(Object.entries(this.#index.assets).sort(([a], [b]) => a.localeCompare(b))),
      };
      await durableAtomicWriteFile(this.indexPath, `${JSON.stringify(ordered, null, 2)}\n`);
    });
    this.#saveQueue = save.catch(() => undefined);
    await save;
  }

  async get(sourceUrl: string): Promise<VendedAsset> {
    const normalized = assertApprovedUrl(sourceUrl).toString();
    const cached = indexedAssetForKey(normalized, this.#index.assets[normalized]);
    if (cached && await cachedAssetMatches(this.objectRoot, cached)) return cached;

    const inFlight = this.#pending.get(normalized);
    if (inFlight) return inFlight;
    const operation = this.#fetch(normalized).finally(() => this.#pending.delete(normalized));
    this.#pending.set(normalized, operation);
    return operation;
  }

  async fallback(sourceUrl: string, kind: 'image' | 'stylesheet' = 'image'): Promise<VendedAsset> {
    const cached = indexedAssetForKey(sourceUrl, this.#index.assets[sourceUrl]);
    if (cached?.fallback && await cachedAssetMatches(this.objectRoot, cached)) {
      return cached;
    }
    const body = kind === 'stylesheet'
      ? Buffer.from('/* Unapproved remote stylesheet removed; system fonts are used. */\n', 'utf8')
      : neutralSvg(sourceUrl);
    const contentType = kind === 'stylesheet' ? 'text/css' : 'image/svg+xml';
    const digest = hash(body);
    const cacheFilename = `${digest}${kind === 'stylesheet' ? '.css' : '.svg'}`;
    await writeContentAddressedObject(join(this.objectRoot, cacheFilename), body, digest);
    const record = truthfulFallbackRecord({
      sourceUrl,
      finalUrl: `${GENERATED_ASSET_ORIGIN}/${cacheFilename}`,
      sha256: digest,
      bytes: body.byteLength,
      contentType,
      cacheFilename,
      retrievedAt: new Date().toISOString(),
      licenseName: GENERATED_ASSET_LICENSE,
      licenseUrl: GENERATED_ASSET_ORIGIN,
      fallback: true,
    });
    this.#index.assets[sourceUrl] = record;
    await this.#saveIndex();
    return record;
  }

  async #fetch(sourceUrl: string): Promise<VendedAsset> {
    const requested = assertApprovedUrl(sourceUrl);
    let body: Buffer;
    let contentType = '';
    let finalUrl = requested.toString();
    let fallback = false;

    try {
      const fetched = await fetchApprovedAsset(requested, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'DailyClarity-Template-Rehab/1.0 (+asset-vendoring)',
          Accept: requested.hostname === 'fonts.googleapis.com'
            ? 'text/css,*/*;q=0.1'
          : 'image/avif,image/webp,image/*,*/*;q=0.1',
        },
      });
      const { response, finalUrl: approvedFinalUrl } = fetched;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!sharesLicensePolicy(requested, approvedFinalUrl)) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error('Asset redirect crossed a provenance/license policy boundary');
      }
      finalUrl = approvedFinalUrl.toString();
      contentType = response.headers.get('content-type') ?? 'application/octet-stream';
      const announcedSize = Number(response.headers.get('content-length') ?? '0');
      if (announcedSize > MAX_ASSET_BYTES) throw new Error(`Asset is larger than ${MAX_ASSET_BYTES} bytes`);
      body = Buffer.from(await response.arrayBuffer());
      if (body.byteLength > MAX_ASSET_BYTES) throw new Error(`Asset is larger than ${MAX_ASSET_BYTES} bytes`);
      if (body.byteLength === 0) throw new Error('Asset response was empty');
    } catch (error) {
      fallback = true;
      if (requested.hostname === 'fonts.googleapis.com' || requested.hostname === 'fonts.gstatic.com') {
        body = Buffer.from('/* Remote font unavailable; system font fallback is intentional. */\n', 'utf8');
        contentType = 'text/css';
      } else {
        body = neutralSvg(sourceUrl);
        contentType = 'image/svg+xml';
      }
      finalUrl = requested.toString();
      void error;
    }

    // A Google Fonts stylesheet contains additional approved font resources.
    // Vendor those before hashing so the cached CSS is completely offline.
    if (contentType.toLowerCase().startsWith('text/css') && !fallback) {
      let css = body.toString('utf8');
      const nested = [...new Set([...css.matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/gi)]
        .map((match) => match[2]!))];
      for (const nestedUrl of nested) {
        const asset = await this.get(nestedUrl);
        css = css.split(nestedUrl).join(asset.cacheFilename);
      }
      body = Buffer.from(css, 'utf8');
    }

    const digest = hash(body);
    const extension = extensionFor(contentType, new URL(finalUrl));
    const cacheFilename = `${digest}${extension}`;
    const objectPath = join(this.objectRoot, cacheFilename);
    await writeContentAddressedObject(objectPath, body, digest);
    const license = fallback
      ? { licenseName: GENERATED_ASSET_LICENSE, licenseUrl: GENERATED_ASSET_ORIGIN }
      : licenseFor(requested);
    const record: VendedAsset = {
      sourceUrl,
      finalUrl: fallback ? `${GENERATED_ASSET_ORIGIN}/${cacheFilename}` : finalUrl,
      sha256: digest,
      bytes: body.byteLength,
      contentType,
      cacheFilename,
      retrievedAt: new Date().toISOString(),
      ...license,
      fallback,
    };
    this.#index.assets[sourceUrl] = record;
    this.#index.assets[requested.toString()] = record;
    await this.#saveIndex();
    return record;
  }

  /** Return every trustworthy origin record that produced one cache object. */
  async recordsForCacheFilename(cacheFilename: string): Promise<VendedAsset[]> {
    if (!/^[a-f0-9]{64}\.[a-z0-9]{1,6}$/.test(cacheFilename)) return [];
    const records = new Map<string, VendedAsset>();
    for (const [key, value] of Object.entries(this.#index.assets)) {
      const normalized = indexedAssetForKey(key, value);
      if (!normalized || normalized.cacheFilename !== cacheFilename) continue;
      if (await cachedAssetMatches(this.objectRoot, normalized)) {
        records.set(assetIdentity(normalized), normalized);
      }
    }
    return [...records.values()].sort((left, right) => assetIdentity(left).localeCompare(assetIdentity(right)));
  }

  async materialize(asset: VendedAsset, target: string): Promise<void> {
    await linkOrCopy(join(this.objectRoot, asset.cacheFilename), target);
  }
}

function isVendedAssetShape(value: unknown): value is VendedAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sourceUrl === 'string' && candidate.sourceUrl.length > 0
    && typeof candidate.finalUrl === 'string' && candidate.finalUrl.length > 0
    && typeof candidate.sha256 === 'string'
    && typeof candidate.bytes === 'number'
    && typeof candidate.contentType === 'string' && candidate.contentType.length > 0
    && typeof candidate.cacheFilename === 'string'
    && typeof candidate.retrievedAt === 'string' && candidate.retrievedAt.length > 0
    && typeof candidate.licenseName === 'string' && candidate.licenseName.length > 0
    && typeof candidate.licenseUrl === 'string' && candidate.licenseUrl.length > 0
    && typeof candidate.fallback === 'boolean';
}

function isVendedAsset(value: unknown): value is VendedAsset {
  return isVendedAssetShape(value) && assetProvenanceMatchesPolicy(value);
}

export function readAssetLicenseManifest(
  files: ReadonlyMap<string, string | Uint8Array>,
): VendedAsset[] {
  const raw = files.get('.dailyclarity/assets.json');
  if (raw === undefined) return [];
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const document = parsed as Partial<AssetLicenseManifestDocument>;
    if (document.version !== 1 || !Array.isArray(document.assets) || !document.assets.every(isVendedAsset)) return [];
    return document.assets;
  } catch {
    return [];
  }
}

/**
 * Reconcile final emitted vendor bytes with their content-addressed names and
 * provenance. Only text/css may be renamed after a mechanical rewrite;
 * changed binary bytes are rejected rather than attributed to their source.
 */
export function reconcileAssetLicenseManifest(
  inputFiles: ReadonlyMap<string, string | Uint8Array>,
  provenance: readonly VendedAsset[],
): { files: Map<string, string | Uint8Array>; assets: VendedAsset[] } {
  const files = new Map(inputFiles);
  const lineage = new Map<string, VendedAsset[]>();
  for (const asset of provenance) {
    if (!isVendedAsset(asset)) continue;
    const path = `assets/vendor/${asset.cacheFilename}`;
    const records = lineage.get(path) ?? [];
    if (!records.some((record) => assetIdentity(record) === assetIdentity(asset))) records.push(asset);
    lineage.set(path, records);
  }

  const maximumPasses = Math.max(2, [...files.keys()].filter((path) => vendorPath(path)).length * 2 + 2);
  let stabilized = false;
  for (let pass = 0; pass < maximumPasses; pass += 1) {
    const renames = new Map<string, string>();
    for (const [rawPath, value] of files) {
      const path = vendorPath(rawPath);
      if (!path) continue;
      const digest = hash(bytesOf(value));
      const extension = extname(path).toLowerCase();
      if (!/^\.[a-z0-9]{1,6}$/.test(extension)) {
        throw new Error(`Vended asset has an unsafe extension: ${path}`);
      }
      const expected = `${posix.dirname(path)}/${digest}${extension}`;
      if (expected === path) continue;
      const records = lineage.get(path) ?? [];
      if (records.length === 0) throw new Error(`Vended asset has no trustworthy provenance: ${path}`);
      if (!records.every((record) => record.contentType.toLowerCase().startsWith('text/css')) || extension !== '.css') {
        throw new Error(`Refusing to re-attest modified binary vendor bytes: ${path}`);
      }
      renames.set(path, expected);
    }
    if (renames.size === 0) {
      stabilized = true;
      break;
    }

    for (const [from, to] of renames) {
      const value = files.get(from);
      if (value === undefined) throw new Error(`Vended asset disappeared during reconciliation: ${from}`);
      const collision = files.get(to);
      if (collision !== undefined && !bytesOf(collision).equals(bytesOf(value))) {
        throw new Error(`Content-addressed vendor asset collision: ${to}`);
      }
      files.delete(from);
      files.set(to, value);
      const combined = [...(lineage.get(to) ?? []), ...(lineage.get(from) ?? [])];
      lineage.delete(from);
      lineage.set(to, [...new Map(combined.map((record) => [assetIdentity(record), record])).values()]);
    }

    // Repoint every serialized reference, including design/preset sidecars.
    // Cache basenames are SHA-256 based and therefore unambiguous in the tree.
    for (const [path, value] of files) {
      if (typeof value !== 'string') continue;
      let rewritten = value;
      for (const [from, to] of renames) {
        rewritten = rewritten.split(posix.basename(from)).join(posix.basename(to));
      }
      if (rewritten !== value) files.set(path, rewritten);
    }
  }
  if (!stabilized) throw new Error('Vended stylesheet references did not stabilize during content-address reconciliation');

  const attested = new Map<string, VendedAsset>();
  for (const [rawPath, value] of files) {
    const path = vendorPath(rawPath);
    if (!path) continue;
    const records = lineage.get(path) ?? [];
    if (records.length === 0) throw new Error(`Vended asset has no trustworthy origin/license metadata: ${path}`);
    const bytes = bytesOf(value);
    const digest = hash(bytes);
    const cacheFilename = posix.basename(path);
    if (!cacheFilename.startsWith(`${digest}.`)) {
      throw new Error(`Vended asset filename does not attest its final bytes: ${path}`);
    }
    for (const record of records) {
      const updated: VendedAsset = {
        ...record,
        sha256: digest,
        bytes: bytes.byteLength,
        cacheFilename,
      };
      attested.set(assetIdentity(updated), updated);
    }
  }
  const assets = [...attested.values()].sort((left, right) => assetIdentity(left).localeCompare(assetIdentity(right)));
  files.set('.dailyclarity/assets.json', assetLicenseManifest(assets));
  return { files, assets };
}

/** Independently validate the emitted manifest against the final file bytes. */
export function validateAssetLicenseManifest(
  files: ReadonlyMap<string, string | Uint8Array>,
): string[] {
  const errors: string[] = [];
  const paths = [...files.keys()].map((path) => vendorPath(path)).filter((path): path is string => Boolean(path)).sort();
  const raw = files.get('.dailyclarity/assets.json');
  if (raw === undefined) return paths.length > 0 ? ['assets/vendor files exist without .dailyclarity/assets.json'] : [];
  const assets = readAssetLicenseManifest(files);
  if (assets.length === 0) {
    try {
      const parsed = JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')) as AssetLicenseManifestDocument;
      if (parsed.version !== 1 || !Array.isArray(parsed.assets) || parsed.assets.length !== 0) {
        errors.push('asset license manifest is malformed');
      }
    } catch {
      errors.push('asset license manifest is malformed');
    }
  }

  const covered = new Set<string>();
  const identities = new Set<string>();
  for (const asset of assets) {
    const identity = assetIdentity(asset);
    if (identities.has(identity)) errors.push(`asset manifest repeats provenance for ${asset.cacheFilename}`);
    identities.add(identity);
    if (!/^[a-f0-9]{64}\.[a-z0-9]{1,6}$/.test(asset.cacheFilename)) {
      errors.push(`asset manifest has an unsafe cache filename: ${asset.cacheFilename}`);
      continue;
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || !asset.cacheFilename.startsWith(`${asset.sha256}.`)) {
      errors.push(`asset manifest filename/hash mismatch: ${asset.cacheFilename}`);
    }
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 0) {
      errors.push(`asset manifest has an invalid byte count: ${asset.cacheFilename}`);
    }
    const path = `assets/vendor/${asset.cacheFilename}`;
    const value = files.get(path);
    if (value === undefined) {
      errors.push(`asset manifest references a missing emitted file: ${path}`);
      continue;
    }
    const bytes = bytesOf(value);
    if (bytes.byteLength !== asset.bytes || hash(bytes) !== asset.sha256) {
      errors.push(`asset manifest does not match emitted bytes: ${path}`);
    }
    covered.add(path);
  }
  for (const path of paths) {
    if (!covered.has(path)) errors.push(`emitted vendor asset lacks origin/license metadata: ${path}`);
  }
  return [...new Set(errors)].sort();
}

export async function vendorRemoteAssets(
  inputFiles: ReadonlyMap<string, string | Uint8Array>,
  vendor: AssetVendor,
): Promise<VendorResult> {
  const files = new Map(inputFiles);
  const referenced = new Map<string, VendedAsset>();
  const warnings: string[] = [];

  for (const [filename, content] of inputFiles) {
    if (!/\.(?:html?|css)$/i.test(filename) || typeof content !== 'string') continue;
    for (const url of collectRemoteAssetUrls(filename, content)) {
      try {
        referenced.set(url, await vendor.get(url));
      } catch (error) {
        const stylesheet = /fonts\.googleapis\.com/i.test(url)
          || new RegExp(`<link\\b[^>]*href=["'][^"']*${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(content);
        const replacement = await vendor.fallback(url, stylesheet ? 'stylesheet' : 'image');
        referenced.set(url, replacement);
        warnings.push(`${filename}: replaced unapproved or unavailable remote asset ${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  for (const [filename, content] of inputFiles) {
    if (!/\.(?:html?|css)$/i.test(filename) || typeof content !== 'string') continue;
    let rewritten = content;
    for (const [url, asset] of referenced) {
      const fromDir = posix.dirname(filename.replace(/\\/g, '/'));
      const destination = `assets/vendor/${asset.cacheFilename}`;
      const localReference = posix.relative(fromDir === '.' ? '' : fromDir, destination) || posix.basename(destination);
      rewritten = rewritten.split(url).join(localReference);
      // parse5 serializes query separators in HTML attributes as `&amp;`.
      // Collection intentionally normalizes that entity before URL validation,
      // so replacement must cover the serialized spelling as well or the
      // verified foundation-alignment path would leave a remote dependency.
      if (/\.html?$/i.test(filename) && url.includes('&')) {
        rewritten = rewritten.split(url.replace(/&/g, '&amp;')).join(localReference);
      }
    }
    files.set(filename, rewritten);
  }

  const provenance = new Map<string, VendedAsset>();
  for (const asset of new Set(referenced.values())) {
    provenance.set(assetIdentity(asset), asset);
    const assetBytes = await readFile(join(vendor.objectRoot, asset.cacheFilename));
    files.set(`assets/vendor/${asset.cacheFilename}`, assetBytes);
    if (asset.contentType.toLowerCase().startsWith('text/css')) {
      const dependencyNames = [...assetBytes.toString('utf8').matchAll(/url\(\s*(['"]?)([a-f0-9]{64}\.[a-z0-9]{1,6})\1\s*\)/gi)]
        .map((match) => match[2]!);
      for (const dependencyName of new Set(dependencyNames)) {
        const dependencyRecords = await vendor.recordsForCacheFilename(dependencyName);
        if (dependencyRecords.length === 0) {
          throw new Error(`Vended stylesheet dependency has no trustworthy provenance: ${dependencyName}`);
        }
        for (const dependency of dependencyRecords) provenance.set(assetIdentity(dependency), dependency);
        files.set(
          `assets/vendor/${dependencyName}`,
          await readFile(join(vendor.objectRoot, dependencyName)),
        );
      }
    }
  }

  // A second vendoring pass runs after deterministic HTML/CSS repair. Recover
  // the cache-backed provenance for every already-local vendor object so the
  // final attestation covers transitive font files as well as top-level URLs.
  for (const filename of files.keys()) {
    const path = vendorPath(filename);
    if (!path) continue;
    const records = await vendor.recordsForCacheFilename(posix.basename(path));
    if (records.length === 0) {
      throw new Error(`Emitted vendor asset is not backed by the audited cache: ${path}`);
    }
    for (const record of records) provenance.set(assetIdentity(record), record);
  }

  const reconciled = reconcileAssetLicenseManifest(files, [...provenance.values()]);
  return { ...reconciled, warnings };
}

export function assetLicenseManifest(assets: readonly VendedAsset[]): string {
  return `${JSON.stringify({
    version: 1,
    assets: [...assets].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl)),
  }, null, 2)}\n`;
}

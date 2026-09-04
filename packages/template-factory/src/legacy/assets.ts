import { createHash, randomUUID } from 'node:crypto';
import { copyFile, link, lstat, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, posix, relative } from 'node:path';

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
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

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
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

function truthfulFallbackRecord(record: VendedAsset): VendedAsset {
  if (!record.fallback) return record;
  return {
    ...record,
    finalUrl: `${GENERATED_ASSET_ORIGIN}/${record.cacheFilename}`,
    licenseName: GENERATED_ASSET_LICENSE,
    licenseUrl: GENERATED_ASSET_ORIGIN,
  };
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
  await atomicWrite(path, body);
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

async function atomicWrite(path: string, data: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, data, { flag: 'wx' });
  try {
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    const existing = await stat(path).catch(() => null);
    if (!existing?.isFile()) throw error;
  }
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
          if (!value || typeof value !== 'object' || !value.fallback) continue;
          const corrected = truthfulFallbackRecord(value);
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
      await atomicWrite(this.indexPath, `${JSON.stringify(ordered, null, 2)}\n`);
    });
    this.#saveQueue = save.catch(() => undefined);
    await save;
  }

  async get(sourceUrl: string): Promise<VendedAsset> {
    const normalized = assertApprovedUrl(sourceUrl).toString();
    const cached = this.#index.assets[normalized];
    if (cached && await cachedAssetMatches(this.objectRoot, cached)) return truthfulFallbackRecord(cached);

    const inFlight = this.#pending.get(normalized);
    if (inFlight) return inFlight;
    const operation = this.#fetch(normalized).finally(() => this.#pending.delete(normalized));
    this.#pending.set(normalized, operation);
    return operation;
  }

  async fallback(sourceUrl: string, kind: 'image' | 'stylesheet' = 'image'): Promise<VendedAsset> {
    const cached = this.#index.assets[sourceUrl];
    if (cached?.fallback && await cachedAssetMatches(this.objectRoot, cached)) {
      return truthfulFallbackRecord(cached);
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
      const response = await fetch(requested, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'DailyClarity-Template-Rehab/1.0 (+asset-vendoring)',
          Accept: requested.hostname === 'fonts.googleapis.com'
            ? 'text/css,*/*;q=0.1'
            : 'image/avif,image/webp,image/*,*/*;q=0.1',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const final = assertApprovedUrl(response.url);
      finalUrl = final.toString();
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

  async materialize(asset: VendedAsset, target: string): Promise<void> {
    await linkOrCopy(join(this.objectRoot, asset.cacheFilename), target);
  }
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
    }
    files.set(filename, rewritten);
  }

  for (const asset of new Set(referenced.values())) {
    const assetBytes = await readFile(join(vendor.objectRoot, asset.cacheFilename));
    files.set(`assets/vendor/${asset.cacheFilename}`, assetBytes);
    if (asset.contentType.toLowerCase().startsWith('text/css')) {
      const dependencyNames = [...assetBytes.toString('utf8').matchAll(/url\(\s*(['"]?)([a-f0-9]{64}\.[a-z0-9]{1,6})\1\s*\)/gi)]
        .map((match) => match[2]!);
      for (const dependencyName of new Set(dependencyNames)) {
        files.set(
          `assets/vendor/${dependencyName}`,
          await readFile(join(vendor.objectRoot, dependencyName)),
        );
      }
    }
  }

  return { files, assets: [...new Set(referenced.values())], warnings };
}

export function assetLicenseManifest(assets: readonly VendedAsset[]): string {
  return `${JSON.stringify({
    version: 1,
    assets: [...assets].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl)),
  }, null, 2)}\n`;
}

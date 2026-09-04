import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { cpus, freemem, totalmem } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import axe from 'axe-core';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import sharp from 'sharp';
import {
  composeCustomerPreviewWithApp,
  loadCustomerPreviewComposers,
  type CustomerPreviewField,
  type CustomerPreviewStylesheet,
} from './customer-preview-adapter.js';
import { isEmbeddedUrl, isSafeEmbeddedRasterDataUrl } from './url-safety.js';

export const LEGACY_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export type LegacyViewportName = keyof typeof LEGACY_VIEWPORTS;

export interface RenderTask {
  key: string;
  niche: string;
  slug: string;
  page: string;
  templateDir: string;
  /** Retain the lossless full-page PNG until catalogue-wide visual dedupe finishes. */
  retainComparisonScreenshot?: boolean;
}

export interface RenderIssue {
  code: string;
  severity: 'warning' | 'serious' | 'critical';
  detail: string;
}

export interface ContrastRepair {
  selector: string;
  foreground: '#000000' | '#ffffff';
  background: string;
  opacitySelectors?: string[];
}

export interface LinkInTextBlockRepair {
  selector: string;
}

export interface RenderEvidence {
  key: string;
  page: string;
  viewport: LegacyViewportName;
  passed: boolean;
  attempts: number;
  durationMs: number;
  screenshotSha256?: string;
  perceptualHash?: string;
  thumbnailPath?: string;
  thumbnailSha256?: string;
  thumbnailBytes?: number;
  comparisonScreenshotPath?: string;
  failureScreenshotPath?: string;
  visibleTextLength: number;
  editSlotCount: number;
  imageSlotCount: number;
  issues: RenderIssue[];
  contrastRepairs?: ContrastRepair[];
  linkInTextBlockRepairs?: LinkInTextBlockRepair[];
}

export interface RenderRunOptions {
  evidenceRoot: string;
  workers?: number;
  retries?: number;
  recycleEvery?: number;
  timeoutMs?: number;
  headless?: boolean;
  signal?: AbortSignal;
  onEvidence?: (evidence: RenderEvidence) => void | Promise<void>;
}

export interface StaticServerHandle {
  origin: string;
  close: () => Promise<void>;
}

export interface StaticServerOptions {
  /** When present, these exact page paths are composed through the app route. */
  renderTasks?: readonly RenderTask[];
}

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function hexRgb(value: string): [number, number, number] | null {
  const match = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  return match
    ? [0, 2, 4].map((index) => Number.parseInt(match.slice(index, index + 2), 16)) as [number, number, number]
    : null;
}

function luminance(rgb: readonly number[]): number {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function safeForegroundForBackground(background: string): '#000000' | '#ffffff' | null {
  const rgb = hexRgb(background);
  if (!rgb) return null;
  const backgroundLuminance = luminance(rgb);
  // Pure black and white guarantee that at least one choice reaches 4.5:1
  // against every opaque background. The former near-black (#111827) could
  // still lose to white while both choices remained below 4.5:1 on mid-tone
  // colors such as #8b5cf6.
  const dark = 0;
  const light = 1;
  return contrastRatio(dark, backgroundLuminance) >= contrastRatio(light, backgroundLuminance)
    ? '#000000'
    : '#ffffff';
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeEvidenceName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
}

function isContained(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.includes(`:${sep}`));
}

const SENTINEL_TEMPLATE_VALUES: Readonly<Record<string, string>> = {
    BUSINESS_NAME: 'Sentinel Clarity Studio',
    PRACTICE_NAME: 'Sentinel Clarity Practice',
    BRAND_NAME: 'Sentinel Clarity Brand',
    STUDIO_NAME: 'Sentinel Clarity Studio',
    PRACTITIONER_NAME: 'Jordan Sentinel',
    OWNER_NAME: 'Jordan Sentinel',
    COACH_NAME: 'Jordan Sentinel',
    FACILITATOR_NAME: 'Jordan Sentinel',
    EMAIL: 'sentinel@example.test',
    CONTACT_EMAIL: 'sentinel@example.test',
    PHONE: '(212) 555-0199',
    PHONE_NUMBER: '(212) 555-0199',
    CONTACT_PHONE: '(212) 555-0199',
    ADDRESS: '123 Sentinel Avenue, Test City, NY',
    STREET_ADDRESS: '123 Sentinel Avenue',
    CITY: 'Test City',
    STATE: 'NY',
    TAGLINE: 'A clear sentinel experience',
    DESCRIPTION: 'Sentinel profile hydration is active.',
    SERVICES: 'Personalized services',
    CTA_LABEL: 'Request a consultation',
    PRIMARY_CTA_LABEL: 'Request a consultation',
    PRIMARY_CTA_URL: './contact.html',
    BOOKING_URL: './contact.html',
    WEBSITE: './index.html',
};

export function sentinelTemplateValues(fields: readonly CustomerPreviewField[] = []): Record<string, string> {
  const values: Record<string, string> = { ...SENTINEL_TEMPLATE_VALUES };
  for (const field of fields) {
    const name = field.name.trim().toUpperCase();
    if (!name || values[name]) continue;
    const type = field.type?.trim().toLowerCase();
    values[name] = type === 'email' ? 'sentinel@example.test'
      : type === 'tel' ? '(212) 555-0199'
        : type === 'url' ? 'https://example.test/'
          : type === 'textarea' ? 'Sentinel profile hydration is active.'
            : `Sentinel ${name.toLowerCase().replace(/_/g, ' ')}`;
  }
  return values;
}

export function hydrateSentinelHtml(html: string): string {
  const sentinels = sentinelTemplateValues();
  return html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, raw: string) => {
    const token = raw.toUpperCase();
    return sentinels[token] ?? `Sentinel ${token.toLowerCase().replace(/_/g, ' ')}`;
  });
}

interface TemplatePreviewSource {
  fields: CustomerPreviewField[];
  pages: Set<string>;
  stylesheets: CustomerPreviewStylesheet[];
}

async function loadTemplatePreviewSource(templateDir: string): Promise<TemplatePreviewSource> {
  const [manifestValue, fieldsValue] = await Promise.all([
    readFile(resolve(templateDir, 'template.json'), 'utf8'),
    readFile(resolve(templateDir, 'fields.json'), 'utf8'),
  ]);
  const manifest = JSON.parse(manifestValue) as unknown;
  const fieldsDocument = JSON.parse(fieldsValue) as unknown;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('template.json is not an object');
  }
  if (!fieldsDocument || typeof fieldsDocument !== 'object' || Array.isArray(fieldsDocument)) {
    throw new Error('fields.json is not an object');
  }
  const pagesValue = (manifest as Record<string, unknown>).pages;
  const fieldsValueArray = (fieldsDocument as Record<string, unknown>).fields;
  if (!Array.isArray(pagesValue) || pagesValue.some((page) => typeof page !== 'string')) {
    throw new Error('template.json has no valid page manifest');
  }
  if (!Array.isArray(fieldsValueArray)) throw new Error('fields.json has no fields array');
  const fields = fieldsValueArray.map((value, index): CustomerPreviewField => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`fields.json field ${index} is not an object`);
    }
    const field = value as Record<string, unknown>;
    if (typeof field.name !== 'string' || !field.name.trim()) {
      throw new Error(`fields.json field ${index} has no name`);
    }
    if (field.type !== undefined && typeof field.type !== 'string') {
      throw new Error(`fields.json field ${index} has an invalid type`);
    }
    if (field.default !== undefined && typeof field.default !== 'string') {
      throw new Error(`fields.json field ${index} has an invalid default`);
    }
    return {
      name: field.name,
      ...(typeof field.type === 'string' ? { type: field.type } : {}),
      ...(typeof field.default === 'string' ? { default: field.default } : {}),
    };
  });

  const stylesheets: CustomerPreviewStylesheet[] = [];
  const pending = [''];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    const absoluteDirectory = resolve(templateDir, ...directory.split('/').filter(Boolean));
    if (!isContained(templateDir, absoluteDirectory)) throw new Error('stylesheet discovery escaped the template root');
    for (const entry of await readdir(absoluteDirectory, { withFileTypes: true })) {
      const path = [directory, entry.name].filter(Boolean).join('/');
      if (entry.isSymbolicLink()) throw new Error(`template contains a symbolic link: ${path}`);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile() && /\.css$/i.test(entry.name)) {
        const absolutePath = resolve(templateDir, ...path.split('/'));
        if (!isContained(templateDir, absolutePath)) throw new Error(`stylesheet escaped the template root: ${path}`);
        stylesheets.push({ path, css: await readFile(absolutePath, 'utf8') });
      }
    }
  }
  stylesheets.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  return { fields, pages: new Set(pagesValue as string[]), stylesheets };
}

const CUSTOMER_ASSET_ROUTE_PREFIX = '/api/templates/__dc_compiler__/';

function customerAssetRoute(root: string, templateDir: string): { base: string; token: string } {
  const path = relative(root, templateDir).replace(/\\/g, '/');
  if (!path || path.startsWith('../') || path === '..') throw new Error(`Template path escaped the server root: ${templateDir}`);
  const token = sha256(path).slice(0, 32);
  return { base: `${CUSTOMER_ASSET_ROUTE_PREFIX}${token}/assets`, token };
}

export async function startTemplateServer(
  rootInput: string,
  options: StaticServerOptions = {},
): Promise<StaticServerHandle> {
  const root = resolve(rootInput);
  const previewTasks = new Map<string, RenderTask>();
  const assetRoots = new Map<string, string>();
  for (const task of options.renderTasks ?? []) {
    const templateDir = resolve(task.templateDir);
    const pageTarget = resolve(templateDir, ...task.page.replace(/\\/g, '/').split('/'));
    if (
      templateDir === root
      || !isContained(root, templateDir)
      || pageTarget === templateDir
      || !isContained(templateDir, pageTarget)
      || !/\.html?$/i.test(task.page)
    ) {
      throw new Error(`Render task has an unsafe customer preview path: ${task.key}/${task.page}`);
    }
    previewTasks.set(pageTarget, task);
    const route = customerAssetRoute(root, templateDir);
    const existingRoot = assetRoots.get(route.token);
    if (existingRoot && existingRoot !== templateDir) {
      throw new Error(`Customer asset-route collision between ${existingRoot} and ${templateDir}`);
    }
    assetRoots.set(route.token, templateDir);
  }
  if (options.renderTasks) await loadCustomerPreviewComposers();

  const sourceCache = new Map<string, Promise<TemplatePreviewSource>>();
  const documentCache = new Map<string, Promise<{
    bytes: Buffer;
    manifestFields: number;
    themeStylesheets: number;
  }>>();
  const composeTask = (task: RenderTask): Promise<{
    bytes: Buffer;
    manifestFields: number;
    themeStylesheets: number;
  }> => {
    const templateDir = resolve(task.templateDir);
    const target = resolve(templateDir, ...task.page.replace(/\\/g, '/').split('/'));
    const cached = documentCache.get(target);
    if (cached) return cached;
    const composed = (async () => {
      let source = sourceCache.get(templateDir);
      if (!source) {
        source = loadTemplatePreviewSource(templateDir);
        sourceCache.set(templateDir, source);
      }
      const metadata = await source;
      if (!metadata.pages.has(task.page)) throw new Error(`page is absent from template.json: ${task.page}`);
      const html = await readFile(target, 'utf8');
      const assetBase = customerAssetRoute(root, templateDir).base;
      const document = await composeCustomerPreviewWithApp({
        html,
        page: task.page,
        fields: metadata.fields,
        values: sentinelTemplateValues(metadata.fields),
        stylesheets: metadata.stylesheets,
        assetBase,
      });
      return {
        bytes: Buffer.from(document, 'utf8'),
        manifestFields: metadata.fields.length,
        themeStylesheets: metadata.stylesheets.length,
      };
    })();
    documentCache.set(target, composed);
    return composed;
  };
  const server: Server = createServer(async (request, response) => {
    let isPreviewRequest = false;
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const assetMatch = requestUrl.pathname.match(/^\/api\/templates\/__dc_compiler__\/([0-9a-f]{32})\/assets\/(.+)$/);
      const assetRoot = assetMatch ? assetRoots.get(assetMatch[1]!) : undefined;
      const decoded = decodeURIComponent(assetMatch ? assetMatch[2]! : requestUrl.pathname).replace(/^\/+/, '');
      const targetRoot = assetRoot ?? root;
      const target = resolve(targetRoot, ...decoded.split('/'));
      if ((assetMatch && !assetRoot) || !decoded || !isContained(targetRoot, target)) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const renderTask = previewTasks.get(target);
      isPreviewRequest = Boolean(renderTask);
      const preview = renderTask ? await composeTask(renderTask) : null;
      let bytes = preview?.bytes ?? await readFile(target);
      const extension = extname(target).toLowerCase();
      if (extension === '.html' && !renderTask) bytes = Buffer.from(hydrateSentinelHtml(bytes.toString('utf8')), 'utf8');
      response.writeHead(200, {
        'content-type': MIME_TYPES[extension] ?? 'application/octet-stream',
        'cache-control': 'no-store',
        ...(renderTask ? { 'x-dc-preview-composition': 'shared-customer-route' } : {}),
        ...(preview ? {
          'x-dc-manifest-fields': String(preview.manifestFields),
          'x-dc-theme-stylesheets': String(preview.themeStylesheets),
        } : {}),
        'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'",
        'x-content-type-options': 'nosniff',
      });
      response.end(bytes);
    } catch (error) {
      response.writeHead(isPreviewRequest ? 500 : 404, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      });
      response.end(isPreviewRequest
        ? `Customer preview composition failed: ${error instanceof Error ? error.message : String(error)}`
        : 'Not found');
    }
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not bind local template QA server');
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolvePromise, reject) => {
      server.close((error) => error ? reject(error) : resolvePromise());
    }),
  };
}

export function recommendedRenderWorkers(requested?: number): number {
  const memoryRatio = freemem() / Math.max(1, totalmem());
  const memoryBound = memoryRatio < 0.2 ? 2 : memoryRatio < 0.35 ? 3 : memoryRatio < 0.5 ? 4 : 6;
  const cpuBound = Math.max(2, Math.min(6, Math.floor(cpus().length / 4)));
  const automatic = Math.max(2, Math.min(memoryBound, cpuBound));
  if (!requested || !Number.isFinite(requested)) return automatic;
  // Treat the configured value as a ceiling, not a promise. A long unattended
  // run should shed browser concurrency when system memory is already tight.
  return Math.max(1, Math.min(automatic, Math.floor(requested)));
}

async function screenshotEvidence(
  page: Page,
  evidenceRoot: string,
  task: RenderTask,
  viewport: LegacyViewportName,
  passed: boolean,
): Promise<Pick<RenderEvidence,
  'screenshotSha256' | 'perceptualHash' | 'thumbnailPath' | 'thumbnailSha256' | 'thumbnailBytes'
  | 'comparisonScreenshotPath' | 'failureScreenshotPath'>> {
  const png = await page.screenshot({ fullPage: true, type: 'png' });
  const digest = sha256(png);
  const raw = await sharp(png)
    .resize(9, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
  let bits = '';
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const offset = row * 9 + column;
      bits += raw[offset]! > raw[offset + 1]! ? '1' : '0';
    }
  }
  const perceptualHash = BigInt(`0b${bits}`).toString(16).padStart(16, '0');
  const base = `${safeEvidenceName(task.niche)}__${safeEvidenceName(task.slug)}__${safeEvidenceName(task.page)}__${viewport}`;
  const thumbnailPath = join(evidenceRoot, 'thumbnails', `${base}.webp`);
  await mkdir(dirname(thumbnailPath), { recursive: true });
  const thumbnail = await writeEvidenceThumbnail(png, thumbnailPath);

  let comparisonScreenshotPath: string | undefined;
  if (passed && task.retainComparisonScreenshot) {
    comparisonScreenshotPath = temporaryComparisonScreenshotPath(evidenceRoot, digest);
    await mkdir(dirname(comparisonScreenshotPath), { recursive: true });
    // The filename is the hash of these exact PNG bytes. Rewriting an existing
    // path is safe (and repairs a partial file left by an interrupted process).
    await writeFile(comparisonScreenshotPath, png);
  }

  let failureScreenshotPath: string | undefined;
  if (!passed) {
    failureScreenshotPath = join(evidenceRoot, 'failures', `${base}.png`);
    await mkdir(dirname(failureScreenshotPath), { recursive: true });
    await writeFile(failureScreenshotPath, png);
  }
  return {
    screenshotSha256: digest,
    perceptualHash,
    thumbnailPath,
    thumbnailSha256: thumbnail.sha256,
    thumbnailBytes: thumbnail.bytes,
    ...(comparisonScreenshotPath ? { comparisonScreenshotPath } : {}),
    ...(failureScreenshotPath ? { failureScreenshotPath } : {}),
  };
}

/**
 * Keep evidence thumbnails within WebP's 16,383-pixel dimension limit. Some
 * legacy pages are extraordinarily tall; constraining only width could leave
 * the proportional height too large for libvips to encode.
 */
export async function writeEvidenceThumbnail(
  png: Buffer,
  thumbnailPath: string,
): Promise<{ sha256: string; bytes: number }> {
  const encoded = await sharp(png)
    .resize({ width: 320, height: 4096, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
  await writeFile(thumbnailPath, encoded);
  return { sha256: sha256(encoded), bytes: encoded.byteLength };
}

/**
 * Revalidate the long-lived thumbnail independently of its SQLite row and
 * signed receipt. The real-path check prevents a junction/symlinked ancestor
 * from turning a lexically contained artifact path into an external file.
 */
export async function verifyRetainedThumbnailEvidence(input: {
  renderRoot: string;
  thumbnailPath: string;
  expectedSha256: string;
  expectedBytes: number;
}): Promise<void> {
  const renderRoot = resolve(input.renderRoot);
  const thumbnailRoot = resolve(renderRoot, 'thumbnails');
  const thumbnailPath = resolve(input.thumbnailPath);
  if (
    thumbnailPath === thumbnailRoot
    || !isContained(renderRoot, thumbnailPath)
    || !isContained(thumbnailRoot, thumbnailPath)
  ) {
    throw new Error(`Retained thumbnail escaped the render thumbnail root: ${input.thumbnailPath}`);
  }
  if (!/^[0-9a-f]{64}$/.test(input.expectedSha256)) {
    throw new Error('Retained thumbnail is missing a lowercase SHA-256 digest');
  }
  if (!Number.isSafeInteger(input.expectedBytes) || input.expectedBytes <= 0) {
    throw new Error('Retained thumbnail is missing a positive byte-size attestation');
  }

  const [renderRootDetails, thumbnailDetails] = await Promise.all([
    lstat(renderRoot).catch(() => null),
    lstat(thumbnailPath).catch(() => null),
  ]);
  if (!renderRootDetails?.isDirectory() || renderRootDetails.isSymbolicLink()) {
    throw new Error(`Render evidence root is missing or unsafe: ${renderRoot}`);
  }
  if (!thumbnailDetails?.isFile() || thumbnailDetails.isSymbolicLink()) {
    throw new Error(`Retained thumbnail is missing or unsafe: ${thumbnailPath}`);
  }
  const [realRenderRoot, realThumbnailPath] = await Promise.all([
    realpath(renderRoot),
    realpath(thumbnailPath),
  ]);
  if (!isContained(realRenderRoot, realThumbnailPath) || realThumbnailPath === realRenderRoot) {
    throw new Error(`Retained thumbnail resolves outside the render root: ${thumbnailPath}`);
  }

  const encoded = await readFile(thumbnailPath);
  if (encoded.byteLength !== input.expectedBytes || thumbnailDetails.size !== input.expectedBytes) {
    throw new Error(
      `Retained thumbnail byte-size mismatch: expected ${input.expectedBytes}, found ${encoded.byteLength}`,
    );
  }
  const actualSha256 = sha256(encoded);
  if (actualSha256 !== input.expectedSha256) {
    throw new Error(`Retained thumbnail SHA-256 mismatch: expected ${input.expectedSha256}, found ${actualSha256}`);
  }
  try {
    const decoded = await sharp(encoded).rotate().raw().toBuffer({ resolveWithObject: true });
    if (!decoded.info.width || !decoded.info.height || decoded.data.byteLength === 0) {
      throw new Error('decoded image contains no pixels');
    }
  } catch (error) {
    throw new Error(
      `Retained thumbnail is not a decodable image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const COMPARISON_SCREENSHOT_DIRECTORY = 'comparison-screenshots';

/**
 * Resolve the short-lived, lossless screenshot backing a visual-alias score.
 * Content addressing lets an interrupted run resume without adding a SQLite
 * column or confusing these files with the long-lived gallery thumbnails.
 */
export function temporaryComparisonScreenshotPath(evidenceRoot: string, screenshotSha256: string): string {
  if (!/^[0-9a-f]{64}$/i.test(screenshotSha256)) {
    throw new Error('Comparison screenshot hashes must be 64 hexadecimal characters');
  }
  return join(resolve(evidenceRoot), COMPARISON_SCREENSHOT_DIRECTORY, `${screenshotSha256.toLowerCase()}.png`);
}

/** Remove only the dedicated transient full-screenshot directory. */
export async function removeTemporaryComparisonScreenshots(evidenceRoot: string): Promise<void> {
  const root = resolve(evidenceRoot);
  const target = resolve(root, COMPARISON_SCREENSHOT_DIRECTORY);
  if (target === root || !isContained(root, target)) {
    throw new Error(`Refusing to remove an unsafe comparison screenshot path: ${target}`);
  }
  const details = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!details) return;
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new Error(`Refusing to remove a non-directory comparison screenshot path: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
}

async function configureContext(browser: Browser, viewport: LegacyViewportName): Promise<BrowserContext> {
  return browser.newContext({
    viewport: LEGACY_VIEWPORTS[viewport],
    serviceWorkers: 'block',
    // Axe is injected by the trusted local QA harness after navigation. The
    // template's own CSP remains part of the deployed artifact.
    bypassCSP: true,
    javaScriptEnabled: true,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
}

interface CustomerEditorRuntimeCheck {
  installed: boolean;
  leafText: 'passed' | 'missing' | 'failed';
  editableAttribute: 'passed' | 'missing' | 'failed';
  standaloneImage: 'passed' | 'missing' | 'failed';
  responsivePicture: 'passed' | 'missing' | 'failed';
  navigation: 'passed' | 'missing' | 'failed';
  details: string[];
}

/** Exercise the exact app-owned iframe runtime through its public events. */
async function exerciseCustomerEditorRuntime(page: Page, currentPage: string): Promise<CustomerEditorRuntimeCheck> {
  return page.evaluate(async ({ manifestPage, expectedRuntime }) => {
    type PreviewMessage = Record<string, unknown> & { type?: string };
    type CheckStatus = 'passed' | 'missing' | 'failed';
    const details: string[] = [];
    const sentinelText = 'SENTINEL EDIT PERSISTED';
    const sentinelImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const nativeSetTimeout = window.setTimeout.bind(window);

    const nextMessage = (
      type: string,
      trigger: () => void,
      timeoutMs = 750,
    ): Promise<PreviewMessage | null> => new Promise((resolvePromise) => {
      let settled = false;
      const finish = (value: PreviewMessage | null) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        resolvePromise(value);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== window || !event.data || typeof event.data !== 'object') return;
        const message = event.data as PreviewMessage;
        if (message.type === type) finish(message);
      };
      window.addEventListener('message', onMessage);
      nativeSetTimeout(() => finish(null), timeoutMs);
      trigger();
    });

    const restoreAttribute = (element: Element, attribute: string, value: string | null) => {
      if (value === null) element.removeAttribute(attribute);
      else element.setAttribute(attribute, value);
    };

    let leafText: CheckStatus = 'missing';
    const leaf = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')]
      .find((element) => document.body.contains(element)
        && !element.hasAttribute('data-dc-edit-attribute')
        && !element.hasAttribute('data-pb-edit-attribute')
        && element.children.length === 0);
    if (leaf) {
      const originalHtml = leaf.innerHTML;
      const originalStyle = leaf.getAttribute('style');
      const originalEditable = leaf.getAttribute('contenteditable');
      const nodeId = leaf.getAttribute('data-dc-edit-id') || leaf.getAttribute('data-pb-edit-id') || '';
      const originalText = leaf.textContent || '';
      const message = await nextMessage('textEdited', () => {
        leaf.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        if (leaf.isContentEditable) {
          leaf.textContent = sentinelText;
          leaf.dispatchEvent(new FocusEvent('blur'));
        }
      });
      leafText = leaf.textContent === sentinelText
        && message?.nodeId === nodeId
        && message.original === originalText
        && message.text === sentinelText
        ? 'passed'
        : 'failed';
      if (leafText === 'failed') details.push('leaf text did not complete the dblclick/contenteditable/textEdited round trip');
      leaf.innerHTML = originalHtml;
      restoreAttribute(leaf, 'style', originalStyle);
      restoreAttribute(leaf, 'contenteditable', originalEditable);
    }

    let editableAttribute: CheckStatus = 'missing';
    const attributeTarget = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-attribute],[data-pb-edit-attribute]')]
      .find((element) => document.body.contains(element));
    if (attributeTarget) {
      const attribute = attributeTarget.getAttribute('data-dc-edit-attribute')
        || attributeTarget.getAttribute('data-pb-edit-attribute')
        || '';
      const nodeId = attributeTarget.getAttribute('data-dc-edit-id')
        || attributeTarget.getAttribute('data-pb-edit-id')
        || '';
      const original = attributeTarget.getAttribute(attribute);
      let promptCalls = 0;
      const nativePrompt = window.prompt;
      window.prompt = () => {
        promptCalls += 1;
        return sentinelText;
      };
      const request = await nextMessage('editValueRequest', () => {
        attributeTarget.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      });
      if (request) {
        const prompted = window.prompt('Edit value', String(request.original ?? ''));
        if (prompted !== null) {
          window.postMessage({
            type: 'editValueResponse',
            nodeId: request.nodeId,
            attribute: request.attribute,
            text: prompted,
          }, '*');
          await new Promise<void>((resolvePromise) => nativeSetTimeout(resolvePromise, 0));
        }
      }
      window.prompt = nativePrompt;
      editableAttribute = request?.nodeId === nodeId
        && request.attribute === attribute
        && request.original === (original || '')
        && promptCalls === 1
        && attributeTarget.getAttribute(attribute) === sentinelText
        ? 'passed'
        : 'failed';
      if (editableAttribute === 'failed') details.push('editable attribute did not complete the request/prompt/response round trip');
      restoreAttribute(attributeTarget, attribute, original);
    }

    const dispatchImageClick = async (target: HTMLElement): Promise<PreviewMessage | null> => {
      const nativeWindowSetTimeout = window.setTimeout;
      // Preserve the real callback path without adding 280 ms to every one of
      // tens of thousands of catalogue page/viewport checks.
      window.setTimeout = ((handler: TimerHandler) => {
        if (typeof handler === 'function') handler();
        return 0;
      }) as typeof window.setTimeout;
      try {
        return await nextMessage('imageSwapRequest', () => {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
      } finally {
        window.setTimeout = nativeWindowSetTimeout;
      }
    };

    const snapshotImageAttributes = (elements: readonly HTMLElement[]) => elements.map((element) => ({
      element,
      src: element.getAttribute('src'),
      srcset: element.getAttribute('srcset'),
      style: element.getAttribute('style'),
    }));
    const restoreImages = (snapshots: ReturnType<typeof snapshotImageAttributes>) => {
      for (const snapshot of snapshots) {
        restoreAttribute(snapshot.element, 'src', snapshot.src);
        restoreAttribute(snapshot.element, 'srcset', snapshot.srcset);
        restoreAttribute(snapshot.element, 'style', snapshot.style);
      }
    };
    const imageChanged = (target: HTMLElement) => target instanceof HTMLImageElement
      ? target.getAttribute('src') === sentinelImage && !target.hasAttribute('srcset')
      : target instanceof HTMLSourceElement
        ? (target.getAttribute('srcset') ?? target.getAttribute('src')) === sentinelImage
        : target.style.backgroundImage.includes('data:image/png;base64');
    const replyToImageRequest = async (request: PreviewMessage, slotIds: string[]) => {
      window.postMessage({
        type: 'imageSwapResponse',
        imageUrl: sentinelImage,
        slotId: request.slotId,
        slotIds,
      }, '*');
      await new Promise<void>((resolvePromise) => nativeSetTimeout(resolvePromise, 0));
    };

    let standaloneImage: CheckStatus = 'missing';
    const standalone = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
      .find((element) => element.tagName !== 'SOURCE' && !element.closest('picture'));
    if (standalone) {
      const snapshots = snapshotImageAttributes([standalone]);
      const slotId = standalone.getAttribute('data-dc-image-id') || standalone.getAttribute('data-pb-image-id') || '';
      const request = await dispatchImageClick(standalone);
      if (request) await replyToImageRequest(request, [slotId]);
      standaloneImage = request?.slotId === slotId
        && Array.isArray(request.pictureSlotIds)
        && request.pictureSlotIds.length === 1
        && request.pictureSlotIds[0] === slotId
        && imageChanged(standalone)
        ? 'passed'
        : 'failed';
      if (standaloneImage === 'failed') details.push('standalone image did not complete the click/request/response round trip');
      restoreImages(snapshots);
    }

    let responsivePicture: CheckStatus = 'missing';
    const picture = [...document.querySelectorAll<HTMLPictureElement>('picture')].find((candidate) => {
      const responsive = [...candidate.children].filter((child) => child.tagName === 'SOURCE' || child.tagName === 'IMG');
      const ids = responsive.map((child) => child.getAttribute('data-dc-image-id') || child.getAttribute('data-pb-image-id') || '');
      return responsive.some((child) => child.tagName === 'IMG') && responsive.length > 1
        && ids.every(Boolean) && new Set(ids).size === ids.length;
    });
    if (picture) {
      const responsive = [...picture.children]
        .filter((child): child is HTMLElement => child instanceof HTMLElement && (child.tagName === 'SOURCE' || child.tagName === 'IMG'));
      const image = responsive.find((child): child is HTMLImageElement => child instanceof HTMLImageElement)!;
      const domSlotIds = responsive.map((child) => child.getAttribute('data-dc-image-id') || child.getAttribute('data-pb-image-id') || '');
      const primarySlotId = image.getAttribute('data-dc-image-id') || image.getAttribute('data-pb-image-id') || '';
      const responseSlotIds = [primarySlotId, ...domSlotIds.filter((slotId) => slotId !== primarySlotId)];
      const snapshots = snapshotImageAttributes(responsive);
      const request = await dispatchImageClick(image);
      if (request) await replyToImageRequest(request, responseSlotIds);
      const requestedPictureSlotIds = Array.isArray(request?.pictureSlotIds)
        ? request.pictureSlotIds as unknown[]
        : [];
      responsivePicture = request?.slotId === primarySlotId
        && requestedPictureSlotIds.length === domSlotIds.length
        && domSlotIds.every((slotId) => requestedPictureSlotIds.includes(slotId))
        && responsive.every(imageChanged)
        ? 'passed'
        : 'failed';
      if (responsivePicture === 'failed') details.push('responsive picture did not require and update its complete stable-ID group');
      restoreImages(snapshots);
    }

    let navigation: CheckStatus = 'missing';
    const navigationLink = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find((link) => {
      const href = link.getAttribute('href') || '';
      return href === '/' || href === './' || (!/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|#)/.test(href) && /\.html(?:[?#].*)?$/i.test(href));
    });
    if (navigationLink) {
      const href = navigationLink.getAttribute('href') || '';
      const expectedPage = href === '/' || href === './'
        ? 'index.html'
        : new URL(href, `https://preview.invalid/${manifestPage}`).pathname.replace(/^\/+/, '');
      const request = await nextMessage('navigatePage', () => {
        navigationLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      navigation = typeof request?.page === 'string'
        && /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.html$/.test(request.page)
        && request.page.length <= 160
        && request.page === expectedPage
        ? 'passed'
        : 'failed';
      if (navigation === 'failed') details.push(`nested navigation did not emit a safe page from ${manifestPage}`);
    }

    return {
      installed: (window as typeof window & { __dailyClarityCustomerPreviewEditorRuntime?: string })
        .__dailyClarityCustomerPreviewEditorRuntime === expectedRuntime
        && document.querySelectorAll(`script[data-dc-runtime="${expectedRuntime}"]`).length === 1,
      leafText,
      editableAttribute,
      standaloneImage,
      responsivePicture,
      navigation,
      details,
    };
  }, { manifestPage: currentPage, expectedRuntime: 'customer-preview-editor-v1' });
}

export function isAllowedTemplateRenderRequest(origin: string, url: string, resourceType: string): boolean {
  if (url.startsWith('about:')) return true;
  if (isEmbeddedUrl(url)) return resourceType === 'image' && isSafeEmbeddedRasterDataUrl(url);
  try {
    if (new URL(url).origin === new URL(origin).origin) return true;
  } catch {
    return false;
  }
  return false;
}

async function inspectPage(page: Page, origin: string, url: string, currentPage: string, timeoutMs: number): Promise<{
  issues: RenderIssue[];
  visibleTextLength: number;
  editSlotCount: number;
  imageSlotCount: number;
  contrastRepairs: ContrastRepair[];
  linkInTextBlockRepairs: LinkInTextBlockRepair[];
}> {
  const issues: RenderIssue[] = [];
  const contrastRepairs: ContrastRepair[] = [];
  const linkInTextBlockRepairs: LinkInTextBlockRepair[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`));
  const templateOrigin = new URL(origin).origin;
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    try {
      if (new URL(response.url()).origin === templateOrigin) {
        failedRequests.push(`${response.url()} (HTTP ${status})`);
      }
    } catch {
      // A malformed response URL cannot be same-origin and is ignored here.
    }
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (isAllowedTemplateRenderRequest(origin, request.url(), request.resourceType())) await route.continue();
    else await route.abort('blockedbyclient');
  });

  // tsx/esbuild preserves function names with a tiny `__name` helper. When a
  // compiled callback is serialized into Chromium, that module-scoped helper
  // is intentionally not carried with it. Define the inert helper only in the
  // isolated QA page so browser-side inspections stay portable.
  await page.addInitScript({ content: 'globalThis.__name = (target) => target;' });

  await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });

  const state = await page.evaluate(() => {
    const text = document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
    const root = document.documentElement;
    const editIds = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id]')]
      .map((element) => element.dataset.dcEditId ?? '');
    const imageIds = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id]')]
      .map((element) => element.dataset.dcImageId ?? '');
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const duplicateEditIds = editIds.filter((id, index) => !id || editIds.indexOf(id) !== index);
    const duplicateImageIds = imageIds.filter((id, index) => !id || imageIds.indexOf(id) !== index);
    const unresolvedTokens = [...document.documentElement.innerHTML.matchAll(/\{\{[^{}]*\}\}/g)].map((match) => match[0]);
    const overflowOffenders = [...document.querySelectorAll<HTMLElement>('body,body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => rect.left < -1 || rect.right > window.innerWidth + 1 || element.scrollWidth > element.clientWidth + 1)
      .slice(0, 12)
      .map(({ element, rect }) => {
        const marker = element.dataset.dcEditId
          ? `[data-dc-edit-id="${element.dataset.dcEditId}"]`
          : element.dataset.dcImageId
            ? `[data-dc-image-id="${element.dataset.dcImageId}"]`
            : `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${[...element.classList].slice(0, 3).map((name) => `.${name}`).join('')}`;
        return `${marker} rect=${Math.round(rect.left)}..${Math.round(rect.right)} client=${element.clientWidth} scroll=${element.scrollWidth}`;
      });
    const forms = [...document.forms].map((form) => ({
      fields: [...form.elements]
        .filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
        .map((element) => ({ name: element.name, type: element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase() })),
    }));
    return {
      textLength: text.length,
      mainCount: document.querySelectorAll('main').length,
      headingCount: document.querySelectorAll('h1,h2,h3').length,
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      brokenImages,
      duplicateEditIds,
      duplicateImageIds,
      unresolvedTokens,
      overflowOffenders,
      editSlotCount: editIds.length,
      imageSlotCount: imageIds.length,
      forms,
    };
  });

  if (state.textLength < 80) issues.push({ code: 'insufficient_visible_text', severity: 'critical', detail: `Only ${state.textLength} visible characters` });
  if (state.mainCount !== 1) issues.push({ code: 'main_landmark', severity: 'serious', detail: `Expected one main element; found ${state.mainCount}` });
  if (state.headingCount === 0) issues.push({ code: 'missing_heading', severity: 'serious', detail: 'No visible heading structure found' });
  if (state.overflow > 1) {
    const offenders = state.overflowOffenders.length > 0 ? ` | ${state.overflowOffenders.join(' | ')}` : '';
    issues.push({ code: 'horizontal_overflow', severity: 'serious', detail: `${state.overflow}px horizontal overflow${offenders}` });
  }
  if (state.brokenImages.length > 0) issues.push({ code: 'broken_images', severity: 'critical', detail: state.brokenImages.slice(0, 5).join(', ') });
  if (state.duplicateEditIds.length > 0) issues.push({ code: 'duplicate_edit_ids', severity: 'critical', detail: state.duplicateEditIds.slice(0, 10).join(', ') });
  if (state.duplicateImageIds.length > 0) issues.push({ code: 'duplicate_image_ids', severity: 'critical', detail: state.duplicateImageIds.slice(0, 10).join(', ') });
  if (state.unresolvedTokens.length > 0) issues.push({ code: 'unresolved_tokens', severity: 'critical', detail: state.unresolvedTokens.slice(0, 10).join(', ') });
  if (pageErrors.length > 0) issues.push({ code: 'page_exception', severity: 'critical', detail: pageErrors.slice(0, 5).join(' | ') });
  if (consoleErrors.length > 0) issues.push({ code: 'console_error', severity: 'serious', detail: consoleErrors.slice(0, 5).join(' | ') });
  if (failedRequests.length > 0) issues.push({ code: 'failed_request', severity: 'critical', detail: failedRequests.slice(0, 5).join(' | ') });

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const selectorForElement = (element: Element): string => {
      const parts: string[] = [];
      let cursor: Element | null = element;
      while (cursor && cursor !== document.documentElement) {
        for (const attribute of ['data-dc-edit-id', 'data-dc-image-id'] as const) {
          const value = cursor.getAttribute(attribute);
          if (value && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
            parts.unshift(`[${attribute}="${value}"]`);
            return parts.join('>');
          }
        }
        if (cursor.id && /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/.test(cursor.id)) {
          parts.unshift(`#${CSS.escape(cursor.id)}`);
          return parts.join('>');
        }

        const tag = cursor.tagName.toLowerCase();
        const parent: Element | null = cursor.parentElement;
        if (!parent) break;
        const peers = [...parent.children].filter((candidate) => candidate.tagName === cursor!.tagName);
        const ordinal = peers.indexOf(cursor) + 1;
        parts.unshift(`${tag}:nth-of-type(${Math.max(1, ordinal)})`);
        cursor = parent;
      }
      return parts.length ? parts.join('>') : 'body:nth-of-type(1)';
    };
    const exactSelector = (rawTarget: string): { element: Element; selector: string } | null => {
      let element: Element | null = null;
      try { element = document.querySelector(rawTarget); } catch { return null; }
      return element ? { element, selector: selectorForElement(element) } : null;
    };
    const runner = (window as typeof window & { axe: { run: () => Promise<{ violations: Array<{
      id: string;
      impact: string | null;
      help: string;
      nodes: Array<{ target: Array<string | string[]>; failureSummary?: string }>;
    }> }> } }).axe;
    const result = await runner.run();
    return result.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        // Keep every failed node for deterministic remediation. Human-facing
        // issue text is bounded below, but limiting this collection to the
        // first five nodes left the rest broken and forced otherwise healthy
        // designs into the neutral fallback lane.
        nodes: violation.nodes.map((node) => {
          const rawTarget = node.target.map((part) => Array.isArray(part) ? part.join(' ') : part).join(' ');
          const resolved = exactSelector(rawTarget);
          const opacityTargets: string[] = [];
          let cursor = resolved?.element ?? null;
          while (cursor && cursor !== document.documentElement) {
            const opacity = Number.parseFloat(getComputedStyle(cursor).opacity);
            if (Number.isFinite(opacity) && opacity < 0.999) opacityTargets.push(selectorForElement(cursor));
            cursor = cursor.parentElement;
          }
          return {
            rawTarget,
            target: resolved?.selector ?? null,
            opacityTargets,
            summary: node.failureSummary ?? '',
          };
        }),
      }));
  });
  for (const violation of violations) {
    issues.push({
      code: `axe_${violation.id}`,
      severity: violation.impact === 'critical' ? 'critical' : 'serious',
      detail: [
        violation.help,
        ...violation.nodes.slice(0, 10).map((node) => `${node.target ?? node.rawTarget}: ${node.summary.replace(/\s+/g, ' ').trim()}`),
        ...(violation.nodes.length > 10 ? [`${violation.nodes.length - 10} additional failing nodes`] : []),
      ].join(' | '),
    });
    if (violation.id === 'color-contrast') {
      for (const node of violation.nodes) {
        const background = node.summary.match(/background color:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();
        const foreground = background ? safeForegroundForBackground(background) : null;
        if (background && foreground && node.target) {
          contrastRepairs.push({
            selector: node.target,
            foreground,
            background,
            ...(node.opacityTargets.length > 0 ? { opacitySelectors: node.opacityTargets } : {}),
          });
        }
      }
    }
    if (violation.id === 'link-in-text-block') {
      for (const node of violation.nodes) {
        if (node.target) linkInTextBlockRepairs.push({ selector: node.target });
      }
    }
  }

  if (state.editSlotCount > 0) {
    const edits = await page.evaluate(() => {
      const targets = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id]')];
      let passed = 0;
      for (const target of targets) {
        const attribute = target.dataset.dcEditAttribute;
        if (attribute) {
          const hadAttribute = target.hasAttribute(attribute);
          const original = target.getAttribute(attribute);
          target.setAttribute(attribute, 'SENTINEL EDIT PERSISTED');
          if (target.getAttribute(attribute) === 'SENTINEL EDIT PERSISTED' && Boolean(target.dataset.dcEditId)) passed += 1;
          if (hadAttribute) target.setAttribute(attribute, original ?? '');
          else target.removeAttribute(attribute);
        } else {
          const original = target.innerHTML;
          target.textContent = 'SENTINEL EDIT PERSISTED';
          if (target.textContent === 'SENTINEL EDIT PERSISTED' && Boolean(target.dataset.dcEditId)) passed += 1;
          target.innerHTML = original;
        }
      }
      return { checked: targets.length, passed };
    });
    if (edits.checked !== state.editSlotCount || edits.passed !== edits.checked) {
      issues.push({ code: 'edit_smoke_failed', severity: 'critical', detail: `${edits.passed}/${state.editSlotCount} ID-targeted text/attribute edits applied and restored` });
    }
  } else {
    issues.push({ code: 'no_edit_slots', severity: 'critical', detail: 'Page contains no stable editable text IDs' });
  }

  if (state.imageSlotCount > 0) {
    const images = await page.evaluate(() => {
      const targets = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id]')];
      const sentinel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      let passed = 0;
      for (const target of targets) {
        const originals = new Map<string, string | null>();
        for (const attribute of ['src', 'srcset', 'style']) originals.set(attribute, target.getAttribute(attribute));
        if (target instanceof HTMLImageElement) target.setAttribute('src', sentinel);
        else if (target instanceof HTMLSourceElement) target.setAttribute('srcset', `${sentinel} 1x`);
        else target.style.setProperty('background-image', `url("${sentinel}")`, 'important');
        const changed = target instanceof HTMLImageElement
          ? target.getAttribute('src') === sentinel
          : target instanceof HTMLSourceElement
            ? target.getAttribute('srcset') === `${sentinel} 1x`
            : target.style.backgroundImage.includes('data:image/png;base64');
        if (changed && Boolean(target.dataset.dcImageId)) passed += 1;
        for (const [attribute, value] of originals) {
          if (value === null) target.removeAttribute(attribute);
          else target.setAttribute(attribute, value);
        }
      }
      return { checked: targets.length, passed };
    });
    if (images.checked !== state.imageSlotCount || images.passed !== images.checked) {
      issues.push({ code: 'image_edit_smoke_failed', severity: 'critical', detail: `${images.passed}/${state.imageSlotCount} ID-targeted image edits applied and restored` });
    }
  }

  const editorRuntime = await exerciseCustomerEditorRuntime(page, currentPage);
  if (!editorRuntime.installed) {
    issues.push({
      code: 'customer_editor_runtime_missing',
      severity: 'critical',
      detail: 'The exact app-owned customer-preview editor runtime was not installed exactly once',
    });
  }
  if (editorRuntime.leafText !== 'passed') {
    issues.push({
      code: 'customer_editor_text_failed',
      severity: 'critical',
      detail: editorRuntime.leafText === 'missing'
        ? 'No leaf text slot was available for the customer editor round trip'
        : editorRuntime.details.find((detail) => detail.startsWith('leaf text')) ?? 'Leaf text editor round trip failed',
    });
  }
  for (const [path, status] of [
    ['attribute', editorRuntime.editableAttribute],
    ['standalone_image', editorRuntime.standaloneImage],
    ['responsive_picture', editorRuntime.responsivePicture],
    ['navigation', editorRuntime.navigation],
  ] as const) {
    if (status !== 'failed') continue;
    issues.push({
      code: `customer_editor_${path}_failed`,
      severity: 'critical',
      detail: editorRuntime.details.find((detail) => detail.includes(path.replace('_', ' ')))
        ?? `Customer editor ${path.replace('_', ' ')} round trip failed`,
    });
  }
  if (
    state.imageSlotCount > 0
    && editorRuntime.standaloneImage === 'missing'
    && editorRuntime.responsivePicture === 'missing'
  ) {
    issues.push({
      code: 'customer_editor_image_path_missing',
      severity: 'critical',
      detail: 'Image slots exist but none could be exercised through the customer editor runtime',
    });
  }

  // Locate a real declaration backed by a compiled theme variable, mutate
  // that variable, and prove a customer's theme choice changes rendered CSS.
  const themeChanged = await page.evaluate(() => {
    type Match = { element: Element; property: string; token: string };
    const findMatches = (rules: CSSRuleList): Match[] => {
      const matches: Match[] = [];
      for (const rule of [...rules]) {
        if (rule instanceof CSSStyleRule) {
          let elements: Element[] = [];
          try { elements = [...document.querySelectorAll(rule.selectorText)].slice(0, 64); } catch { /* ignore invalid legacy selector */ }
          if (elements.length > 0) {
            for (const property of [...rule.style]) {
              if (property.startsWith('--')) continue;
              const token = rule.style.getPropertyValue(property).match(/var\((--dc-theme-[A-Za-z0-9_-]+)/)?.[1];
              if (token) {
                for (const element of elements) matches.push({ element, property, token });
              }
            }
          }
        }
        if ('cssRules' in rule) {
          try {
            matches.push(...findMatches((rule as CSSGroupingRule).cssRules));
          } catch { /* inaccessible or unsupported grouping rule */ }
        }
        if (rule instanceof CSSImportRule && rule.styleSheet) {
          try {
            matches.push(...findMatches(rule.styleSheet.cssRules));
          } catch { /* local import may still be loading; later sheets remain testable */ }
        }
      }
      return matches;
    };
    const replacementCandidates = (property: string, before: string): string[] => {
      const normalized = property.toLowerCase();
      if (normalized === 'font') return ['italic 900 37px/1.2 monospace', 'normal 100 41px/1.8 serif'];
      if (normalized === 'font-family') return before.includes('monospace') ? ['serif', 'sans-serif'] : ['monospace', 'serif'];
      if (normalized === 'font-size') return before === '37px' ? ['41px'] : ['37px', '41px'];
      if (normalized === 'font-weight') return before === '900' ? ['100'] : ['900', '100'];
      if (normalized === 'font-style') return before === 'italic' ? ['normal'] : ['italic', 'normal'];
      if (normalized === 'font-variant') return before.includes('small-caps') ? ['normal'] : ['small-caps', 'normal'];
      if (normalized === 'font-stretch') return before === 'expanded' ? ['condensed'] : ['expanded', 'condensed'];
      if (normalized.startsWith('font-')) return ['normal', 'none', '1.5', '37px', '900', 'monospace'];
      return before.includes('1, 2, 3')
        ? ['rgb(253, 252, 251)', 'rgba(253, 252, 251, .91)']
        : ['rgb(1, 2, 3)', 'rgba(1, 2, 3, .91)'];
    };
    for (const sheet of [...document.styleSheets]) {
      let matches: Match[] = [];
      try { matches = findMatches(sheet.cssRules); } catch { continue; }
      for (const match of matches) {
        const before = getComputedStyle(match.element).getPropertyValue(match.property).trim();
        for (const replacement of replacementCandidates(match.property, before)) {
          if (!CSS.supports(match.property, replacement)) continue;
          const rootStyle = document.documentElement.style;
          const originalValue = rootStyle.getPropertyValue(match.token);
          const originalPriority = rootStyle.getPropertyPriority(match.token);
          const hadOriginalValue = [...rootStyle].includes(match.token);
          let after = before;
          try {
            rootStyle.setProperty(match.token, replacement, 'important');
            after = getComputedStyle(match.element).getPropertyValue(match.property).trim();
          } finally {
            if (hadOriginalValue) rootStyle.setProperty(match.token, originalValue, originalPriority);
            else rootStyle.removeProperty(match.token);
          }
          if (before !== after) return true;
        }
      }
    }
    return false;
  });
  if (!themeChanged) issues.push({ code: 'theme_smoke_failed', severity: 'critical', detail: 'Theme variable did not update computed styles' });

  const interactions = await page.evaluate(async () => {
    let navigationPassed = true;
    let navigationChecks = 0;
    for (const control of [...document.querySelectorAll<HTMLElement>('[aria-controls][aria-expanded]')]) {
      const targetId = control.getAttribute('aria-controls');
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) {
        navigationPassed = false;
        continue;
      }
      const beforeExpanded = control.getAttribute('aria-expanded');
      const beforeOpen = target.classList.contains('is-open');
      let changed = false;
      let restored = false;
      try {
        control.click();
        navigationChecks += 1;
        changed = control.getAttribute('aria-expanded') !== beforeExpanded
          && target.classList.contains('is-open') === (beforeExpanded !== 'true');
        control.click();
        restored = control.getAttribute('aria-expanded') === beforeExpanded
          && target.classList.contains('is-open') === beforeOpen;
      } finally {
        if (beforeExpanded === null) control.removeAttribute('aria-expanded');
        else control.setAttribute('aria-expanded', beforeExpanded);
        target.classList.toggle('is-open', beforeOpen);
      }
      navigationPassed = navigationPassed && changed && restored;
    }

    let formPassed = true;
    let formChecks = 0;
    const simplePatternWitness = (pattern: string): string | undefined => {
      let source = pattern.replace(/^\^/, '').replace(/\$$/, '');
      let output = '';
      const classWitness = (body: string): string | undefined => {
        for (const candidate of ['0', '1', 'a', 'A', 'x', '_', '-', ' ', '@', '.']) {
          try {
            let expression: RegExp;
            try { expression = new RegExp(`^[${body}]$`, 'v'); }
            catch { expression = new RegExp(`^[${body}]$`, 'u'); }
            if (expression.test(candidate)) return candidate;
          } catch { return undefined; }
        }
        return undefined;
      };
      for (let index = 0; index < source.length;) {
        let atom = '';
        const character = source[index]!;
        if (character === '\\') {
          const escaped = source[index + 1];
          if (!escaped) return undefined;
          atom = escaped === 'd' ? '0'
            : escaped === 'w' ? 'a'
              : escaped === 's' ? ' '
                : escaped === 'D' ? 'a'
                  : escaped === 'W' ? '-'
                    : escaped === 'S' ? 'a'
                      : escaped;
          index += 2;
        } else if (character === '[') {
          let end = index + 1;
          let escaped = false;
          while (end < source.length) {
            if (!escaped && source[end] === ']') break;
            escaped = !escaped && source[end] === '\\';
            if (source[end] !== '\\') escaped = false;
            end += 1;
          }
          if (end >= source.length) return undefined;
          const witness = classWitness(source.slice(index + 1, end));
          if (witness === undefined) return undefined;
          atom = witness;
          index = end + 1;
        } else if (character === '.') {
          atom = 'a';
          index += 1;
        } else if ('()|{}'.includes(character) || character === '*' || character === '+' || character === '?') {
          return undefined;
        } else {
          atom = character;
          index += 1;
        }

        let repetitions = 1;
        const bounded = source.slice(index).match(/^\{(\d+)(?:,(\d*)?)?\}/);
        if (bounded) {
          repetitions = Number(bounded[1]);
          index += bounded[0].length;
        } else if (source[index] === '+') {
          index += 1;
        } else if (source[index] === '?') {
          index += 1;
        } else if (source[index] === '*') {
          repetitions = 0;
          index += 1;
        }
        if (!Number.isSafeInteger(repetitions) || repetitions > 256) return undefined;
        output += atom.repeat(repetitions);
      }
      return output;
    };
    const tryValues = (field: HTMLInputElement | HTMLTextAreaElement, candidates: readonly (string | undefined)[]): boolean => {
      for (const candidate of [...new Set(candidates.filter((value): value is string => value !== undefined))]) {
        field.value = candidate;
        if (field.checkValidity()) return true;
      }
      return field.checkValidity();
    };
    const textCandidates = (field: HTMLInputElement | HTMLTextAreaElement, seeds: readonly string[]): string[] => {
      const minimum = Math.max(field.minLength, field.required ? 1 : 0, 0);
      const maximum = field.maxLength >= 0 ? field.maxLength : Math.max(minimum, 64);
      const target = Math.min(Math.max(minimum, 1), maximum);
      const repeated = (character: string) => character.repeat(Math.max(0, target));
      const pattern = field instanceof HTMLInputElement && field.pattern
        ? simplePatternWitness(field.pattern)
        : undefined;
      return [
        field.value,
        field.defaultValue,
        field.getAttribute('value') ?? undefined,
        field.getAttribute('placeholder') ?? undefined,
        pattern,
        ...seeds,
        repeated('0'),
        repeated('a'),
        repeated('A'),
      ].filter((value): value is string => value !== undefined);
    };
    for (const form of [...document.querySelectorAll<HTMLFormElement>('form[data-dc-standard-form]')]) {
      const originalValues = new Map<Element, { value: string; checked?: boolean; selectedIndex?: number }>();
      for (const field of [...form.elements]) {
        if (field instanceof HTMLInputElement) {
          originalValues.set(field, { value: field.value, checked: field.checked });
          if (field.type === 'checkbox' || field.type === 'radio') {
            if (field.required) field.checked = true;
          } else if (field.type === 'file') {
            if (field.required && !field.files?.length) {
              const transfer = new DataTransfer();
              transfer.items.add(new File(['sentinel'], 'sentinel.txt', { type: 'text/plain' }));
              field.files = transfer.files;
            }
          } else if (['date', 'datetime-local', 'month', 'week', 'time', 'number', 'range'].includes(field.type)) {
            if (field.required || !field.checkValidity()) {
              tryValues(field, [field.value, field.defaultValue, field.min, field.max,
                field.type === 'date' ? '2030-01-15'
                  : field.type === 'datetime-local' ? '2030-01-15T12:00'
                    : field.type === 'month' ? '2030-01'
                      : field.type === 'week' ? '2030-W03'
                        : field.type === 'time' ? '12:00'
                          : '0',
                field.type === 'number' || field.type === 'range' ? '1' : undefined]);
            }
          } else if (!['button', 'submit', 'reset', 'image', 'hidden', 'color'].includes(field.type)) {
            if (!field.required && !field.value) continue;
            const seeds = field.type === 'email'
              ? ['sentinel@example.test', 'visitor@example.com']
              : field.type === 'tel'
                ? ['2125550199', '212-555-0199']
                : field.type === 'url'
                  ? ['https://example.test/', 'https://example.com/']
                  : ['Sentinel visitor', '12345', 'ABC123'];
            tryValues(field, textCandidates(field, seeds));
          }
        } else if (field instanceof HTMLTextAreaElement) {
          originalValues.set(field, { value: field.value });
          if (field.required || field.value) {
            tryValues(field, textCandidates(field, ['Sentinel general inquiry', '12345']));
          }
        } else if (field instanceof HTMLSelectElement) {
          originalValues.set(field, { value: field.value, selectedIndex: field.selectedIndex });
          if (field.required && !field.checkValidity()) {
            const candidate = [...field.options].find((option) => !option.disabled && Boolean(option.value));
            if (candidate) candidate.selected = true;
          }
        }
      }
      const dataControls = [...form.elements].filter((field): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        (field instanceof HTMLInputElement && !['button', 'submit', 'reset', 'image'].includes(field.type))
        || field instanceof HTMLSelectElement
        || field instanceof HTMLTextAreaElement,
      );
      const namesPassed = dataControls.every((field) => Boolean(field.name.trim()));
      let compatibilityEvent = false;
      const observeCompatibility = () => { compatibilityEvent = true; };
      const preventNavigation = (event: SubmitEvent) => event.preventDefault();
      form.addEventListener('dc:form-submit', observeCompatibility, { once: true });
      form.addEventListener('submit', preventNavigation, { once: true, capture: true });
      try {
        form.requestSubmit();
        await Promise.resolve();
        formChecks += 1;
        const submitted = new FormData(form);
        const successfulControlsPassed = dataControls.every((field) => {
          if (field.disabled) return true;
          if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type) && !field.checked) return true;
          if (field instanceof HTMLSelectElement && field.selectedOptions.length === 0) return true;
          return submitted.has(field.name);
        });
        formPassed = formPassed && namesPassed && successfulControlsPassed && compatibilityEvent;
      } finally {
        form.removeEventListener('dc:form-submit', observeCompatibility);
        form.removeEventListener('submit', preventNavigation, true);
        for (const [field, original] of originalValues) {
          if (field instanceof HTMLInputElement) {
            field.value = original.value;
            if (original.checked !== undefined) field.checked = original.checked;
          } else if (field instanceof HTMLTextAreaElement) field.value = original.value;
          else if (field instanceof HTMLSelectElement) field.selectedIndex = original.selectedIndex ?? -1;
        }
      }
    }
    return { navigationPassed, navigationChecks, formPassed, formChecks };
  });
  if (!interactions.navigationPassed) {
    issues.push({ code: 'navigation_smoke_failed', severity: 'critical', detail: `${interactions.navigationChecks} navigation controls were exercised but did not restore cleanly` });
  }
  if (!interactions.formPassed) {
    issues.push({ code: 'form_smoke_failed', severity: 'critical', detail: `${interactions.formChecks} standardized forms did not dispatch the compatibility event` });
  }
  if (interactions.formChecks !== state.forms.length) {
    issues.push({
      code: 'form_compatibility_missing',
      severity: 'critical',
      detail: `Exercised ${interactions.formChecks}/${state.forms.length} forms through the standard compatibility path`,
    });
  }

  return {
    issues,
    visibleTextLength: state.textLength,
    editSlotCount: state.editSlotCount,
    imageSlotCount: state.imageSlotCount,
    contrastRepairs: [...new Map(contrastRepairs.map((repair) => [
      `${repair.selector}\0${repair.foreground}\0${(repair.opacitySelectors ?? []).join('\0')}`,
      repair,
    ])).values()],
    linkInTextBlockRepairs: [...new Map(linkInTextBlockRepairs.map((repair) => [
      repair.selector,
      repair,
    ])).values()],
  };
}

async function renderOnce(
  browser: Browser,
  serverOrigin: string,
  serverRoot: string,
  task: RenderTask,
  viewport: LegacyViewportName,
  options: Required<Pick<RenderRunOptions, 'evidenceRoot' | 'timeoutMs'>>,
): Promise<Omit<RenderEvidence, 'attempts'>> {
  const started = performance.now();
  const context = await configureContext(browser, viewport);
  const page = await context.newPage();
  try {
    const relativeDir = relative(serverRoot, task.templateDir).replace(/\\/g, '/');
    if (relativeDir.startsWith('../') || relativeDir === '..') throw new Error('Render task escapes server root');
    const url = `${serverOrigin}/${relativeDir.split('/').map(encodeURIComponent).join('/')}/${task.page.split('/').map(encodeURIComponent).join('/')}`;
    const inspection = await inspectPage(page, serverOrigin, url, task.page, options.timeoutMs);
    const passed = inspection.issues.length === 0;
    const screenshot = await screenshotEvidence(page, options.evidenceRoot, task, viewport, passed);
    return {
      key: task.key,
      page: task.page,
      viewport,
      passed,
      durationMs: Math.round(performance.now() - started),
      ...inspection,
      ...screenshot,
    };
  } finally {
    await context.close();
  }
}

async function renderWithRetries(
  browser: Browser,
  serverOrigin: string,
  serverRoot: string,
  task: RenderTask,
  viewport: LegacyViewportName,
  options: Required<Pick<RenderRunOptions, 'evidenceRoot' | 'timeoutMs' | 'retries'>>,
): Promise<RenderEvidence> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    try {
      const result = await renderOnce(browser, serverOrigin, serverRoot, task, viewport, options);
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    key: task.key,
    page: task.page,
    viewport,
    passed: false,
    attempts: options.retries + 1,
    durationMs: 0,
    visibleTextLength: 0,
    editSlotCount: 0,
    imageSlotCount: 0,
    issues: [{
      code: 'browser_failure',
      severity: 'critical',
      detail: lastError instanceof Error ? lastError.message : String(lastError),
    }],
  };
}

export async function renderTemplateTasks(
  serverRootInput: string,
  tasks: readonly RenderTask[],
  options: RenderRunOptions,
): Promise<RenderEvidence[]> {
  const serverRoot = resolve(serverRootInput);
  // Register every page up front so its artifact URL is served through the
  // same two app-owned composition functions as a customer preview. All other
  // files at those artifact URLs remain byte-for-byte static subresources.
  const server = await startTemplateServer(serverRoot, { renderTasks: tasks });
  const workers = recommendedRenderWorkers(options.workers);
  const settings = {
    evidenceRoot: resolve(options.evidenceRoot),
    retries: options.retries ?? 3,
    recycleEvery: options.recycleEvery ?? 1_000,
    timeoutMs: options.timeoutMs ?? 10_000,
    headless: options.headless ?? true,
  };
  const queue: Array<{ task: RenderTask; viewport: LegacyViewportName }> = [];
  for (const task of tasks) {
    queue.push({ task, viewport: 'desktop' }, { task, viewport: 'mobile' });
  }
  const results = new Array<RenderEvidence>(queue.length);
  let cursor = 0;

  try {
    await Promise.all(Array.from({ length: Math.min(workers, queue.length || 1) }, async () => {
      let browser = await chromium.launch({ headless: settings.headless });
      let renderedByBrowser = 0;
      try {
        while (cursor < queue.length && !options.signal?.aborted) {
          const index = cursor++;
          const item = queue[index]!;
          if (renderedByBrowser >= settings.recycleEvery) {
            await browser.close();
            browser = await chromium.launch({ headless: settings.headless });
            renderedByBrowser = 0;
          }
          let evidence = await renderWithRetries(
            browser,
            server.origin,
            serverRoot,
            item.task,
            item.viewport,
            settings,
          );
          if (!browser.isConnected()) {
            await browser.close().catch(() => undefined);
            browser = await chromium.launch({ headless: settings.headless });
            renderedByBrowser = 0;
            evidence = await renderWithRetries(
              browser,
              server.origin,
              serverRoot,
              item.task,
              item.viewport,
              settings,
            );
          }
          results[index] = evidence;
          renderedByBrowser += 1;
          await options.onEvidence?.(evidence);
        }
      } finally {
        await browser.close();
      }
    }));
  } finally {
    await server.close();
  }
  if (options.signal?.aborted) {
    const reason = options.signal.reason;
    throw reason instanceof Error ? reason : new Error('Legacy template rendering cancelled');
  }
  return results;
}

export function hammingDistance(first: string, second: string): number {
  if (!/^[0-9a-f]+$/i.test(first) || !/^[0-9a-f]+$/i.test(second) || first.length !== second.length) {
    throw new Error('Perceptual hashes must be equal-length hexadecimal strings');
  }
  let value = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let distance = 0;
  while (value > 0n) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

export interface LosslessScreenshotSource {
  path: string;
  sha256: string;
}

export interface ViewportScreenshotSources {
  desktop: { first: LosslessScreenshotSource; second: LosslessScreenshotSource };
  mobile: { first: LosslessScreenshotSource; second: LosslessScreenshotSource };
}

function pixelSsim(first: Buffer, second: Buffer): number {
  if (first.length !== second.length || first.length === 0) return 0;
  const length = first.length;
  let meanA = 0;
  let meanB = 0;
  for (let index = 0; index < length; index += 1) {
    meanA += first[index]!;
    meanB += second[index]!;
  }
  meanA /= length;
  meanB /= length;
  let varianceA = 0;
  let varianceB = 0;
  let covariance = 0;
  for (let index = 0; index < length; index += 1) {
    const deltaA = first[index]! - meanA;
    const deltaB = second[index]! - meanB;
    varianceA += deltaA * deltaA;
    varianceB += deltaB * deltaB;
    covariance += deltaA * deltaB;
  }
  const divisor = Math.max(1, length - 1);
  varianceA /= divisor;
  varianceB /= divisor;
  covariance /= divisor;
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  return ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
    ((meanA ** 2 + meanB ** 2 + c1) * (varianceA + varianceB + c2));
}

async function verifiedScreenshot(source: LosslessScreenshotSource): Promise<{
  encoded: Buffer;
  width: number;
  height: number;
}> {
  if (!/^[0-9a-f]{64}$/i.test(source.sha256)) {
    throw new Error('Lossless screenshot evidence requires a SHA-256 digest');
  }
  const encoded = await readFile(source.path);
  if (sha256(encoded) !== source.sha256.toLowerCase()) {
    throw new Error(`Lossless screenshot evidence failed its content hash: ${source.path}`);
  }
  const metadata = await sharp(encoded).metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) {
    throw new Error(`Lossless screenshot evidence is not a readable PNG: ${source.path}`);
  }
  return { encoded, width: metadata.width, height: metadata.height };
}

/**
 * SSIM over the browser screenshot's native, losslessly decoded RGB pixels.
 * A dimension mismatch fails closed instead of stretching unrelated layouts
 * into the same 128x128 square, and no lossy thumbnail is consulted.
 */
export async function losslessScreenshotSsim(
  firstSource: LosslessScreenshotSource,
  secondSource: LosslessScreenshotSource,
): Promise<number> {
  const [first, second] = await Promise.all([
    verifiedScreenshot(firstSource),
    verifiedScreenshot(secondSource),
  ]);
  if (first.width !== second.width || first.height !== second.height) return 0;
  const [firstPixels, secondPixels] = await Promise.all([
    sharp(first.encoded).flatten({ background: '#ffffff' }).toColourspace('srgb').raw().toBuffer(),
    sharp(second.encoded).flatten({ background: '#ffffff' }).toColourspace('srgb').raw().toBuffer(),
  ]);
  return pixelSsim(firstPixels, secondPixels);
}

/** Compare both required browser viewports independently. */
export async function compareViewportScreenshotPixels(
  sources: ViewportScreenshotSources,
): Promise<{ desktopSsim: number; mobileSsim: number }> {
  const [desktopSsim, mobileSsim] = await Promise.all([
    losslessScreenshotSsim(sources.desktop.first, sources.desktop.second),
    losslessScreenshotSsim(sources.mobile.first, sources.mobile.second),
  ]);
  return { desktopSsim, mobileSsim };
}

/** Preview/contact-sheet helper only. Never use lossy thumbnails as dedupe evidence. */
export async function thumbnailSsim(firstPath: string, secondPath: string): Promise<number> {
  const width = 128;
  const height = 128;
  const [firstEncoded, secondEncoded] = await Promise.all([readFile(firstPath), readFile(secondPath)]);
  const [first, second] = await Promise.all([
    sharp(firstEncoded).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer(),
    sharp(secondEncoded).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer(),
  ]);
  return pixelSsim(first, second);
}

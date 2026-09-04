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
  selectOption: 'passed' | 'missing' | 'failed';
  standaloneImage: 'passed' | 'missing' | 'failed';
  responsivePicture: 'passed' | 'missing' | 'failed';
  navigation: 'passed' | 'missing' | 'failed';
  editReachability: { checked: number; passed: number; external: number; failedIds: string[] };
  imageReachability: { checked: number; passed: number; failedIds: string[] };
  details: string[];
}

type PreviewMessage = Record<string, unknown> & { type?: string };
type CheckStatus = 'passed' | 'missing' | 'failed';
type PhysicalHitMode = 'text' | 'image' | 'background' | 'option' | 'navigation';

interface PhysicalHitPoint {
  x: number;
  y: number;
  disclosureIds: string[];
}

interface ImageInteractionGroup {
  kind: 'standalone' | 'picture';
  primarySlotId: string;
  slotIds: string[];
  mode: 'image' | 'background';
}

async function installEditorQaRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = window as typeof window & { __dcEditorQaMessages?: PreviewMessage[] };
    if (scope.__dcEditorQaMessages) return;
    scope.__dcEditorQaMessages = [];
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data || typeof event.data !== 'object') return;
      scope.__dcEditorQaMessages!.push(event.data as PreviewMessage);
    });
  });
}

async function physicalMessage(
  page: Page,
  type: string,
  trigger: () => Promise<void>,
  timeoutMs = 1_000,
): Promise<PreviewMessage | null> {
  const start = await page.evaluate(() => (
    (window as typeof window & { __dcEditorQaMessages?: PreviewMessage[] }).__dcEditorQaMessages?.length ?? 0
  ));
  try {
    await trigger();
    await page.waitForFunction(({ expectedType, offset }) => {
      const messages = (window as typeof window & { __dcEditorQaMessages?: PreviewMessage[] }).__dcEditorQaMessages ?? [];
      return messages.slice(offset).some((message) => message.type === expectedType);
    }, { expectedType: type, offset: start }, { timeout: timeoutMs });
    return await page.evaluate(({ expectedType, offset }) => {
      const messages = (window as typeof window & { __dcEditorQaMessages?: PreviewMessage[] }).__dcEditorQaMessages ?? [];
      return messages.slice(offset).find((message) => message.type === expectedType) ?? null;
    }, { expectedType: type, offset: start });
  } catch {
    return null;
  }
}

/**
 * Resolve a real coordinate accepted by the same event path as the customer
 * editor. This deliberately starts with elementFromPoint and is followed by a
 * Playwright mouse action; dispatchEvent on the advertised node would bypass
 * overlays, pointer-events, clipping, and covered background owners.
 */
async function physicalHitPoint(
  page: Page,
  attribute: 'data-dc-edit-id' | 'data-pb-edit-id' | 'data-dc-image-id' | 'data-pb-image-id' | 'data-dc-qa-navigation',
  id: string,
  mode: PhysicalHitMode,
): Promise<PhysicalHitPoint | null> {
  const disclosurePath = await page.evaluate(({ targetAttribute, targetId }) => {
    const targets = [...document.querySelectorAll<HTMLElement>(`[${targetAttribute}]`)]
      .filter((candidate) => candidate.getAttribute(targetAttribute) === targetId);
    if (targets.length !== 1) return null;
    const target = targets[0]!;
    const ancestors: HTMLDetailsElement[] = [];
    let cursor = target.parentElement;
    while (cursor) {
      if (cursor instanceof HTMLDetailsElement && !cursor.open) ancestors.unshift(cursor);
      cursor = cursor.parentElement;
    }
    return ancestors.map((details, index) => {
      const summary = [...details.children].find((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'SUMMARY');
      const id = `details-${index}`;
      if (!summary) return { id, summaryId: '' };
      details.setAttribute('data-dc-qa-disclosure', id);
      summary.setAttribute('data-dc-qa-disclosure-summary', id);
      return { id, summaryId: id };
    });
  }, { targetAttribute: attribute, targetId: id });
  if (!disclosurePath) return null;

  const openedDisclosureIds: string[] = [];
  for (const disclosure of disclosurePath) {
    if (!disclosure.summaryId) {
      await page.evaluate(() => {
        document.querySelectorAll('[data-dc-qa-disclosure],[data-dc-qa-disclosure-summary]').forEach((element) => {
          element.removeAttribute('data-dc-qa-disclosure');
          element.removeAttribute('data-dc-qa-disclosure-summary');
        });
      });
      return null;
    }
    try {
      await page.locator(`[data-dc-qa-disclosure-summary="${disclosure.summaryId}"]`).click({ timeout: 750 });
      await page.waitForFunction((disclosureId) => (
        document.querySelector<HTMLDetailsElement>(`details[data-dc-qa-disclosure="${disclosureId}"]`)?.open === true
      ), disclosure.id, { timeout: 750 });
      openedDisclosureIds.push(disclosure.id);
    } catch {
      await page.evaluate((ids) => {
        for (const disclosureId of ids) {
          const details = document.querySelector<HTMLDetailsElement>(`details[data-dc-qa-disclosure="${CSS.escape(disclosureId)}"]`);
          if (details) details.open = false;
        }
        document.querySelectorAll('[data-dc-qa-disclosure],[data-dc-qa-disclosure-summary]').forEach((element) => {
          element.removeAttribute('data-dc-qa-disclosure');
          element.removeAttribute('data-dc-qa-disclosure-summary');
        });
      }, openedDisclosureIds);
      return null;
    }
  }

  const point = await page.evaluate(({ targetAttribute, targetId, hitMode }) => {
    const targets = [...document.querySelectorAll<HTMLElement>(`[${targetAttribute}]`)]
      .filter((candidate) => candidate.getAttribute(targetAttribute) === targetId);
    if (targets.length !== 1) return null;
    const declaredTarget = targets[0]!;
    let hitTarget = declaredTarget;
    if (hitMode === 'option') {
      const select = declaredTarget.closest('select');
      if (!(select instanceof HTMLSelectElement)) return null;
      const optionIndex = [...select.options].indexOf(declaredTarget as HTMLOptionElement);
      if (optionIndex < 0 || declaredTarget.hidden || (declaredTarget as HTMLOptionElement).disabled) return null;
      select.selectedIndex = optionIndex;
      hitTarget = select;
    }
    const hiddenByLayout = (element: HTMLElement): boolean => {
      let opacity = 1;
      let cursor: HTMLElement | null = element;
      while (cursor) {
        const style = getComputedStyle(cursor);
        if (
          cursor.hidden || cursor.inert || style.display === 'none'
          || style.visibility === 'hidden' || style.visibility === 'collapse'
          || style.contentVisibility === 'hidden'
        ) return true;
        const ownOpacity = Number.parseFloat(style.opacity);
        if (Number.isFinite(ownOpacity)) opacity *= ownOpacity;
        cursor = cursor.parentElement;
      }
      return opacity < 0.01;
    };
    if (hiddenByLayout(hitTarget)) return null;
    if ((hitMode === 'image' || hitMode === 'background') && getComputedStyle(hitTarget).pointerEvents === 'none') return null;
    hitTarget.scrollIntoView({ block: 'center', inline: 'center' });
    const protectedSelector = 'a[href],button,input,select,textarea,option,label,summary,[role="button"],[role="link"]';
    const editId = (element: Element) => element.getAttribute('data-dc-edit-id') || element.getAttribute('data-pb-edit-id') || '';
    const imageId = (element: Element) => element.getAttribute('data-dc-image-id') || element.getAttribute('data-pb-image-id') || '';
    const accepts = (top: Element): boolean => {
      if (hitMode === 'image') {
        return top.closest('img[data-dc-image-id],img[data-pb-image-id]') === declaredTarget;
      }
      if (hitMode === 'background') {
        if (declaredTarget.matches(protectedSelector)) return false;
        const owner = top.closest('[data-dc-image-id],[data-pb-image-id]');
        if (owner !== declaredTarget) return false;
        let cursor: Element | null = top;
        while (cursor && cursor !== declaredTarget) {
          if (cursor.matches(protectedSelector) || editId(cursor) || imageId(cursor)) return false;
          cursor = cursor.parentElement;
        }
        return cursor === declaredTarget;
      }
      if (hitMode === 'option') return top === hitTarget || hitTarget.contains(top);
      if (hitMode === 'navigation') {
        return top.closest('a[href]') === declaredTarget
          && !top.closest('img[data-dc-image-id],img[data-pb-image-id]');
      }
      return top.closest('[data-dc-edit-id],[data-pb-edit-id]') === declaredTarget;
    };
    const points: Array<{ x: number; y: number }> = [];
    for (const rect of [...hitTarget.getClientRects()]) {
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      if (right - left < 1 || bottom - top < 1) continue;
      const fractions = [0.5, 0.12, 0.88, 0.28, 0.72];
      for (const yFraction of fractions) {
        for (const xFraction of fractions) {
          points.push({
            x: left + (right - left) * xFraction,
            y: top + (bottom - top) * yFraction,
          });
        }
      }
    }
    for (const point of points) {
      const top = document.elementFromPoint(point.x, point.y);
      if (top && accepts(top)) return point;
    }
    return null;
  }, { targetAttribute: attribute, targetId: id, hitMode: mode });
  if (!point) {
    await restorePhysicalDisclosurePath(page, openedDisclosureIds);
    return null;
  }
  return { ...point, disclosureIds: openedDisclosureIds };
}

async function restorePhysicalDisclosurePath(page: Page, disclosureIds: readonly string[]): Promise<void> {
  await page.evaluate((ids) => {
    for (const disclosureId of [...ids].reverse()) {
      const details = document.querySelector<HTMLDetailsElement>(`details[data-dc-qa-disclosure="${CSS.escape(disclosureId)}"]`);
      if (details) details.open = false;
    }
    document.querySelectorAll('[data-dc-qa-disclosure],[data-dc-qa-disclosure-summary]').forEach((element) => {
      element.removeAttribute('data-dc-qa-disclosure');
      element.removeAttribute('data-dc-qa-disclosure-summary');
    });
  }, disclosureIds);
}

async function inspectTextSlotReachability(page: Page): Promise<CustomerEditorRuntimeCheck['editReachability']> {
  return page.evaluate(() => {
    const selector = '[data-dc-edit-id],[data-pb-edit-id]';
    const elements = [...document.querySelectorAll<HTMLElement>(selector)];
    let passed = 0;
    let external = 0;
    const failedIds: string[] = [];
    const idFor = (element: Element) => element.getAttribute('data-dc-edit-id') || element.getAttribute('data-pb-edit-id') || '';
    const hiddenByLayout = (element: HTMLElement): boolean => {
      let opacity = 1;
      let cursor: HTMLElement | null = element;
      while (cursor) {
        const style = getComputedStyle(cursor);
        if (
          cursor.hidden || cursor.inert || style.display === 'none'
          || style.visibility === 'hidden' || style.visibility === 'collapse'
          || style.contentVisibility === 'hidden'
        ) return true;
        const ownOpacity = Number.parseFloat(style.opacity);
        if (Number.isFinite(ownOpacity)) opacity *= ownOpacity;
        cursor = cursor.parentElement;
      }
      return opacity < 0.01;
    };
    const hasPoint = (declaredTarget: HTMLElement, hitTarget: HTMLElement, option = false): boolean => {
      if (hiddenByLayout(hitTarget) || getComputedStyle(hitTarget).pointerEvents === 'none') return false;
      hitTarget.scrollIntoView({ block: 'center', inline: 'center' });
      for (const rect of [...hitTarget.getClientRects()]) {
        const left = Math.max(0, rect.left);
        const right = Math.min(window.innerWidth, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        if (right - left < 1 || bottom - top < 1) continue;
        for (const fraction of [0.5, 0.15, 0.85, 0.3, 0.7]) {
          const points = [
            { x: left + (right - left) * fraction, y: top + (bottom - top) * 0.5 },
            { x: left + (right - left) * 0.5, y: top + (bottom - top) * fraction },
          ];
          for (const point of points) {
            const physicalTarget = document.elementFromPoint(point.x, point.y);
            if (!physicalTarget) continue;
            if (option) {
              if (physicalTarget === hitTarget || hitTarget.contains(physicalTarget)) return true;
            } else if (physicalTarget.closest(selector) === declaredTarget) {
              return true;
            }
          }
        }
      }
      return false;
    };
    const throughReachableDisclosures = (target: HTMLElement, inspect: () => boolean): boolean => {
      const closedAncestors: HTMLDetailsElement[] = [];
      let cursor = target.parentElement;
      while (cursor) {
        if (cursor instanceof HTMLDetailsElement && !cursor.open) closedAncestors.unshift(cursor);
        cursor = cursor.parentElement;
      }
      const opened: HTMLDetailsElement[] = [];
      try {
        for (const details of closedAncestors) {
          const summary = [...details.children]
            .find((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'SUMMARY');
          // A native disclosure is a real customer path only when its own
          // control is visible and physically reachable in the current
          // viewport. Opening it temporarily lets us hit-test the advertised
          // descendant without certifying dead modal/off-canvas content.
          if (!summary || !hasPoint(summary, summary)) return false;
          details.open = true;
          opened.push(details);
        }
        return inspect();
      } finally {
        for (const details of opened.reverse()) details.open = false;
      }
    };
    for (const element of elements) {
      const id = idFor(element);
      if (!id) {
        failedIds.push('(empty)');
        continue;
      }
      if (element.closest('head')) {
        const isSeoSlot = element.tagName === 'TITLE'
          || (element.tagName === 'META' && (element.getAttribute('name') || '').toLowerCase() === 'description');
        if (isSeoSlot) {
          external += 1;
          passed += 1;
        } else failedIds.push(id);
        continue;
      }
      if (element.tagName === 'OPTION') {
        const select = element.closest('select');
        if (!(select instanceof HTMLSelectElement) || element.hidden || (element as HTMLOptionElement).disabled) {
          failedIds.push(id);
          continue;
        }
        const index = [...select.options].indexOf(element as HTMLOptionElement);
        const previous = select.selectedIndex;
        select.selectedIndex = index;
        const reachable = throughReachableDisclosures(element, () => hasPoint(element, select, true));
        select.selectedIndex = previous;
        if (reachable) passed += 1;
        else failedIds.push(id);
        continue;
      }
      if (throughReachableDisclosures(element, () => hasPoint(element, element))) passed += 1;
      else failedIds.push(id);
    }
    return { checked: elements.length, passed, external, failedIds };
  });
}

async function imageInteractionGroups(page: Page): Promise<ImageInteractionGroup[]> {
  return page.evaluate(() => {
    const selector = '[data-dc-image-id],[data-pb-image-id]';
    const idFor = (element: Element) => element.getAttribute('data-dc-image-id') || element.getAttribute('data-pb-image-id') || '';
    const groups: ImageInteractionGroup[] = [];
    const assigned = new Set<Element>();
    for (const picture of [...document.querySelectorAll('picture')]) {
      const responsive = [...picture.children].filter((child) => child.tagName === 'SOURCE' || child.tagName === 'IMG');
      const advertised = responsive.filter((child) => idFor(child));
      if (advertised.length === 0) continue;
      for (const element of advertised) assigned.add(element);
      const image = responsive.find((child) => child.tagName === 'IMG');
      const primarySlotId = image ? idFor(image) : '';
      groups.push({
        kind: 'picture',
        primarySlotId,
        slotIds: advertised.map(idFor),
        mode: 'image',
      });
    }
    for (const element of [...document.querySelectorAll<HTMLElement>(selector)]) {
      if (assigned.has(element)) continue;
      const slotId = idFor(element);
      groups.push({
        kind: 'standalone',
        primarySlotId: slotId,
        slotIds: [slotId],
        mode: element.tagName === 'IMG' ? 'image' : 'background',
      });
    }
    return groups;
  });
}

/** Exercise the exact app-owned iframe runtime through physically hit-tested browser actions. */
async function exerciseCustomerEditorRuntime(page: Page, currentPage: string): Promise<CustomerEditorRuntimeCheck> {
  const details: string[] = [];
  const sentinelText = 'SENTINEL EDIT PERSISTED';
  const sentinelImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  await installEditorQaRecorder(page);
  const installed = await page.evaluate((expectedRuntime) => (
    (window as typeof window & { __dailyClarityCustomerPreviewEditorRuntime?: string })
      .__dailyClarityCustomerPreviewEditorRuntime === expectedRuntime
      && document.querySelectorAll(`script[data-dc-runtime="${expectedRuntime}"]`).length === 1
  ), 'customer-preview-editor-v1');
  const editReachability = await inspectTextSlotReachability(page);
  if (editReachability.failedIds.length > 0) {
    details.push(`unreachable text IDs: ${editReachability.failedIds.slice(0, 12).join(', ')}`);
  }

  let leafText: CheckStatus = 'missing';
  const leaf = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')];
    const element = candidates.find((candidate) => document.body.contains(candidate)
      && !candidate.hasAttribute('data-dc-edit-attribute')
      && !candidate.hasAttribute('data-pb-edit-attribute')
      && candidate.tagName !== 'OPTION'
      && !candidate.matches('a,button,label,summary')
      && candidate.children.length === 0);
    if (!element) return null;
    return {
      attribute: element.hasAttribute('data-dc-edit-id') ? 'data-dc-edit-id' as const : 'data-pb-edit-id' as const,
      id: element.getAttribute('data-dc-edit-id') || element.getAttribute('data-pb-edit-id') || '',
      html: element.innerHTML,
      style: element.getAttribute('style'),
      contenteditable: element.getAttribute('contenteditable'),
      text: element.textContent || '',
    };
  });
  if (leaf) {
    const point = await physicalHitPoint(page, leaf.attribute, leaf.id, 'text');
    if (point) {
      try {
        const message = await physicalMessage(page, 'textEdited', async () => {
          await page.mouse.dblclick(point.x, point.y);
          const editing = await page.evaluate(({ attribute, id }) => {
            const element = [...document.querySelectorAll<HTMLElement>(`[${attribute}]`)]
              .find((candidate) => candidate.getAttribute(attribute) === id);
            return Boolean(element?.isContentEditable);
          }, { attribute: leaf.attribute, id: leaf.id });
          if (editing) {
            await page.keyboard.press('Control+A');
            await page.keyboard.type(sentinelText);
            await page.keyboard.press('Tab');
          }
        });
        const changed = await page.evaluate(({ attribute, id, sentinel }) => {
          const element = [...document.querySelectorAll<HTMLElement>(`[${attribute}]`)]
            .find((candidate) => candidate.getAttribute(attribute) === id);
          return element?.textContent === sentinel;
        }, { attribute: leaf.attribute, id: leaf.id, sentinel: sentinelText });
        leafText = changed && message?.nodeId === leaf.id && message.original === leaf.text && message.text === sentinelText
          ? 'passed'
          : 'failed';
      } finally {
        await restorePhysicalDisclosurePath(page, point.disclosureIds);
      }
    } else leafText = 'failed';
    await page.evaluate((snapshot) => {
      const element = [...document.querySelectorAll<HTMLElement>(`[${snapshot.attribute}]`)]
        .find((candidate) => candidate.getAttribute(snapshot.attribute) === snapshot.id);
      if (!element) return;
      element.innerHTML = snapshot.html;
      for (const [name, value] of [['style', snapshot.style], ['contenteditable', snapshot.contenteditable]] as const) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }, leaf);
    if (leafText === 'failed') details.push('leaf text did not complete a physical dblclick/keyboard/blur/textEdited round trip');
  }

  let editableAttribute: CheckStatus = 'missing';
  const attributeTarget = await page.evaluate(() => {
    const element = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-attribute],[data-pb-edit-attribute]')]
      .find((candidate) => document.body.contains(candidate));
    if (!element) return null;
    const attribute = element.getAttribute('data-dc-edit-attribute') || element.getAttribute('data-pb-edit-attribute') || '';
    return {
      idAttribute: element.hasAttribute('data-dc-edit-id') ? 'data-dc-edit-id' as const : 'data-pb-edit-id' as const,
      id: element.getAttribute('data-dc-edit-id') || element.getAttribute('data-pb-edit-id') || '',
      attribute,
      original: element.getAttribute(attribute),
    };
  });
  if (attributeTarget) {
    const point = await physicalHitPoint(page, attributeTarget.idAttribute, attributeTarget.id, 'text');
    const request = point
      ? await physicalMessage(page, 'editValueRequest', () => page.mouse.dblclick(point.x, point.y))
          .finally(() => restorePhysicalDisclosurePath(page, point.disclosureIds))
      : null;
    if (request) {
      await page.evaluate(({ nodeId, attribute, text }) => {
        window.postMessage({ type: 'editValueResponse', nodeId, attribute, text }, '*');
      }, { nodeId: request.nodeId, attribute: request.attribute, text: sentinelText });
      await page.waitForFunction(({ id, attribute, sentinel }) => {
        const element = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')]
          .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === id);
        return element?.getAttribute(attribute) === sentinel;
      }, { id: attributeTarget.id, attribute: attributeTarget.attribute, sentinel: sentinelText }, { timeout: 750 }).catch(() => undefined);
    }
    const changed = await page.evaluate(({ id, attribute, sentinel }) => {
      const element = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === id);
      return element?.getAttribute(attribute) === sentinel;
    }, { id: attributeTarget.id, attribute: attributeTarget.attribute, sentinel: sentinelText });
    editableAttribute = request?.nodeId === attributeTarget.id
      && request.attribute === attributeTarget.attribute
      && request.original === (attributeTarget.original || '')
      && changed
      ? 'passed'
      : 'failed';
    await page.evaluate((snapshot) => {
      const element = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === snapshot.id);
      if (!element) return;
      if (snapshot.original === null) element.removeAttribute(snapshot.attribute);
      else element.setAttribute(snapshot.attribute, snapshot.original);
    }, attributeTarget);
    if (editableAttribute === 'failed') details.push('editable attribute did not complete a physical dblclick/request/response round trip');
  }

  let selectOption: CheckStatus = 'missing';
  const optionTarget = await page.evaluate(() => {
    const option = [...document.querySelectorAll<HTMLOptionElement>('option[data-dc-edit-id],option[data-pb-edit-id]')]
      .find((candidate) => candidate.closest('select'));
    if (!option) return null;
    const select = option.closest('select')!;
    return {
      idAttribute: option.hasAttribute('data-dc-edit-id') ? 'data-dc-edit-id' as const : 'data-pb-edit-id' as const,
      id: option.getAttribute('data-dc-edit-id') || option.getAttribute('data-pb-edit-id') || '',
      original: option.textContent || '',
      selectedIndex: select.selectedIndex,
    };
  });
  if (optionTarget) {
    const point = await physicalHitPoint(page, optionTarget.idAttribute, optionTarget.id, 'option');
    const request = point
      ? await physicalMessage(page, 'editValueRequest', () => page.mouse.dblclick(point.x, point.y))
          .finally(() => restorePhysicalDisclosurePath(page, point.disclosureIds))
      : null;
    if (request) {
      await page.evaluate(({ nodeId, text }) => {
        window.postMessage({ type: 'editValueResponse', nodeId, attribute: '', text }, '*');
      }, { nodeId: request.nodeId, text: sentinelText });
      await page.waitForFunction(({ id, sentinel }) => {
        const option = [...document.querySelectorAll<HTMLOptionElement>('option[data-dc-edit-id],option[data-pb-edit-id]')]
          .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === id);
        return option?.textContent === sentinel;
      }, { id: optionTarget.id, sentinel: sentinelText }, { timeout: 750 }).catch(() => undefined);
    }
    const changed = await page.evaluate(({ id, sentinel }) => {
      const option = [...document.querySelectorAll<HTMLOptionElement>('option[data-dc-edit-id],option[data-pb-edit-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === id);
      return option?.textContent === sentinel;
    }, { id: optionTarget.id, sentinel: sentinelText });
    selectOption = request?.nodeId === optionTarget.id && request.attribute === '' && changed ? 'passed' : 'failed';
    await page.evaluate((snapshot) => {
      const option = [...document.querySelectorAll<HTMLOptionElement>('option[data-dc-edit-id],option[data-pb-edit-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-edit-id') || candidate.getAttribute('data-pb-edit-id')) === snapshot.id);
      if (!option) return;
      option.textContent = snapshot.original;
      const select = option.closest('select');
      if (select) select.selectedIndex = snapshot.selectedIndex;
    }, optionTarget);
    if (selectOption === 'failed') details.push('selected option did not complete a physical select/dblclick/request/response round trip');
  }

  const groups = await imageInteractionGroups(page);
  let standaloneChecks = 0;
  let standalonePasses = 0;
  let responsiveChecks = 0;
  let responsivePasses = 0;
  const failedImageIds: string[] = [];
  for (const group of groups) {
    if (group.kind === 'picture') responsiveChecks += 1;
    else standaloneChecks += 1;
    const point = group.primarySlotId
      ? await physicalHitPoint(
          page,
          'data-dc-image-id',
          group.primarySlotId,
          group.mode,
        ) ?? await physicalHitPoint(page, 'data-pb-image-id', group.primarySlotId, group.mode)
      : null;
    const snapshot = await page.evaluate((slotIds) => slotIds.map((slotId) => {
      const element = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-image-id') || candidate.getAttribute('data-pb-image-id')) === slotId);
      return element ? {
        slotId,
        src: element.getAttribute('src'),
        srcset: element.getAttribute('srcset'),
        style: element.getAttribute('style'),
      } : null;
    }), group.slotIds);
    const request = point
      ? await physicalMessage(page, 'imageSwapRequest', () => page.mouse.click(point.x, point.y), 1_200)
          .finally(() => restorePhysicalDisclosurePath(page, point.disclosureIds))
      : null;
    const requestedSlots = Array.isArray(request?.pictureSlotIds)
      ? request.pictureSlotIds.filter((slot): slot is string => typeof slot === 'string')
      : [];
    const requestMatches = request?.slotId === group.primarySlotId
      && requestedSlots.length === group.slotIds.length
      && group.slotIds.every((slotId) => requestedSlots.includes(slotId));
    if (requestMatches) {
      const responseSlots = [group.primarySlotId, ...group.slotIds.filter((slotId) => slotId !== group.primarySlotId)];
      await page.evaluate(({ slotId, slotIds, imageUrl }) => {
        window.postMessage({ type: 'imageSwapResponse', slotId, slotIds, imageUrl }, '*');
      }, { slotId: group.primarySlotId, slotIds: responseSlots, imageUrl: sentinelImage });
      await page.waitForFunction(({ slotIds, sentinel }) => slotIds.every((slotId) => {
        const element = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
          .find((candidate) => (candidate.getAttribute('data-dc-image-id') || candidate.getAttribute('data-pb-image-id')) === slotId);
        if (!element) return false;
        if (element instanceof HTMLImageElement) return element.getAttribute('src') === sentinel && !element.hasAttribute('srcset');
        if (element instanceof HTMLSourceElement) return (element.getAttribute('srcset') || element.getAttribute('src')) === sentinel;
        return element.style.backgroundImage.includes('data:image/png;base64');
      }), { slotIds: group.slotIds, sentinel: sentinelImage }, { timeout: 750 }).catch(() => undefined);
    }
    const changed = requestMatches && await page.evaluate(({ slotIds, sentinel }) => slotIds.every((slotId) => {
      const element = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
        .find((candidate) => (candidate.getAttribute('data-dc-image-id') || candidate.getAttribute('data-pb-image-id')) === slotId);
      if (!element) return false;
      if (element instanceof HTMLImageElement) return element.getAttribute('src') === sentinel && !element.hasAttribute('srcset');
      if (element instanceof HTMLSourceElement) return (element.getAttribute('srcset') || element.getAttribute('src')) === sentinel;
      return element.style.backgroundImage.includes('data:image/png;base64');
    }), { slotIds: group.slotIds, sentinel: sentinelImage });
    if (changed) {
      if (group.kind === 'picture') responsivePasses += 1;
      else standalonePasses += 1;
    } else {
      failedImageIds.push(...group.slotIds);
      details.push(`${group.kind} image slots ${group.slotIds.join(', ')} failed physical hit/request/response`);
    }
    await page.evaluate((snapshots) => {
      for (const snapshot of snapshots) {
        if (!snapshot) continue;
        const element = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
          .find((candidate) => (candidate.getAttribute('data-dc-image-id') || candidate.getAttribute('data-pb-image-id')) === snapshot.slotId);
        if (!element) continue;
        for (const [name, value] of [['src', snapshot.src], ['srcset', snapshot.srcset], ['style', snapshot.style]] as const) {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }
      }
    }, snapshot);
  }
  const standaloneImage: CheckStatus = standaloneChecks === 0 ? 'missing' : standalonePasses === standaloneChecks ? 'passed' : 'failed';
  const responsivePicture: CheckStatus = responsiveChecks === 0 ? 'missing' : responsivePasses === responsiveChecks ? 'passed' : 'failed';
  const imageReachability = {
    checked: groups.reduce((sum, group) => sum + group.slotIds.length, 0),
    passed: groups.reduce((sum, group) => sum + (failedImageIds.some((id) => group.slotIds.includes(id)) ? 0 : group.slotIds.length), 0),
    failedIds: [...new Set(failedImageIds)],
  };

  let navigation: CheckStatus = 'missing';
  const navigationTargets = await page.evaluate(({ manifestPage }) => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const targets: Array<{ id: string; expectedPage: string }> = [];
    for (let index = 0; index < links.length; index += 1) {
      const link = links[index]!;
      const href = link.getAttribute('href') || '';
      if (!(href === '/' || href === './' || (!/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|#)/.test(href) && /\.html(?:[?#].*)?$/i.test(href)))) continue;
      if (link.querySelector('img[data-dc-image-id],img[data-pb-image-id]')) continue;
      const id = `nav-${index}`;
      link.setAttribute('data-dc-qa-navigation', id);
      const expectedPage = href === '/' || href === './'
        ? 'index.html'
        : new URL(href, `https://preview.invalid/${manifestPage}`).pathname.replace(/^\/+/, '');
      targets.push({ id, expectedPage });
    }
    return targets;
  }, { manifestPage: currentPage });
  if (navigationTargets.length > 0) {
    navigation = 'failed';
    for (const navigationTarget of navigationTargets) {
      const point = await physicalHitPoint(page, 'data-dc-qa-navigation', navigationTarget.id, 'navigation');
      if (!point) continue;
      const request = await physicalMessage(page, 'navigatePage', () => page.mouse.click(point.x, point.y))
        .finally(() => restorePhysicalDisclosurePath(page, point.disclosureIds));
      if (
        typeof request?.page === 'string'
        && /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.html$/.test(request.page)
        && request.page.length <= 160
        && request.page === navigationTarget.expectedPage
      ) {
        navigation = 'passed';
        break;
      }
    }
    await page.evaluate(() => {
      document.querySelectorAll('[data-dc-qa-navigation]').forEach((element) => element.removeAttribute('data-dc-qa-navigation'));
    });
    if (navigation === 'failed') details.push(`no internal navigation target survived a physical click from ${currentPage}`);
  }

  return {
    installed,
    leafText,
    editableAttribute,
    selectOption,
    standaloneImage,
    responsivePicture,
    navigation,
    editReachability,
    imageReachability,
    details,
  };
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
    const editIds = [...document.querySelectorAll<HTMLElement>('[data-dc-edit-id],[data-pb-edit-id]')]
      .map((element) => element.getAttribute('data-dc-edit-id') || element.getAttribute('data-pb-edit-id') || '');
    const imageIds = [...document.querySelectorAll<HTMLElement>('[data-dc-image-id],[data-pb-image-id]')]
      .map((element) => element.getAttribute('data-dc-image-id') || element.getAttribute('data-pb-image-id') || '');
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

  const editorRuntime = await exerciseCustomerEditorRuntime(page, currentPage);
  if (state.editSlotCount > 0) {
    if (
      editorRuntime.editReachability.checked !== state.editSlotCount
      || editorRuntime.editReachability.passed !== editorRuntime.editReachability.checked
    ) {
      issues.push({
        code: 'edit_smoke_failed',
        severity: 'critical',
        detail: `${editorRuntime.editReachability.passed}/${state.editSlotCount} advertised text/attribute slots have a visible, physically hit-tested customer path; failures=${editorRuntime.editReachability.failedIds.slice(0, 12).join(', ')}`,
      });
    }
  } else {
    issues.push({ code: 'no_edit_slots', severity: 'critical', detail: 'Page contains no stable editable text IDs' });
  }
  if (
    editorRuntime.imageReachability.checked !== state.imageSlotCount
    || editorRuntime.imageReachability.passed !== editorRuntime.imageReachability.checked
  ) {
    issues.push({
      code: 'image_edit_smoke_failed',
      severity: 'critical',
      detail: `${editorRuntime.imageReachability.passed}/${state.imageSlotCount} advertised image slots completed a physical hit/request/response/mutation round trip; failures=${editorRuntime.imageReachability.failedIds.slice(0, 12).join(', ')}`,
    });
  }
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
    ['select_option', editorRuntime.selectOption],
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
    const hasRenderedContent = (element: HTMLElement): boolean => {
      let cumulativeOpacity = 1;
      for (let current: Element | null = element; current; current = current.parentElement) {
        if (current.hasAttribute('hidden') || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = getComputedStyle(current);
        const opacity = Number.parseFloat(style.opacity || '1');
        if (Number.isFinite(opacity)) cumulativeOpacity *= opacity;
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || style.visibility === 'collapse'
          || style.contentVisibility === 'hidden'
          || style.pointerEvents === 'none'
          || cumulativeOpacity < 0.01
        ) {
          return false;
        }
      }

      if ([...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)) return true;
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    };
    const isUsableControl = (control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement): boolean => {
      if (!hasRenderedContent(control) || control.matches(':disabled')) return false;
      if ((control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) && control.readOnly) return false;
      return getComputedStyle(control).pointerEvents !== 'none';
    };
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
      formChecks += 1;
      const dataControls = [...form.elements].filter((field): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        (field instanceof HTMLInputElement && !['button', 'submit', 'reset', 'image'].includes(field.type))
        || field instanceof HTMLSelectElement
        || field instanceof HTMLTextAreaElement,
      );
      const submitters = [...form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input')]
        .filter((control) => (control instanceof HTMLButtonElement && (control.type || 'submit') === 'submit')
          || (control instanceof HTMLInputElement && ['submit', 'image'].includes(control.type)));
      const labels = [...new Set(dataControls.flatMap((control) => [...control.labels ?? []]))];
      const usable = hasRenderedContent(form)
        && dataControls.length === 4
        && dataControls.every(isUsableControl)
        && labels.length === 4
        && labels.every((label) => hasRenderedContent(label))
        && submitters.length === 1
        && isUsableControl(submitters[0]!);
      if (!usable) {
        formPassed = false;
        continue;
      }

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
      const namesPassed = dataControls.every((field) => Boolean(field.name.trim()));
      let compatibilityEvent = false;
      const observeCompatibility = () => { compatibilityEvent = true; };
      const preventNavigation = (event: SubmitEvent) => event.preventDefault();
      form.addEventListener('dc:form-submit', observeCompatibility, { once: true });
      form.addEventListener('submit', preventNavigation, { once: true, capture: true });
      try {
        form.requestSubmit();
        await Promise.resolve();
        const submitted = new FormData(form);
        const successfulControlsPassed = dataControls.every((field) => {
          if (field.disabled) return true;
          if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type) && !field.checked) return true;
          if (field instanceof HTMLSelectElement && field.selectedOptions.length === 0) return true;
          return submitted.has(field.name);
        });
        formPassed = formPassed && namesPassed && successfulControlsPassed && compatibilityEvent;
      } catch {
        formPassed = false;
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
    issues.push({ code: 'form_smoke_failed', severity: 'critical', detail: `${interactions.formChecks} standardized forms were not all visible, usable, and compatible` });
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

import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { cpus, freemem, totalmem } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import axe from 'axe-core';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import sharp from 'sharp';

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

export function hydrateSentinelHtml(html: string): string {
  const sentinels: Record<string, string> = {
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
    PRIMARY_CTA_URL: 'contact.html',
    BOOKING_URL: 'contact.html',
    WEBSITE: 'index.html',
  };
  return html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, raw: string) => {
    const token = raw.toUpperCase();
    return sentinels[token] ?? `Sentinel ${token.toLowerCase().replace(/_/g, ' ')}`;
  });
}

export async function startTemplateServer(rootInput: string): Promise<StaticServerHandle> {
  const root = resolve(rootInput);
  const server: Server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const decoded = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      const target = resolve(root, ...decoded.split('/'));
      if (!decoded || !isContained(root, target)) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      let bytes = await readFile(target);
      const extension = extname(target).toLowerCase();
      if (extension === '.html') bytes = Buffer.from(hydrateSentinelHtml(bytes.toString('utf8')), 'utf8');
      response.writeHead(200, {
        'content-type': MIME_TYPES[extension] ?? 'application/octet-stream',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'",
        'x-content-type-options': 'nosniff',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
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
): Promise<Pick<RenderEvidence, 'screenshotSha256' | 'perceptualHash' | 'thumbnailPath' | 'failureScreenshotPath'>> {
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
  await writeEvidenceThumbnail(png, thumbnailPath);

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
    ...(failureScreenshotPath ? { failureScreenshotPath } : {}),
  };
}

/**
 * Keep evidence thumbnails within WebP's 16,383-pixel dimension limit. Some
 * legacy pages are extraordinarily tall; constraining only width could leave
 * the proportional height too large for libvips to encode.
 */
export async function writeEvidenceThumbnail(png: Buffer, thumbnailPath: string): Promise<void> {
  await sharp(png)
    .resize({ width: 320, height: 4096, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(thumbnailPath);
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

async function inspectPage(page: Page, origin: string, url: string, timeoutMs: number): Promise<{
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
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || /^(?:data|blob|about):/.test(url)) await route.continue();
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
      const sentinel = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';
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
            : target.style.backgroundImage.includes('data:image/svg+xml');
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
    const inspection = await inspectPage(page, serverOrigin, url, options.timeoutMs);
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
  const server = await startTemplateServer(serverRoot);
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

export async function thumbnailSsim(firstPath: string, secondPath: string): Promise<number> {
  const width = 128;
  const height = 128;
  const [first, second] = await Promise.all([
    sharp(firstPath).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer(),
    sharp(secondPath).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer(),
  ]);
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

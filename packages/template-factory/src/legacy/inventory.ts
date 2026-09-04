import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { declaredPagesFromManifest } from './contracts.js';

export const ACTIVE_LEGACY_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
] as const;

export type ActiveLegacyNiche = (typeof ACTIVE_LEGACY_NICHES)[number];

export const EXPECTED_LEGACY_COUNTS: Readonly<Record<ActiveLegacyNiche, number>> = {
  aromatherapy: 1_292,
  holistic_medicine: 1_002,
  private_practice_therapist: 1_087,
  sound_bath: 1_001,
  wellness_coach: 1_104,
};

export const EXPECTED_LEGACY_TEMPLATE_TOTAL = 5_486;
export const EXPECTED_LEGACY_SOURCE_PAGE_TOTAL = 33_962;
export const EXPECTED_LEGACY_MISSING_INDEX_TOTAL = 1;

const SAFE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_FILE_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const FOUNDATION_RE = /<!--\s*FOUNDATION:\s*([a-z0-9_]+)\s+layout-family-([a-z0-9-]+)\s*-->/i;
const TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const REMOTE_URL_RE = /https?:\/\/[^\s"'<>\)]+/gi;

export type InventorySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface InventoryIssue {
  code: string;
  severity: InventorySeverity;
  page?: string;
  detail: string;
  fingerprint: string;
}

export interface InventoryFile {
  relativePath: string;
  bytes: number;
  sha256: string;
  kind: 'html' | 'css' | 'javascript' | 'json' | 'image' | 'font' | 'other';
}

export interface InventoryPage {
  name: string;
  role: string;
  bytes: number;
  sha256: string;
  tokens: string[];
  remoteUrls: string[];
}

export interface LegacyTemplateInventory {
  key: string;
  niche: ActiveLegacyNiche;
  slug: string;
  sourceDir: string;
  sourceTreeHash: string;
  sourceBytes: number;
  files: InventoryFile[];
  pages: InventoryPage[];
  declaredPages: string[];
  foundation?: {
    niche: string;
    layoutFamily: string;
  };
  rawManifest: unknown;
  rawFields: unknown;
  issues: InventoryIssue[];
}

export interface CatalogInventory {
  sourceRoot: string;
  catalogHash: string;
  templates: LegacyTemplateInventory[];
  templateCount: number;
  pageCount: number;
  fileCount: number;
  sourceBytes: number;
  countsByNiche: Record<string, number>;
  remoteUrls: string[];
  startedAt: string;
  completedAt: string;
}

export interface InventoryOptions {
  niches?: readonly ActiveLegacyNiche[];
  expectedCounts?: boolean;
  onlyKeys?: ReadonlySet<string>;
  workers?: number;
  signal?: AbortSignal;
  onTemplate?: (template: LegacyTemplateInventory) => void | Promise<void>;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function issue(
  code: string,
  severity: InventorySeverity,
  detail: string,
  page?: string,
): InventoryIssue {
  return {
    code,
    severity,
    detail,
    ...(page ? { page } : {}),
    fingerprint: sha256(`${code}\0${page ?? ''}\0${detail.replace(/\d+/g, '#')}`),
  };
}

function assertSafeSegment(value: string, label: string): void {
  if (!SAFE_SEGMENT_RE.test(value) || value === '.' || value === '..') {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(value)}`);
  }
}

function assertSafeFileSegment(value: string): void {
  if (!SAFE_FILE_SEGMENT_RE.test(value) || value === '.' || value === '..') {
    throw new Error(`Unsafe source path segment: ${JSON.stringify(value)}`);
  }
}

function assertContained(root: string, target: string): void {
  const rel = relative(resolve(root), resolve(target));
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.includes(`:${sep}`)) {
    throw new Error(`Path escapes source root: ${target}`);
  }
}

function classifyFile(file: string): InventoryFile['kind'] {
  switch (extname(file).toLowerCase()) {
    case '.html':
    case '.htm':
      return 'html';
    case '.css':
      return 'css';
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.json':
      return 'json';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.svg':
    case '.avif':
      return 'image';
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.otf':
      return 'font';
    default:
      return 'other';
  }
}

export function inferPageRole(filename: string): string {
  const stem = basename(filename, extname(filename)).toLowerCase().replace(/[_-]+/g, ' ');
  const adapters: ReadonlyArray<[RegExp, string]> = [
    [/^(?:index|home|welcome|start)$/, 'home'],
    [/about|story|our practice|meet/, 'about'],
    [/service|offering|treatment|therapy/, 'services'],
    [/book|schedule|appointment|consult/, 'booking'],
    [/contact|connect|get in touch/, 'contact'],
    [/pric|rate|package|investment/, 'pricing'],
    [/faq|question/, 'faq'],
    [/blend|oil|remed/, 'blends'],
    [/shop|store|product/, 'shop'],
    [/event|calendar/, 'events'],
    [/class|session/, 'classes'],
    [/resource|guide|learn/, 'resources'],
    [/blog|journal|article/, 'journal'],
    [/team|staff/, 'team'],
    [/location|visit/, 'location'],
    [/policy|privacy/, 'privacy'],
    [/term/, 'terms'],
    [/accessib/, 'accessibility'],
    [/success|thank/, 'confirmation'],
  ];
  return adapters.find(([pattern]) => pattern.test(stem))?.[1] ?? 'detail';
}

function extractTokens(html: string): string[] {
  const result = new Set<string>();
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(html)) !== null) {
    result.add(match[1]!.trim().toUpperCase());
  }
  return [...result].sort();
}

function extractRemoteUrls(text: string): string[] {
  const urls = new Set<string>();
  REMOTE_URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REMOTE_URL_RE.exec(text)) !== null) {
    urls.add(match[0]!.replace(/[;,]+$/, ''));
  }
  return [...urls].sort();
}

function parseJson(text: string | undefined, label: string, issues: InventoryIssue[]): unknown {
  if (text === undefined) {
    issues.push(issue(`missing_${label}`, 'error', `${label}.json is missing`));
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    issues.push(issue(
      `invalid_${label}`,
      'error',
      `${label}.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`,
    ));
    return {};
  }
}

async function walkTemplateFiles(templateDir: string): Promise<Array<{ path: string; relativePath: string }>> {
  const rootReal = await realpath(templateDir);
  const output: Array<{ path: string; relativePath: string }> = [];
  const pending = [''];

  while (pending.length > 0) {
    const currentRelative = pending.pop()!;
    const current = join(templateDir, currentRelative);
    assertContained(templateDir, current);
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      assertSafeFileSegment(entry.name);
      const childRelative = currentRelative
        ? `${currentRelative.replace(/\\/g, '/')}/${entry.name}`
        : entry.name;
      const child = join(templateDir, ...childRelative.split('/'));
      assertContained(templateDir, child);
      const stats = await lstat(child);
      if (stats.isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed in the legacy source: ${childRelative}`);
      }
      if (stats.isDirectory()) {
        pending.push(childRelative);
      } else if (stats.isFile()) {
        const childReal = await realpath(child);
        assertContained(rootReal, childReal);
        output.push({ path: child, relativePath: childRelative });
      }
    }
  }

  return output.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function inventoryLegacyTemplate(
  sourceRoot: string,
  niche: ActiveLegacyNiche,
  slug: string,
): Promise<LegacyTemplateInventory> {
  assertSafeSegment(niche, 'niche');
  assertSafeSegment(slug, 'template slug');
  const sourceDir = join(sourceRoot, niche, slug);
  assertContained(sourceRoot, sourceDir);
  const fileEntries = await walkTemplateFiles(sourceDir);
  const files: InventoryFile[] = [];
  const pages: InventoryPage[] = [];
  const issues: InventoryIssue[] = [];
  const remoteUrls = new Set<string>();
  const texts = new Map<string, string>();
  let sourceBytes = 0;

  for (const entry of fileEntries) {
    const bytes = await readFile(entry.path);
    const file: InventoryFile = {
      relativePath: entry.relativePath,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      kind: classifyFile(entry.relativePath),
    };
    files.push(file);
    sourceBytes += bytes.byteLength;

    if (file.kind === 'html' || file.kind === 'css' || file.kind === 'javascript' || file.kind === 'json') {
      const text = bytes.toString('utf8');
      texts.set(entry.relativePath, text);
      for (const url of extractRemoteUrls(text)) remoteUrls.add(url);
      if (file.kind === 'html') {
        pages.push({
          name: entry.relativePath,
          role: inferPageRole(entry.relativePath),
          bytes: bytes.byteLength,
          sha256: file.sha256,
          tokens: extractTokens(text),
          remoteUrls: extractRemoteUrls(text),
        });
      }
    }
  }

  if (!texts.has('index.html')) {
    issues.push(issue('missing_homepage', 'critical', 'index.html is missing'));
  }
  if (pages.length === 0) {
    issues.push(issue('no_html_pages', 'critical', 'Template contains no HTML pages'));
  }

  const rawManifest = parseJson(texts.get('template.json'), 'template', issues);
  const rawFields = parseJson(texts.get('fields.json'), 'fields', issues);
  const declaredPages = declaredPagesFromManifest(rawManifest);
  const actualPages = new Set(pages.map((page) => page.name));
  for (const page of declaredPages) {
    if (!actualPages.has(page)) {
      issues.push(issue('missing_declared_page', 'error', `Declared page is missing: ${page}`, page));
    }
  }
  for (const page of pages) {
    if (declaredPages.length > 0 && !declaredPages.includes(page.name)) {
      issues.push(issue('undeclared_page', 'warning', `HTML page is not declared: ${page.name}`, page.name));
    }
  }

  const indexHtml = texts.get('index.html') ?? pages.map((page) => texts.get(page.name) ?? '').join('\n');
  const marker = indexHtml.match(FOUNDATION_RE);
  const foundation = marker
    ? { niche: marker[1]!.toLowerCase(), layoutFamily: marker[2]!.toLowerCase() }
    : undefined;
  if (foundation && foundation.niche !== niche) {
    issues.push(issue(
      'foundation_niche_mismatch',
      'error',
      `Foundation marker says ${foundation.niche}; directory niche is ${niche}`,
      'index.html',
    ));
  }

  const sourceTreeHash = sha256(files
    .map((file) => `${file.relativePath}\0${file.bytes}\0${file.sha256}`)
    .join('\n'));

  return {
    key: `${niche}/${slug}`,
    niche,
    slug,
    sourceDir,
    sourceTreeHash,
    sourceBytes,
    files,
    pages: pages.sort((a, b) => a.name.localeCompare(b.name)),
    declaredPages,
    ...(foundation ? { foundation } : {}),
    rawManifest,
    rawFields,
    issues,
  };
}

async function mapConcurrent<T, R>(
  values: readonly T[],
  workers: number,
  mapper: (value: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const pool = Array.from({ length: Math.max(1, Math.min(workers, values.length || 1)) }, async () => {
    while (cursor < values.length && !signal?.aborted) {
      const index = cursor++;
      results[index] = await mapper(values[index]!, index);
    }
  });
  await Promise.all(pool);
  return results;
}

export async function inventoryLegacyCatalog(
  sourceRootInput: string,
  options: InventoryOptions = {},
): Promise<CatalogInventory> {
  const startedAt = new Date().toISOString();
  const sourceRoot = await realpath(resolve(sourceRootInput));
  const niches = options.niches ?? ACTIVE_LEGACY_NICHES;
  const keys: Array<{ niche: ActiveLegacyNiche; slug: string }> = [];
  const countsByNiche: Record<string, number> = {};

  for (const niche of niches) {
    const nicheDir = join(sourceRoot, niche);
    assertContained(sourceRoot, nicheDir);
    const entries = await readdir(nicheDir, { withFileTypes: true });
    const slugs = entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => entry.name)
      .filter((slug) => !options.onlyKeys || options.onlyKeys.has(`${niche}/${slug}`))
      .sort();
    for (const slug of slugs) {
      assertSafeSegment(slug, 'template slug');
      keys.push({ niche, slug });
    }
    countsByNiche[niche] = slugs.length;
  }

  if (options.expectedCounts !== false && !options.onlyKeys) {
    const mismatches = niches
      .filter((niche) => countsByNiche[niche] !== EXPECTED_LEGACY_COUNTS[niche])
      .map((niche) => `${niche}: expected ${EXPECTED_LEGACY_COUNTS[niche]}, found ${countsByNiche[niche]}`);
    if (mismatches.length > 0) {
      throw new Error(`Legacy catalogue inventory does not match its safety contract:\n${mismatches.join('\n')}`);
    }
  }

  const templates = await mapConcurrent(
    keys,
    options.workers ?? 8,
    async ({ niche, slug }) => {
      const template = await inventoryLegacyTemplate(sourceRoot, niche, slug);
      await options.onTemplate?.(template);
      return template;
    },
    options.signal,
  );

  if (options.signal?.aborted) {
    const reason = options.signal.reason;
    throw reason instanceof Error ? reason : new Error('Legacy catalogue inventory cancelled');
  }

  const pageCount = templates.reduce((sum, template) => sum + template.pages.length, 0);
  const missingIndexCount = templates.filter((template) => (
    !template.pages.some((page) => page.name.toLowerCase() === 'index.html')
  )).length;
  const fullSnapshotScope = !options.onlyKeys
    && niches.length === ACTIVE_LEGACY_NICHES.length
    && ACTIVE_LEGACY_NICHES.every((niche) => niches.includes(niche));
  if (options.expectedCounts !== false && fullSnapshotScope) {
    const mismatches = [
      ...(pageCount === EXPECTED_LEGACY_SOURCE_PAGE_TOTAL
        ? []
        : [`source pages: expected ${EXPECTED_LEGACY_SOURCE_PAGE_TOTAL}, found ${pageCount}`]),
      ...(missingIndexCount === EXPECTED_LEGACY_MISSING_INDEX_TOTAL
        ? []
        : [`templates missing index.html: expected ${EXPECTED_LEGACY_MISSING_INDEX_TOTAL}, found ${missingIndexCount}`]),
    ];
    if (mismatches.length > 0) {
      throw new Error(`Legacy catalogue inventory does not match its page-lineage safety contract:\n${mismatches.join('\n')}`);
    }
  }

  const allRemoteUrls = new Set<string>();
  for (const template of templates) {
    if (options.signal?.aborted) {
      const reason = options.signal.reason;
      throw reason instanceof Error ? reason : new Error('Legacy catalogue inventory cancelled');
    }
    for (const page of template.pages) {
      for (const url of page.remoteUrls) allRemoteUrls.add(url);
    }
    for (const file of template.files) {
      if (file.kind !== 'css') continue;
      const css = await readFile(join(template.sourceDir, ...file.relativePath.split('/')), 'utf8');
      for (const url of extractRemoteUrls(css)) allRemoteUrls.add(url);
    }
  }

  const catalogHash = sha256(canonicalJson(templates.map((template) => ({
    key: template.key,
    sourceTreeHash: template.sourceTreeHash,
  }))));

  return {
    sourceRoot,
    catalogHash,
    templates,
    templateCount: templates.length,
    pageCount,
    fileCount: templates.reduce((sum, template) => sum + template.files.length, 0),
    sourceBytes: templates.reduce((sum, template) => sum + template.sourceBytes, 0),
    countsByNiche,
    remoteUrls: [...allRemoteUrls].sort(),
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

export interface PilotCoverageDimensions {
  niche: string;
  foundation: string | null;
  cohort: string;
  topology: string;
  issueCodes: string[];
}

export function inferGenerationCohort(slug: string): string {
  const match = slug.match(/-(MORE-)?(20\d{2}-\d{2}-\d{2})T/i);
  if (!match) return 'legacy-undated';
  return `${match[1] ? 'more' : 'generated'}:${match[2]}`;
}

/**
 * Stable, independently auditable dimensions that the pilot must exercise.
 * Generation waves are encoded in the immutable legacy slugs. Foundation
 * lineage remains a separate dimension so a wave and a foundation cannot
 * accidentally stand in for one another.
 */
export function pilotCoverageDimensions(template: LegacyTemplateInventory): PilotCoverageDimensions {
  return {
    niche: template.niche,
    foundation: template.foundation
      ? `${template.foundation.niche}:layout-family-${template.foundation.layoutFamily}`
      : null,
    cohort: `${template.niche}:${inferGenerationCohort(template.slug)}`,
    topology: template.pages.map((page) => page.role).sort().join('+') || '(no-pages)',
    issueCodes: [...new Set(template.issues.map((item) => item.code))].sort(),
  };
}

function pilotCoverageKeys(template: LegacyTemplateInventory): string[] {
  const dimensions = pilotCoverageDimensions(template);
  return [
    `niche:${dimensions.niche}`,
    ...(dimensions.foundation ? [`foundation:${dimensions.foundation}`] : []),
    `cohort:${dimensions.cohort}`,
    `topology:${dimensions.topology}`,
    ...dimensions.issueCodes.map((code) => `issue:${code}`),
  ];
}

function comparePilotCandidates(left: LegacyTemplateInventory, right: LegacyTemplateInventory): number {
  return left.sourceTreeHash.localeCompare(right.sourceTreeHash) || left.key.localeCompare(right.key);
}

/**
 * Select a deterministic coverage-first pilot. A greedy set-cover pass first
 * proves that every observed niche, exact foundation, cohort, topology, and
 * issue code has a representative. Remaining capacity is filled round-robin
 * across the original cross-product strata to retain broad distribution.
 */
export function selectStratifiedPilot(
  templates: readonly LegacyTemplateInventory[],
  size = 100,
): LegacyTemplateInventory[] {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Pilot size must be a positive integer');
  const orderedTemplates = [...templates].sort(comparePilotCandidates);
  if (orderedTemplates.length <= size) return orderedTemplates;

  const coverageByKey = new Map(orderedTemplates.map((template) => [template.key, pilotCoverageKeys(template)]));
  const uncovered = new Set([...coverageByKey.values()].flat());
  const selected: LegacyTemplateInventory[] = [];
  const selectedKeys = new Set<string>();

  while (uncovered.size > 0 && selected.length < size) {
    let best: LegacyTemplateInventory | undefined;
    let bestGain = 0;
    for (const candidate of orderedTemplates) {
      if (selectedKeys.has(candidate.key)) continue;
      const gain = coverageByKey.get(candidate.key)!.reduce(
        (count, dimension) => count + (uncovered.has(dimension) ? 1 : 0),
        0,
      );
      if (gain > bestGain) {
        best = candidate;
        bestGain = gain;
      }
    }
    if (!best || bestGain === 0) break;
    selected.push(best);
    selectedKeys.add(best.key);
    for (const dimension of coverageByKey.get(best.key)!) uncovered.delete(dimension);
  }

  if (uncovered.size > 0) {
    const missing = [...uncovered].sort();
    const preview = missing.slice(0, 12).join(', ');
    const remainder = missing.length > 12 ? `, +${missing.length - 12} more` : '';
    throw new Error(
      `Pilot size ${size} cannot cover every observed niche, foundation, cohort, page topology, and issue code. `
      + `Missing after deterministic coverage selection: ${preview}${remainder}. Increase --pilot-size.`,
    );
  }

  const buckets = new Map<string, LegacyTemplateInventory[]>();
  for (const template of orderedTemplates) {
    const dimensions = pilotCoverageDimensions(template);
    const issueFamily = dimensions.issueCodes.join('+') || 'clean';
    const key = `${dimensions.niche}\0${dimensions.cohort}\0${dimensions.topology}\0${issueFamily}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(template);
    buckets.set(key, bucket);
  }
  const orderedBuckets = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, bucket]) => bucket.sort(comparePilotCandidates));
  const maxBucketSize = Math.max(0, ...orderedBuckets.map((bucket) => bucket.length));
  for (let round = 0; round < maxBucketSize && selected.length < size; round += 1) {
    for (const bucket of orderedBuckets) {
      const candidate = bucket[round];
      if (!candidate || selectedKeys.has(candidate.key)) continue;
      selected.push(candidate);
      selectedKeys.add(candidate.key);
      if (selected.length === size) break;
    }
  }
  return selected;
}

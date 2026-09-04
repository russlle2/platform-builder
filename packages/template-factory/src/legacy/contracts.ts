import { createHash } from 'node:crypto';

export const LEGACY_CATALOG_CONTRACT_VERSION = 3 as const;
export const LEGACY_REPAIR_RULE_VERSION = 'legacy-rehab-1.0.17' as const;
export const COMPATIBILITY_SCRIPT_PATH = 'assets/js/dc-compat.js' as const;

export type IssueSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface LegacyTemplateInput {
  slug: string;
  niche: string;
  files: ReadonlyMap<string, string | Uint8Array>;
  manifest?: unknown;
  fields?: unknown;
  ruleVersion?: string;
}

export interface CanonicalField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  default?: string;
  sourceName?: string;
}

export interface CanonicalManifest {
  contractVersion: typeof LEGACY_CATALOG_CONTRACT_VERSION;
  legacySlug: string;
  slug: string;
  name: string;
  niche: string;
  pages: string[];
  pageRoles: Record<string, string>;
  placeholders: string[];
  requiredSections: string[];
  foundation?: string;
  layoutFamily?: string;
  voiceFamily?: string;
  offerModel?: string;
}

export interface RepairIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  file?: string;
  nodePath?: string;
  resolved: boolean;
}

export interface Transformation {
  rule: string;
  file: string;
  count: number;
  detail?: string;
}

export interface ContentEntry {
  nodeId: string;
  page: string;
  html: string;
  text: string;
  attribute?: 'content' | 'alt' | 'title' | 'placeholder' | 'aria-label';
}

export interface ImageEntry {
  slotId: string;
  page: string;
  kind: 'image' | 'background';
  source: string;
  /** Original responsive candidates when the same DOM target also owns srcset. */
  srcset?: string;
  /** CSS file holding the design-time placeholder; page stays the customer-editable HTML target. */
  stylesheet?: string;
  selector?: string;
  attribute?: 'src' | 'srcset' | 'style' | 'css-url';
}

export interface ContentPreset {
  id: string;
  legacySlug: string;
  entries: ContentEntry[];
  images: ImageEntry[];
  hash: string;
}

export interface ThemeToken {
  id: string;
  value: string;
  kind: 'color' | 'font';
  original?: string;
}

export interface ThemePreset {
  id: string;
  legacySlug: string;
  tokens: ThemeToken[];
  fontImports: string[];
  hash: string;
}

export interface CanonicalDesign {
  id: string;
  niche: string;
  foundation?: string;
  pages: Record<string, string>;
  styles: Record<string, string>;
  pageRoles: Record<string, string>;
  structureHash: string;
  domHash: string;
  cssHash: string;
}

export interface CatalogTemplate {
  legacySlug: string;
  designId: string;
  contentPresetId: string;
  themePresetId: string;
  niche: string;
  qualityReceipt: string;
}

export interface QualityCheck {
  code: string;
  pass: boolean;
  detail: string;
}

export interface QualityReceipt {
  id: string;
  legacySlug: string;
  ruleVersion: string;
  status: 'passed' | 'review' | 'failed';
  checks: QualityCheck[];
  issueCounts: Record<IssueSeverity, number>;
  sourceHash: string;
  artifactHash: string;
}

export interface DedupeFingerprint {
  legacySlug: string;
  niche: string;
  foundation?: string;
  pageRoles: string[];
  domHash: string;
  cssHash: string;
  structureHash: string;
  exactDesignHash: string;
  contentHash: string;
  themeHash: string;
}

export interface RepairResult {
  files: Map<string, string | Uint8Array>;
  manifest: CanonicalManifest;
  fields: CanonicalField[];
  design: CanonicalDesign;
  contentPreset: ContentPreset;
  themePreset: ThemePreset;
  catalogTemplate: CatalogTemplate;
  qualityReceipt: QualityReceipt;
  fingerprint: DedupeFingerprint;
  issues: RepairIssue[];
  transformations: Transformation[];
  editIds: string[];
  imageIds: string[];
}

export const TOKEN_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  BUSINESS: 'BUSINESS_NAME',
  BUSINESSNAME: 'BUSINESS_NAME',
  COMPANY_NAME: 'BUSINESS_NAME',
  CLINIC_NAME: 'PRACTICE_NAME',
  PRACTICE: 'PRACTICE_NAME',
  PROVIDER_NAME: 'PRACTITIONER_NAME',
  THERAPIST_NAME: 'PRACTITIONER_NAME',
  DOCTOR_NAME: 'PRACTITIONER_NAME',
  FULL_NAME: 'PRACTITIONER_NAME',
  NAME: 'PRACTITIONER_NAME',
  MAIL: 'EMAIL',
  EMAIL_ADDRESS: 'EMAIL',
  BUSINESS_EMAIL: 'EMAIL',
  TELEPHONE: 'PHONE',
  PHONE_NO: 'PHONE',
  BUSINESS_PHONE: 'PHONE',
  LOCATION: 'ADDRESS',
  ZIP: 'STATE',
  CTA_TEXT: 'CTA_LABEL',
  CTA_LINK: 'PRIMARY_CTA_URL',
  BOOK_URL: 'BOOKING_URL',
  SCHEDULE_URL: 'BOOKING_URL',
  URL: 'WEBSITE',
});

const IDENTITY = new Set([
  'BUSINESS_NAME', 'PRACTICE_NAME', 'BRAND_NAME', 'STUDIO_NAME',
  'PRACTITIONER_NAME', 'OWNER_NAME', 'COACH_NAME', 'FACILITATOR_NAME',
]);
const EMAILS = new Set(['EMAIL', 'CONTACT_EMAIL']);
const PHONES = new Set(['PHONE', 'PHONE_NUMBER', 'CONTACT_PHONE']);
const URLS = new Set(['PRIMARY_CTA_URL', 'BOOKING_URL', 'WEBSITE']);

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function normalizeFieldName(name: string): string {
  const normalized = name
    .replace(/^\{\{\s*|\s*\}\}$/g, '')
    .trim()
    .replace(/[\s.-]+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase();
  return TOKEN_ALIASES[normalized] ?? normalized;
}

function fieldType(name: string, candidate?: string): CanonicalField['type'] {
  const type = candidate?.toLowerCase();
  if (type === 'textarea') return 'textarea';
  if (EMAILS.has(name) || type === 'email') return 'email';
  if (PHONES.has(name) || type === 'tel' || type === 'phone') return 'tel';
  if (URLS.has(name) || type === 'url') return 'url';
  return 'text';
}

function labelFor(name: string): string {
  return name.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addField(
  fields: Map<string, CanonicalField>,
  rawName: string,
  rawValue: unknown,
): void {
  const name = normalizeFieldName(rawName);
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name)) return;

  let candidate: Record<string, unknown> | undefined;
  let defaultValue: string | undefined;
  if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    defaultValue = String(rawValue);
  } else if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    candidate = rawValue as Record<string, unknown>;
    const possibleDefault = candidate.default ?? candidate.value ?? candidate.placeholder ?? candidate.sample;
    if (typeof possibleDefault === 'string' || typeof possibleDefault === 'number') {
      defaultValue = String(possibleDefault);
    }
  }

  const existing = fields.get(name);
  const next: CanonicalField = {
    name,
    label: typeof candidate?.label === 'string' ? candidate.label : existing?.label ?? labelFor(name),
    type: fieldType(name, typeof candidate?.type === 'string' ? candidate.type : existing?.type),
    sourceName: rawName === name ? existing?.sourceName : rawName,
  };
  if (defaultValue?.trim()) next.default = defaultValue.trim();
  else if (existing?.default) next.default = existing.default;
  fields.set(name, next);
}

/** Canonicalize the observed array, map, placeholders, site, and nested field shapes. */
export function normalizeFields(raw: unknown): CanonicalField[] {
  const fields = new Map<string, CanonicalField>();
  const visit = (value: unknown, depth: number, containerName?: string): void => {
    if (depth > 4 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && /^\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}$|^[A-Z][A-Z0-9_]{1,63}$/.test(item.trim())) {
          addField(fields, item, undefined);
          continue;
        }
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const entry = item as Record<string, unknown>;
          const name = entry.name ?? entry.key ?? entry.token ?? entry.id;
          if (typeof name === 'string') addField(fields, name, entry);
          else visit(item, depth + 1, containerName);
        }
      }
      return;
    }
    if (typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    const namedField = record.name ?? record.key ?? record.token;
    if (typeof namedField === 'string') addField(fields, namedField, record);
    for (const [key, entry] of Object.entries(record)) {
      const isKnownContainer = /^(?:fields?|fieldDefinitions|placeholders?|site|variables?|tokens?|content|settings|defaults?|properties|customi[sz]ation|editable)$/i.test(key);
      const isTokenKey = /^[A-Za-z][A-Za-z0-9_. -]{1,63}$/.test(key) && (
        /^[A-Z][A-Z0-9_ -]+$/.test(key) ||
        /^(?:business|practice|brand|studio|practitioner|owner|coach|facilitator|email|phone|address|city|state|tagline|description|services|cta|booking|website)/i.test(key)
      );
      if (isKnownContainer) visit(entry, depth + 1, key);
      else if (isTokenKey && (containerName || depth === 0)) addField(fields, key, entry);
      else if (entry && typeof entry === 'object' && depth < 2 && /schema|config|data|form/i.test(key)) visit(entry, depth + 1, key);
    }
  };
  visit(raw, 0);
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function detectPageRole(path: string): string {
  const stem = path.replace(/\\/g, '/').split('/').pop()?.replace(/\.html?$/i, '').toLowerCase() ?? '';
  if (/^(?:index|home|welcome|landing)$/.test(stem)) return 'home';
  if (/about|story|bio|team|practitioner|meet/.test(stem)) return 'about';
  if (/service|offering|program|modality|treatment|work-with|approach|condition|specialt|session|class/.test(stem)) return 'services';
  if (/book|booking|schedule|appointment|consult/.test(stem)) return 'booking';
  if (/contact|connect|inquir/.test(stem)) return 'contact';
  if (/price|pricing|rate|fee|invest|package/.test(stem)) return 'pricing';
  if (/faq|question/.test(stem)) return 'faq';
  if (/resource|guide|learn|education|blog/.test(stem)) return 'resources';
  if (/shop|store|product|boutique/.test(stem)) return 'shop';
  if (/blend|recipe/.test(stem)) return 'blends';
  if (/event|calendar|retreat|workshop/.test(stem)) return 'events';
  if (/member|membership/.test(stem)) return 'membership';
  if (/result|outcome|success|testimonial|review/.test(stem)) return 'results';
  if (/policy|privacy/.test(stem)) return 'privacy';
  if (/term/.test(stem)) return 'terms';
  if (/accessib/.test(stem)) return 'accessibility';
  if (/location|studio|office/.test(stem)) return 'location';
  if (/gallery|portfolio/.test(stem)) return 'gallery';
  if (/press|media/.test(stem)) return 'press';
  return 'other';
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

const MANIFEST_PAGE_KEYS = ['pages', 'pageList', 'page_list', 'paths', 'files'] as const;

function normalizeManifestPagePath(value: string): string | undefined {
  let path = value.trim().replace(/\\/g, '/').split(/[?#]/, 1)[0] ?? '';
  if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\{\{)/i.test(path)) return undefined;
  if (path === '/') return 'index.html';
  path = path.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!path) return 'index.html';

  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment))) {
    return undefined;
  }
  const filename = segments.at(-1)!;
  if (!/\.html?$/i.test(filename)) {
    // `files` is used both as a page alias and as a complete asset inventory.
    // Only extensionless values are page slugs; never turn styles.css into
    // styles.css.html.
    if (/\.[A-Za-z0-9]+$/.test(filename)) return undefined;
    segments[segments.length - 1] = `${filename}.html`;
  }
  return segments.join('/');
}

function pageValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',');
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>);
  return [];
}

function normalizedPageValues(values: readonly unknown[]): string[] {
  const pages = new Map<string, string>();
  for (const value of values) {
    let candidate: unknown = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      candidate = record.file ?? record.path ?? record.slug ?? record.filename ?? record.href;
    }
    if (typeof candidate !== 'string') continue;
    const page = normalizeManifestPagePath(candidate);
    if (page) pages.set(page.toLowerCase(), page);
  }
  return [...pages.values()].sort();
}

/** Normalize the page-list variants observed across the immutable legacy manifests. */
export function declaredPagesFromManifest(manifest: unknown): string[] {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return [];
  const record = manifest as Record<string, unknown>;
  for (const key of MANIFEST_PAGE_KEYS) {
    const pages = normalizedPageValues(pageValues(record[key]));
    if (pages.length > 0) return pages;
  }
  return [];
}

export function canonicalizeManifest(
  raw: unknown,
  fallback: { slug: string; niche: string; pages: readonly string[]; foundation?: string },
): CanonicalManifest {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const fallbackPages = normalizedPageValues(fallback.pages);
  const pages = fallbackPages.length > 0 ? fallbackPages : declaredPagesFromManifest(record);
  const pageRoles = Object.fromEntries(pages.map((page) => [page, detectPageRole(page)]));
  const requiredSections = pickStringArray(record, ['requiredSections', 'required_sections', 'sections', 'sectionPack', 'section_pack']);
  const manifest: CanonicalManifest = {
    contractVersion: LEGACY_CATALOG_CONTRACT_VERSION,
    legacySlug: fallback.slug,
    slug: fallback.slug,
    name: pickString(record, ['name', 'title', 'displayName']) ?? fallback.slug,
    niche: fallback.niche,
    pages,
    pageRoles,
    placeholders: [],
    requiredSections: [...new Set(requiredSections.map((value) => value.trim()).filter(Boolean))].sort(),
  };
  const foundation = fallback.foundation ?? pickString(record, ['foundation', 'foundationId']);
  if (foundation) manifest.foundation = foundation;
  const layoutFamily = pickString(record, ['layoutFamily', 'layout_family', 'layout']);
  if (layoutFamily) manifest.layoutFamily = layoutFamily;
  const voiceFamily = pickString(record, ['voiceFamily', 'voice_family', 'voice']);
  if (voiceFamily) manifest.voiceFamily = voiceFamily;
  const offerModel = pickString(record, ['offerModel', 'offer_model', 'offer', 'programModel', 'program_model']);
  if (offerModel) manifest.offerModel = offerModel;
  return manifest;
}

export function isIdentityField(name: string): boolean {
  return IDENTITY.has(normalizeFieldName(name));
}

export function isContactField(name: string): boolean {
  const normalized = normalizeFieldName(name);
  return EMAILS.has(normalized) || PHONES.has(normalized) || URLS.has(normalized);
}

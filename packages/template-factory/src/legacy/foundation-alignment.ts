import { lstat, readFile, readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { parse, serialize } from 'parse5';
import postcss from 'postcss';
import { sha256 } from './contracts.js';
import {
  ACTIVE_LEGACY_NICHES,
  type ActiveLegacyNiche,
} from './inventory.js';

type HtmlAttribute = { name: string; value: string };

type HtmlNode = {
  nodeName: string;
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  content?: HtmlNode;
  value?: string;
  data?: string;
  parentNode?: HtmlNode;
  alignmentTextNodes?: HtmlNode[];
  alignmentRequiredEmpty?: boolean;
};

export const FOUNDATION_LAYOUT_FAMILIES = [
  'hero-left',
  'hero-centered',
  'editorial',
  'split-screen',
  'magazine',
  'minimal',
  'bold-statement',
  'luxury-gallery',
  'nature-immersive',
  'clinical-modern',
  'community-warm',
  'conversion-focused',
] as const;

export type FoundationLayoutFamily = (typeof FOUNDATION_LAYOUT_FAMILIES)[number];

export const FOUNDATION_IDENTITY_TOKENS = [
  'BUSINESS_NAME',
  'PRACTICE_NAME',
  'BRAND_NAME',
  'STUDIO_NAME',
  'COMPANY_NAME',
  'PRACTITIONER_NAME',
  'OWNER_NAME',
  'COACH_NAME',
  'FACILITATOR_NAME',
  'THERAPIST_NAME',
  'EMAIL',
  'CONTACT_EMAIL',
  'PHONE',
  'PHONE_NUMBER',
  'CONTACT_PHONE',
  'ADDRESS',
  'STREET_ADDRESS',
  'CITY',
  'STATE',
  'ZIP',
  'POSTAL_CODE',
  'HOURS',
  'BUSINESS_HOURS',
  'TAGLINE',
  'DESCRIPTION',
  'CTA_LABEL',
  'PRIMARY_CTA_LABEL',
  'CTA_URL',
  'PRIMARY_CTA_URL',
  'BOOKING_URL',
  'WEBSITE',
] as const;

export type FoundationIdentityToken = (typeof FOUNDATION_IDENTITY_TOKENS)[number];

const IDENTITY_TOKEN_SET = new Set<string>(FOUNDATION_IDENTITY_TOKENS);
const FOUNDATION_REQUIRED_POSITIONAL_TOKENS = [
  'BUSINESS_NAME',
  'PRACTITIONER_NAME',
  'EMAIL',
  'PHONE',
  'CITY',
  'STATE',
  'TAGLINE',
  'CTA_LABEL',
] as const;
const FOUNDATION_MARKER_RE = /<!--\s*FOUNDATION:\s*([a-z0-9_]+)\s+layout-family-([a-z0-9-]+)\s*-->/gi;
const TOKEN_RE = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;
const HEAD_PLUMBING_TAGS = new Set(['script', 'style']);
const VALUE_INSENSITIVE_ATTRIBUTES = new Set([
  'alt',
  'aria-label',
  'content',
  'href',
  'placeholder',
  'src',
  'srcset',
  'title',
  'value',
]);
const IGNORED_ALIGNMENT_ATTRIBUTES = new Set(['style']);
const COLOR_RE = /#[0-9a-f]{3,8}\b|(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi;

export interface FoundationMarker {
  niche: string;
  layoutFamily: string;
  key: string;
}

export interface FoundationDescriptor {
  id: string;
  key: string;
  niche: ActiveLegacyNiche;
  layoutFamily: FoundationLayoutFamily;
  filename: string;
  absolutePath: string;
  html: string;
  sha256: string;
  structureSha256: string;
  tokens: string[];
}

export interface FoundationRegistry {
  root: string;
  sha256: string;
  descriptors: readonly FoundationDescriptor[];
  byKey: ReadonlyMap<string, FoundationDescriptor>;
}

export interface FoundationMatchEvidence {
  sourceMarker: FoundationMarker;
  sourceStructureSha256: string;
  structuralCandidateKeys: string[];
  strictCandidateKeys: string[];
  registrySha256: string;
}

export type FoundationMatchResult =
  | {
    matched: true;
    foundation: FoundationDescriptor;
    evidence: FoundationMatchEvidence;
  }
  | {
    matched: false;
    code:
      | 'foundation-marker-missing'
      | 'foundation-marker-ambiguous'
      | 'foundation-marker-invalid'
      | 'foundation-marker-niche-mismatch'
      | 'foundation-marker-unknown'
      | 'foundation-structure-mismatch'
      | 'foundation-static-contract-mismatch'
      | 'foundation-marker-structure-mismatch';
    detail: string;
    evidence?: Partial<FoundationMatchEvidence>;
  };

export interface FoundationCapturedToken {
  token: string;
  value: string;
}

export interface FoundationAlignmentSlot {
  location: string;
  target: 'text' | 'attribute';
  attribute?: string;
  category: 'identity' | 'editorial' | 'mixed';
  tokens: string[];
  frameMatched: boolean;
  foundationTemplate: string;
  sourceValue: string;
  sourceFragments?: string[];
  captures: FoundationCapturedToken[];
}

export interface FoundationEditorialContent {
  id: string;
  token: string;
  value: string;
  occurrences: string[];
}

export interface FoundationThemeDeclaration {
  source: string;
  selector: string;
  property: string;
  value: string;
}

export interface FoundationThemeExtraction {
  stylesheets: Array<{ source: string; sha256: string }>;
  declarations: FoundationThemeDeclaration[];
  colors: string[];
  fonts: string[];
}

export interface FoundationSourceProof {
  source: string;
  beforeSha256: string;
  afterSha256: string;
  unchanged: true;
}

export interface FoundationAlignmentPlan {
  version: 'foundation-alignment-v1';
  foundationId: string;
  foundationSha256: string;
  registrySha256: string;
  sourceSha256: string;
  sourceStructureSha256: string;
  alignedSha256: string;
  normalizedSourceSha256: string;
  roundTripSha256: string;
  sourceUnchanged: true;
  alignedHtml: string;
  identityAlignedHtml: string;
  identityAlignedSha256: string;
  identityAlignedSlots: string[];
  editorialPreservedInIdentityAlignment: true;
  identity: Partial<Record<FoundationIdentityToken, string>>;
  editorialContent: FoundationEditorialContent[];
  slots: FoundationAlignmentSlot[];
  theme: FoundationThemeExtraction;
  sourceProof: FoundationSourceProof[];
}

export interface PlanFoundationAlignmentInput {
  sourceHtml: string;
  declaredNiche: ActiveLegacyNiche;
  registry: FoundationRegistry;
  sourceName?: string;
  stylesheets?: Readonly<Record<string, string>>;
}

export interface PlanFoundationAlignmentFilesInput {
  sourceHtmlPath: string;
  declaredNiche: ActiveLegacyNiche;
  registry: FoundationRegistry;
  stylesheetPaths?: readonly string[];
}

interface ComparableNode {
  kind: 'element' | 'text';
  path: string;
  node: HtmlNode;
  tagName?: string;
  children: ComparableNode[];
}

interface ComparisonResult {
  ok: boolean;
  mismatch?: string;
  slots: FoundationAlignmentSlot[];
  sourceDocument: HtmlNode;
}

export class FoundationAlignmentError extends Error {
  readonly code: string;

  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'FoundationAlignmentError';
    this.code = code;
  }
}

function markerKey(niche: string, layoutFamily: string): string {
  return `${niche}/layout-family-${layoutFamily}`;
}

function parseMarkers(html: string): FoundationMarker[] {
  const result: FoundationMarker[] = [];
  FOUNDATION_MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FOUNDATION_MARKER_RE.exec(html)) !== null) {
    const niche = match[1]!.toLowerCase();
    const layoutFamily = match[2]!.toLowerCase();
    result.push({ niche, layoutFamily, key: markerKey(niche, layoutFamily) });
  }
  return result;
}

function extractTokens(value: string): string[] {
  const tokens = new Set<string>();
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(value)) !== null) tokens.add(match[1]!);
  return [...tokens].sort();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizedAttributeValue(name: string, value: string): string {
  if (name === 'class') {
    return value
      .split(/\s+/)
      .filter(Boolean)
      // The checked-in assembler adds this class together with a separately
      // recognizable decorative image. It is not part of the foundation DOM.
      .filter((className) => className !== 'hero-bg')
      .sort()
      .join(' ');
  }
  return normalizeWhitespace(value);
}

function attrMap(node: HtmlNode): Map<string, HtmlAttribute> {
  return new Map((node.attrs ?? [])
    .filter((attribute) => !IGNORED_ALIGNMENT_ATTRIBUTES.has(attribute.name))
    .map((attribute) => [attribute.name.toLowerCase(), attribute]));
}

function isIgnoredHeadPlumbing(parent: HtmlNode, child: HtmlNode): boolean {
  if (parent.tagName?.toLowerCase() !== 'head') return false;
  const tag = child.tagName?.toLowerCase();
  if (!tag) return false;
  if (HEAD_PLUMBING_TAGS.has(tag)) return true;
  return tag === 'link';
}

function classes(node: HtmlNode): Set<string> {
  const value = node.attrs?.find((attribute) => attribute.name.toLowerCase() === 'class')?.value ?? '';
  return new Set(value.split(/\s+/).filter(Boolean));
}

function hasOnlyAttributeNames(node: HtmlNode, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return (node.attrs ?? []).every((attribute) => allowedSet.has(attribute.name.toLowerCase()));
}

function isGeneratedImage(node: HtmlNode, expectedClass: string): boolean {
  if (
    node.tagName?.toLowerCase() !== 'img'
    || (expectedClass !== '' && !classes(node).has(expectedClass))
  ) return false;
  return hasOnlyAttributeNames(node, [
    'alt',
    'class',
    'fetchpriority',
    'height',
    'loading',
    'role',
    'src',
    'width',
  ]);
}

function nonWhitespaceChildren(node: HtmlNode): HtmlNode[] {
  return (node.childNodes ?? []).filter((child) => (
    child.nodeName !== '#text' || Boolean(normalizeWhitespace(child.value ?? ''))
  ));
}

/**
 * The legacy assembler added a small, deterministic media layer after filling
 * each checked-in foundation. Treat only those exact wrappers as adornments.
 * Their original nodes remain in the source/output and are never deleted by an
 * alignment plan; this projection merely reveals the foundation underneath.
 */
function projectedRawChildren(parent: HtmlNode): HtmlNode[] {
  const output: HtmlNode[] = [];
  for (const child of parent.childNodes ?? []) {
    if (isIgnoredHeadPlumbing(parent, child)) continue;
    if (isGeneratedImage(child, 'hero-bg-img')) continue;

    const childClasses = classes(child);
    if (child.tagName?.toLowerCase() === 'div' && childClasses.size === 1 && childClasses.has('section-img-wrap')) {
      const nested = nonWhitespaceChildren(child);
      if (nested.length === 1 && isGeneratedImage(nested[0]!, 'section-img')) continue;
    }
    if (child.tagName?.toLowerCase() === 'div' && childClasses.size === 1 && childClasses.has('img-card')) {
      const nested = nonWhitespaceChildren(child);
      if (nested.length === 1 && isGeneratedImage(nested[0]!, '')) continue;
    }

    // About/practitioner image injection wraps the pre-existing children in a
    // flex div next to a portrait. Flatten that one generator-owned wrapper in
    // the comparison view while preserving it byte-for-byte in source/output.
    if (child.tagName?.toLowerCase() === 'div' && childClasses.size === 0) {
      const style = child.attrs?.find((attribute) => attribute.name.toLowerCase() === 'style')?.value ?? '';
      const normalizedStyle = style.replace(/\s+/g, '').replace(/;$/, '').toLowerCase();
      const nested = nonWhitespaceChildren(child);
      if (
        normalizedStyle === 'display:flex;gap:2.5rem;align-items:center;flex-wrap:wrap'
        && nested.length === 2
        && isGeneratedImage(nested[0]!, 'portrait-img')
        && nested[1]!.tagName?.toLowerCase() === 'div'
      ) {
        output.push(...(nested[1]!.childNodes ?? []));
        continue;
      }
    }
    output.push(child);
  }
  return output;
}

function comparableChildren(parent: HtmlNode, parentPath: string): ComparableNode[] {
  const children: ComparableNode[] = [];
  const elementCounts = new Map<string, number>();
  let textIndex = 0;
  const projected = projectedRawChildren(parent);
  for (let childIndex = 0; childIndex < projected.length; childIndex += 1) {
    const child = projected[childIndex]!;
    if (child.nodeName === '#text') {
      if (!normalizeWhitespace(child.value ?? '') && !child.alignmentRequiredEmpty) continue;
      const textNodes = [child];
      let cursor = childIndex + 1;
      while (
        projected[cursor]?.nodeName === '#comment'
        && /^nrm-\d+$/i.test(projected[cursor]!.data?.trim() ?? '')
        && projected[cursor + 1]?.nodeName === '#text'
      ) {
        textNodes.push(projected[cursor + 1]!);
        cursor += 2;
      }
      childIndex = cursor - 1;
      textIndex += 1;
      const comparisonNode = textNodes.length === 1
        ? child
        : {
          nodeName: '#text',
          value: textNodes.map((textNode) => textNode.value ?? '').join(''),
          alignmentTextNodes: textNodes,
        };
      children.push({
        kind: 'text',
        path: `${parentPath}/text()[${textIndex}]`,
        node: comparisonNode,
        children: [],
      });
      continue;
    }
    if (!child.tagName) continue;
    const tag = child.tagName.toLowerCase();
    const index = (elementCounts.get(tag) ?? 0) + 1;
    elementCounts.set(tag, index);
    const path = `${parentPath}/${tag}[${index}]`;
    children.push({
      kind: 'element',
      path,
      node: child,
      tagName: tag,
      children: comparableChildren(child.content ?? child, path),
    });
  }
  return children;
}

function comparableDocument(document: HtmlNode): ComparableNode {
  return {
    kind: 'element',
    path: '',
    node: document,
    tagName: '#document',
    children: comparableChildren(document, ''),
  };
}

function shapeAttributes(node: HtmlNode): string {
  return [...attrMap(node)]
    .map(([name, attribute]) => {
      if (VALUE_INSENSITIVE_ATTRIBUTES.has(name)) return name;
      return `${name}=${normalizedAttributeValue(name, attribute.value)}`;
    })
    .sort()
    .join('|');
}

function shape(node: ComparableNode): string {
  // Copy is deliberately excluded from the fast lineage fingerprint. The
  // strict positional comparison below separately verifies all immutable text
  // and allows a generated editorial slot to be empty (an observed failed-copy
  // case) without pretending the underlying element topology changed.
  if (node.kind === 'text') return '';
  const attributes = shapeAttributes(node.node);
  return `<${node.tagName}[${attributes}]>${node.children.map(shape).join('')}</${node.tagName}>`;
}

export function foundationStructureSha256(html: string): string {
  const document = parse(html) as unknown as HtmlNode;
  return sha256(shape(comparableDocument(document)));
}

function escapePatternStatic(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
}

function captureTemplate(
  templateValue: string,
  sourceValue: string,
): { valid: boolean; frameMatched: boolean; tokens: string[]; captures: FoundationCapturedToken[] } {
  const normalizedTemplate = normalizeWhitespace(templateValue);
  const normalizedSource = normalizeWhitespace(sourceValue);
  TOKEN_RE.lastIndex = 0;
  const matches = [...normalizedTemplate.matchAll(TOKEN_RE)];
  if (matches.length === 0) {
    return {
      valid: normalizedTemplate === normalizedSource,
      frameMatched: normalizedTemplate === normalizedSource,
      tokens: [],
      captures: [],
    };
  }

  const tokens = matches.map((match) => match[1]!);
  if (!normalizedSource) return { valid: true, frameMatched: false, tokens, captures: [] };

  let pattern = '^';
  let cursor = 0;
  for (const match of matches) {
    pattern += escapePatternStatic(normalizedTemplate.slice(cursor, match.index));
    pattern += '(.+?)';
    cursor = match.index! + match[0].length;
  }
  pattern += `${escapePatternStatic(normalizedTemplate.slice(cursor))}$`;
  const actual = new RegExp(pattern, 'u').exec(normalizedSource);
  if (!actual) return { valid: true, frameMatched: false, tokens, captures: [] };
  return {
    valid: true,
    frameMatched: true,
    tokens,
    captures: matches.map((match, index) => ({
      token: match[1]!,
      value: normalizeWhitespace(actual[index + 1] ?? ''),
    })),
  };
}

function slotCategory(tokens: readonly string[]): FoundationAlignmentSlot['category'] {
  const identity = tokens.some((token) => IDENTITY_TOKEN_SET.has(token));
  const editorial = tokens.some((token) => !IDENTITY_TOKEN_SET.has(token));
  if (identity && editorial) return 'mixed';
  return identity ? 'identity' : 'editorial';
}

function compareNodes(
  foundation: ComparableNode,
  source: ComparableNode,
  slots: FoundationAlignmentSlot[],
): string | undefined {
  if (foundation.kind !== source.kind || foundation.tagName !== source.tagName) {
    return `${source.path || '/'} expected ${foundation.kind}:${foundation.tagName ?? ''}, found ${source.kind}:${source.tagName ?? ''}`;
  }

  if (foundation.kind === 'text') {
    const templateValue = foundation.node.value ?? '';
    const sourceValue = source.node.value ?? '';
    const capture = captureTemplate(templateValue, sourceValue);
    if (!capture.valid) return `${source.path} static text differs from the checked-in foundation`;
    if (capture.tokens.length > 0) {
      slots.push({
        location: source.path,
        target: 'text',
        category: slotCategory(capture.tokens),
        tokens: capture.tokens,
        frameMatched: capture.frameMatched,
        foundationTemplate: templateValue,
        sourceValue,
        ...(source.node.alignmentTextNodes
          ? { sourceFragments: source.node.alignmentTextNodes.map((node) => node.value ?? '') }
          : {}),
        captures: capture.captures,
      });
    }
    return undefined;
  }

  const foundationAttributes = attrMap(foundation.node);
  const sourceAttributes = attrMap(source.node);
  if (foundationAttributes.size !== sourceAttributes.size) {
    return `${source.path || '/'} attribute set differs from the checked-in foundation`;
  }
  for (const [name, foundationAttribute] of foundationAttributes) {
    const sourceAttribute = sourceAttributes.get(name);
    if (!sourceAttribute) return `${source.path || '/'} is missing attribute ${name}`;
    const capture = captureTemplate(
      normalizedAttributeValue(name, foundationAttribute.value),
      normalizedAttributeValue(name, sourceAttribute.value),
    );
    if (!capture.valid) return `${source.path || '/'}@${name} differs from the checked-in foundation`;
    if (capture.tokens.length > 0) {
      slots.push({
        location: source.path,
        target: 'attribute',
        attribute: name,
        category: slotCategory(capture.tokens),
        tokens: capture.tokens,
        frameMatched: capture.frameMatched,
        foundationTemplate: foundationAttribute.value,
        sourceValue: sourceAttribute.value,
        captures: capture.captures,
      });
    }
  }

  if (
    source.children.length === 0
    && foundation.children.length === 1
    && foundation.children[0]!.kind === 'text'
    && extractTokens(foundation.children[0]!.node.value ?? '').length > 0
  ) {
    const insertedText: HtmlNode = {
      nodeName: '#text',
      value: '',
      parentNode: source.node,
      alignmentRequiredEmpty: true,
    };
    source.node.childNodes = [...(source.node.childNodes ?? []), insertedText];
    source.children.push({
      kind: 'text',
      path: `${source.path}/text()[1]`,
      node: insertedText,
      children: [],
    });
  }
  if (foundation.children.length !== source.children.length) {
    return `${source.path || '/'} child topology differs from the checked-in foundation`;
  }
  for (let index = 0; index < foundation.children.length; index += 1) {
    const mismatch = compareNodes(foundation.children[index]!, source.children[index]!, slots);
    if (mismatch) return mismatch;
  }
  return undefined;
}

function compareFoundationToSource(foundationHtml: string, sourceHtml: string): ComparisonResult {
  const foundationDocument = parse(foundationHtml) as unknown as HtmlNode;
  const sourceDocument = parse(sourceHtml) as unknown as HtmlNode;
  const slots: FoundationAlignmentSlot[] = [];
  const mismatch = compareNodes(
    comparableDocument(foundationDocument),
    comparableDocument(sourceDocument),
    slots,
  );
  return { ok: !mismatch, ...(mismatch ? { mismatch } : {}), slots, sourceDocument };
}

function assertContained(root: string, target: string): void {
  const difference = relative(resolve(root), resolve(target));
  if (difference === '..' || difference.startsWith(`..${sep}`) || difference.includes(`:${sep}`)) {
    throw new FoundationAlignmentError('foundation-path-escape', target);
  }
}

export async function loadFoundationRegistry(
  foundationsRoot: string,
  options: { requireComplete?: boolean } = {},
): Promise<FoundationRegistry> {
  const root = resolve(foundationsRoot);
  const requireComplete = options.requireComplete ?? true;
  const descriptors: FoundationDescriptor[] = [];
  const byKey = new Map<string, FoundationDescriptor>();

  for (const niche of ACTIVE_LEGACY_NICHES) {
    const nicheRoot = join(root, niche);
    assertContained(root, nicheRoot);
    let entries: Dirent[];
    try {
      entries = await readdir(nicheRoot, { withFileTypes: true });
    } catch (error) {
      if (!requireComplete && (error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    const htmlFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
      .map((entry) => entry.name)
      .sort();
    const expectedFiles = FOUNDATION_LAYOUT_FAMILIES.map((_, index) => `foundation-${String(index + 1).padStart(2, '0')}.html`);
    if (requireComplete && JSON.stringify(htmlFiles) !== JSON.stringify(expectedFiles)) {
      throw new FoundationAlignmentError(
        'foundation-registry-file-set',
        `${niche} expected ${expectedFiles.join(', ')}, found ${htmlFiles.join(', ')}`,
      );
    }

    for (let index = 0; index < FOUNDATION_LAYOUT_FAMILIES.length; index += 1) {
      const filename = expectedFiles[index]!;
      if (!htmlFiles.includes(filename)) continue;
      const absolutePath = join(nicheRoot, filename);
      assertContained(root, absolutePath);
      const stats = await lstat(absolutePath);
      if (!stats.isFile() || stats.isSymbolicLink()) {
        throw new FoundationAlignmentError('foundation-registry-non-file', absolutePath);
      }
      const html = await readFile(absolutePath, 'utf8');
      const markers = parseMarkers(html);
      if (markers.length !== 1) {
        throw new FoundationAlignmentError('foundation-registry-marker', `${absolutePath} has ${markers.length} valid markers`);
      }
      const expectedLayout = FOUNDATION_LAYOUT_FAMILIES[index]!;
      const marker = markers[0]!;
      if (marker.niche !== niche || marker.layoutFamily !== expectedLayout) {
        throw new FoundationAlignmentError(
          'foundation-registry-marker',
          `${absolutePath} declares ${marker.key}; expected ${markerKey(niche, expectedLayout)}`,
        );
      }
      const tokens = extractTokens(html);
      const missingIdentity = FOUNDATION_REQUIRED_POSITIONAL_TOKENS.filter((token) => !tokens.includes(token));
      if (missingIdentity.length > 0) {
        throw new FoundationAlignmentError(
          'foundation-registry-required-tokens',
          `${absolutePath} is missing ${missingIdentity.join(', ')}`,
        );
      }
      const key = marker.key;
      if (byKey.has(key)) throw new FoundationAlignmentError('foundation-registry-duplicate', key);
      const descriptor: FoundationDescriptor = Object.freeze({
        id: `foundation:${niche}:${expectedLayout}`,
        key,
        niche,
        layoutFamily: expectedLayout,
        filename,
        absolutePath,
        html,
        sha256: sha256(html),
        structureSha256: foundationStructureSha256(html),
        tokens,
      });
      descriptors.push(descriptor);
      byKey.set(key, descriptor);
    }
  }

  if (requireComplete && descriptors.length !== ACTIVE_LEGACY_NICHES.length * FOUNDATION_LAYOUT_FAMILIES.length) {
    throw new FoundationAlignmentError('foundation-registry-count', `expected 60 foundations, found ${descriptors.length}`);
  }
  descriptors.sort((left, right) => left.key.localeCompare(right.key, 'en'));
  const registrySha256 = sha256(descriptors
    .map((descriptor) => `${descriptor.key}\0${descriptor.sha256}\0${descriptor.structureSha256}`)
    .join('\n'));
  return Object.freeze({
    root,
    sha256: registrySha256,
    descriptors: Object.freeze(descriptors),
    byKey,
  });
}

export function matchMarkedFoundation(
  sourceHtml: string,
  declaredNiche: ActiveLegacyNiche,
  registry: FoundationRegistry,
): FoundationMatchResult {
  const apparentFoundationComments = sourceHtml.match(/<!--[^>]*\bFOUNDATION\s*:[^>]*-->/gi) ?? [];
  const markers = parseMarkers(sourceHtml);
  if (apparentFoundationComments.length === 0) {
    return { matched: false, code: 'foundation-marker-missing', detail: 'No foundation marker was found' };
  }
  if (markers.length === 0) {
    return { matched: false, code: 'foundation-marker-invalid', detail: 'The foundation marker does not match the required grammar' };
  }
  if (markers.length !== 1 || apparentFoundationComments.length !== 1) {
    return { matched: false, code: 'foundation-marker-ambiguous', detail: 'Exactly one foundation marker is required' };
  }
  const marker = markers[0]!;
  if (marker.niche !== declaredNiche) {
    return {
      matched: false,
      code: 'foundation-marker-niche-mismatch',
      detail: `Marker niche ${marker.niche} does not match inventory niche ${declaredNiche}`,
    };
  }
  const markedFoundation = registry.byKey.get(marker.key);
  if (!markedFoundation) {
    return { matched: false, code: 'foundation-marker-unknown', detail: `No checked-in foundation exists for ${marker.key}` };
  }

  const sourceStructureSha256 = foundationStructureSha256(sourceHtml);
  const structuralCandidates = registry.descriptors
    .filter((descriptor) => descriptor.structureSha256 === sourceStructureSha256);
  const strictCandidates = structuralCandidates
    .filter((descriptor) => compareFoundationToSource(descriptor.html, sourceHtml).ok);
  const evidence: FoundationMatchEvidence = {
    sourceMarker: marker,
    sourceStructureSha256,
    structuralCandidateKeys: structuralCandidates.map((candidate) => candidate.key),
    strictCandidateKeys: strictCandidates.map((candidate) => candidate.key),
    registrySha256: registry.sha256,
  };

  if (structuralCandidates.length === 0) {
    return {
      matched: false,
      code: 'foundation-structure-mismatch',
      detail: `${marker.key} has no checked-in foundation with the same DOM/attribute topology`,
      evidence,
    };
  }
  if (!structuralCandidates.some((candidate) => candidate.key === marker.key)) {
    return {
      matched: false,
      code: 'foundation-marker-structure-mismatch',
      detail: `Marker ${marker.key} disagrees with structural candidates ${structuralCandidates.map((candidate) => candidate.key).join(', ')}`,
      evidence,
    };
  }
  if (!strictCandidates.some((candidate) => candidate.key === marker.key)) {
    const comparison = compareFoundationToSource(markedFoundation.html, sourceHtml);
    return {
      matched: false,
      code: 'foundation-static-contract-mismatch',
      detail: comparison.mismatch ?? `${marker.key} failed its static text/attribute contract`,
      evidence,
    };
  }
  if (strictCandidates.length !== 1) {
    return {
      matched: false,
      code: 'foundation-marker-structure-mismatch',
      detail: `Foundation derivation is ambiguous across ${strictCandidates.map((candidate) => candidate.key).join(', ')}`,
      evidence,
    };
  }
  if (strictCandidates[0]!.key !== marker.key) {
    return {
      matched: false,
      code: 'foundation-marker-structure-mismatch',
      detail: `Marker ${marker.key} disagrees with strict match ${strictCandidates[0]!.key}`,
      evidence,
    };
  }
  return { matched: true, foundation: markedFoundation, evidence };
}

function comparableNodeIndex(document: HtmlNode): Map<string, HtmlNode> {
  const index = new Map<string, HtmlNode>();
  const visit = (node: ComparableNode): void => {
    index.set(node.path, node.node);
    for (const child of node.children) visit(child);
  };
  visit(comparableDocument(document));
  return index;
}

function applySlotValues(
  document: HtmlNode,
  slots: readonly FoundationAlignmentSlot[],
  field: 'foundationTemplate' | 'sourceValue',
): void {
  const nodes = comparableNodeIndex(document);
  for (const slot of slots) {
    const node = nodes.get(slot.location);
    if (!node) throw new FoundationAlignmentError('foundation-slot-missing', slot.location);
    if (slot.target === 'text') {
      if (node.nodeName !== '#text') throw new FoundationAlignmentError('foundation-slot-target', slot.location);
      const textNodes = node.alignmentTextNodes ?? [node];
      if (field === 'sourceValue' && slot.sourceFragments) {
        if (slot.sourceFragments.length !== textNodes.length) {
          throw new FoundationAlignmentError('foundation-slot-fragments', slot.location);
        }
        textNodes.forEach((textNode, index) => {
          textNode.value = slot.sourceFragments![index]!;
        });
      } else {
        textNodes[0]!.value = slot[field];
        for (const textNode of textNodes.slice(1)) textNode.value = '';
      }
      continue;
    }
    const attribute = node.attrs?.find((candidate) => candidate.name.toLowerCase() === slot.attribute);
    if (!attribute) throw new FoundationAlignmentError('foundation-slot-attribute', `${slot.location}@${slot.attribute}`);
    attribute.value = slot[field];
  }
}

function cssThemeExtraction(
  sourceHtml: string,
  stylesheets: Readonly<Record<string, string>>,
): FoundationThemeExtraction {
  const sources: Array<{ source: string; css: string }> = [];
  const document = parse(sourceHtml) as unknown as HtmlNode;
  let inlineIndex = 0;
  const visit = (node: HtmlNode): void => {
    if (node.tagName?.toLowerCase() === 'style') {
      inlineIndex += 1;
      sources.push({
        source: `inline-style-${inlineIndex}`,
        css: (node.childNodes ?? []).map((child) => child.value ?? '').join(''),
      });
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(document);
  for (const [source, css] of Object.entries(stylesheets).sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    sources.push({ source, css });
  }

  const declarations: FoundationThemeDeclaration[] = [];
  const colors = new Set<string>();
  const fonts = new Set<string>();
  for (const source of sources) {
    let root: postcss.Root;
    try {
      root = postcss.parse(source.css, { from: source.source });
    } catch (error) {
      throw new FoundationAlignmentError(
        'foundation-theme-css-invalid',
        `${source.source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    root.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();
      const isThemeDeclaration = property.startsWith('--') || property === 'font-family';
      if (isThemeDeclaration) {
        declarations.push({
          source: source.source,
          selector: declaration.parent?.type === 'rule' ? declaration.parent.selector : '',
          property: declaration.prop,
          value: declaration.value,
        });
      }
      for (const match of declaration.value.matchAll(COLOR_RE)) colors.add(match[0].toLowerCase());
      if (property === 'font-family' || /(?:^|-)font(?:-family)?$/.test(property)) {
        fonts.add(normalizeWhitespace(declaration.value));
      }
    });
  }
  declarations.sort((left, right) => (
    left.source.localeCompare(right.source, 'en')
      || left.selector.localeCompare(right.selector, 'en')
      || left.property.localeCompare(right.property, 'en')
      || left.value.localeCompare(right.value, 'en')
  ));
  return {
    stylesheets: sources.map((source) => ({ source: source.source, sha256: sha256(source.css) })),
    declarations,
    colors: [...colors].sort(),
    fonts: [...fonts].sort(),
  };
}

export function planFoundationAlignment(input: PlanFoundationAlignmentInput): FoundationAlignmentPlan {
  const match = matchMarkedFoundation(input.sourceHtml, input.declaredNiche, input.registry);
  if (!match.matched) throw new FoundationAlignmentError(match.code, match.detail);
  const comparison = compareFoundationToSource(match.foundation.html, input.sourceHtml);
  if (!comparison.ok) {
    throw new FoundationAlignmentError('foundation-static-contract-mismatch', comparison.mismatch ?? match.foundation.key);
  }

  const identity: Partial<Record<FoundationIdentityToken, string>> = {};
  const identityValues = new Map<FoundationIdentityToken, Set<string>>(
    FOUNDATION_IDENTITY_TOKENS.map((token) => [token, new Set<string>()]),
  );
  const editorial = new Map<string, FoundationEditorialContent>();
  for (const slot of comparison.slots) {
    if (!slot.frameMatched) {
      const token = `SLOT(${slot.tokens.join('+')})`;
      const value = normalizeWhitespace(slot.sourceValue);
      const key = `${token}\0${value}`;
      const existing = editorial.get(key);
      if (existing) {
        if (!existing.occurrences.includes(slot.location)) existing.occurrences.push(slot.location);
      } else {
        editorial.set(key, {
          id: `foundation-copy-${sha256(key).slice(0, 20)}`,
          token,
          value,
          occurrences: [slot.location],
        });
      }
    }
    for (const capture of slot.captures) {
      if (!capture.value || /\{\{[^{}]+\}\}/.test(capture.value)) continue;
      if (IDENTITY_TOKEN_SET.has(capture.token)) {
        identityValues.get(capture.token as FoundationIdentityToken)!.add(capture.value);
      } else {
        const key = `${capture.token}\0${capture.value}`;
        const existing = editorial.get(key);
        if (existing) {
          if (!existing.occurrences.includes(slot.location)) existing.occurrences.push(slot.location);
        } else {
          editorial.set(key, {
            id: `foundation-copy-${sha256(key).slice(0, 20)}`,
            token: capture.token,
            value: capture.value,
            occurrences: [slot.location],
          });
        }
      }
    }
  }
  const restorableTokens = new Set(comparison.slots.flatMap((slot) => slot.tokens));
  const missingStructuralSlots = match.foundation.tokens.filter((token) => !restorableTokens.has(token));
  if (missingStructuralSlots.length > 0) {
    throw new FoundationAlignmentError(
      'foundation-token-slot-missing',
      `${match.foundation.key} cannot restore ${missingStructuralSlots.join(', ')} by structural position`,
    );
  }
  const foundationIdentityTokens = match.foundation.tokens
    .filter((token): token is FoundationIdentityToken => IDENTITY_TOKEN_SET.has(token));
  for (const token of foundationIdentityTokens) {
    const values = [...identityValues.get(token)!];
    // A missing or inconsistent generated default must never prevent the
    // structural token from being restored. Leave it unset so downstream
    // hydration supplies a vetted value instead of guessing between samples.
    if (values.length === 1) identity[token] = values[0]!;
  }

  const normalizedSourceHtml = serialize(parse(input.sourceHtml) as never);
  const identityComparison = compareFoundationToSource(match.foundation.html, input.sourceHtml);
  if (!identityComparison.ok) {
    throw new FoundationAlignmentError('foundation-identity-alignment', identityComparison.mismatch ?? match.foundation.key);
  }
  const identitySlots: FoundationAlignmentSlot[] = [];
  for (const slot of identityComparison.slots) {
    if (slot.tokens.some((token) => !IDENTITY_TOKEN_SET.has(token))) continue;
    if (slot.frameMatched) {
      identitySlots.push(slot);
      continue;
    }
    let replacement = slot.sourceValue;
    let replaced = false;
    for (const token of slot.tokens) {
      const value = identity[token as FoundationIdentityToken];
      if (!value || !replacement.includes(value)) continue;
      replacement = replacement.split(value).join(`{{${token}}}`);
      replaced = true;
    }
    if (replaced) identitySlots.push({ ...slot, foundationTemplate: replacement });
  }
  applySlotValues(identityComparison.sourceDocument, identitySlots, 'foundationTemplate');
  const identityAlignedHtml = serialize(identityComparison.sourceDocument as never);

  applySlotValues(comparison.sourceDocument, comparison.slots, 'foundationTemplate');
  const alignedHtml = serialize(comparison.sourceDocument as never);
  const roundTripComparison = compareFoundationToSource(match.foundation.html, input.sourceHtml);
  if (!roundTripComparison.ok) {
    throw new FoundationAlignmentError('foundation-content-round-trip', roundTripComparison.mismatch ?? match.foundation.key);
  }
  applySlotValues(roundTripComparison.sourceDocument, roundTripComparison.slots, 'foundationTemplate');
  applySlotValues(roundTripComparison.sourceDocument, roundTripComparison.slots, 'sourceValue');
  const roundTripHtml = serialize(roundTripComparison.sourceDocument as never);
  const normalizedSourceSha256 = sha256(normalizedSourceHtml);
  const roundTripSha256 = sha256(roundTripHtml);
  if (roundTripSha256 !== normalizedSourceSha256) {
    throw new FoundationAlignmentError(
      'foundation-content-round-trip',
      `Captured content did not reconstruct ${input.sourceName ?? 'source HTML'}`,
    );
  }

  const sourceHash = sha256(input.sourceHtml);
  return {
    version: 'foundation-alignment-v1',
    foundationId: match.foundation.id,
    foundationSha256: match.foundation.sha256,
    registrySha256: input.registry.sha256,
    sourceSha256: sourceHash,
    sourceStructureSha256: match.evidence.sourceStructureSha256,
    alignedSha256: sha256(alignedHtml),
    normalizedSourceSha256,
    roundTripSha256,
    sourceUnchanged: true,
    alignedHtml,
    identityAlignedHtml,
    identityAlignedSha256: sha256(identityAlignedHtml),
    identityAlignedSlots: identitySlots.map((slot) => `${slot.location}${slot.attribute ? `@${slot.attribute}` : ''}`).sort(),
    editorialPreservedInIdentityAlignment: true,
    identity,
    editorialContent: [...editorial.values()]
      .map((entry) => ({ ...entry, occurrences: [...entry.occurrences].sort() }))
      .sort((left, right) => left.id.localeCompare(right.id, 'en')),
    slots: comparison.slots,
    theme: cssThemeExtraction(input.sourceHtml, input.stylesheets ?? {}),
    sourceProof: [{
      source: input.sourceName ?? 'memory:index.html',
      beforeSha256: sourceHash,
      afterSha256: sourceHash,
      unchanged: true,
    }],
  };
}

export async function planFoundationAlignmentFromFiles(
  input: PlanFoundationAlignmentFilesInput,
): Promise<FoundationAlignmentPlan> {
  const htmlPath = resolve(input.sourceHtmlPath);
  const stylesheetPaths = [...(input.stylesheetPaths ?? [])]
    .map((path) => resolve(path))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const paths = [htmlPath, ...stylesheetPaths];
  const before = new Map<string, string>();
  const contents = new Map<string, string>();
  for (const path of paths) {
    const stats = await lstat(path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new FoundationAlignmentError('foundation-source-non-file', path);
    }
    const contentsValue = await readFile(path, 'utf8');
    contents.set(path, contentsValue);
    before.set(path, sha256(contentsValue));
  }

  const plan = planFoundationAlignment({
    sourceHtml: contents.get(htmlPath)!,
    declaredNiche: input.declaredNiche,
    registry: input.registry,
    sourceName: htmlPath,
    stylesheets: Object.fromEntries(stylesheetPaths.map((path) => [basename(path), contents.get(path)!])),
  });

  const sourceProof: FoundationSourceProof[] = [];
  for (const path of paths) {
    const afterSha256 = sha256(await readFile(path, 'utf8'));
    const beforeSha256 = before.get(path)!;
    if (afterSha256 !== beforeSha256) {
      throw new FoundationAlignmentError('foundation-source-changed', path);
    }
    sourceProof.push({ source: path, beforeSha256, afterSha256, unchanged: true });
  }
  return { ...plan, sourceProof };
}

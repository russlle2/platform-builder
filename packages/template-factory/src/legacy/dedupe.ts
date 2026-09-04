import { parse, parseFragment } from 'parse5';
import postcss from 'postcss';
import {
  type CatalogTemplate,
  type CanonicalDesign,
  type ContentPreset,
  type DedupeFingerprint,
  type ThemePreset,
  sha256,
  stableStringify,
} from './contracts.js';

type HtmlNode = {
  nodeName: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
  value?: string;
  data?: string;
};

export interface VisualAliasEvidence {
  desktopSsim: number;
  mobileSsim: number;
  desktopPerceptualHashDistance: number;
  mobilePerceptualHashDistance: number;
  domSimilarity: number;
  /** Every corresponding page, compared independently at both viewports. */
  pages: VisualAliasPageEvidence[];
}

export interface VisualAliasPageEvidence {
  page: string;
  desktopSsim: number;
  mobileSsim: number;
  desktopPerceptualHashDistance: number;
  mobilePerceptualHashDistance: number;
}

export interface DedupeCandidate {
  fingerprint: DedupeFingerprint;
  catalogTemplate: CatalogTemplate;
  design: CanonicalDesign;
  contentPreset: ContentPreset;
  themePreset: ThemePreset;
}

export interface CompositionCompatibility {
  pass: boolean;
  designHash: string;
  editableSlots: number;
  imageSlots: number;
  themeSlots: number;
  issues: string[];
}

export interface DedupeAlias {
  legacySlug: string;
  designId: string;
  contentPresetId: string;
  themePresetId: string;
  reason: 'foundation-lineage' | 'exact-design' | 'verified-visual-equivalence' | 'distinct';
  canonicalLegacySlug: string;
  composition: Omit<CompositionCompatibility, 'issues'>;
}

export interface DedupeCluster {
  id: string;
  designId: string;
  canonicalLegacySlug: string;
  aliases: DedupeAlias[];
}

export type AliasEvidenceProvider = (
  canonical: DedupeCandidate,
  candidate: DedupeCandidate,
) => VisualAliasEvidence | undefined;

const VOLATILE_CLASSES = new Set(['active', 'current', 'is-open', 'open', 'selected']);
const THEME_VALUE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:transparent|currentcolor)\b/gi;

function setDifference(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

function pageEditSlots(pages: Readonly<Record<string, string>>): Set<string> {
  const slots = new Set<string>();
  for (const [page, html] of Object.entries(pages)) {
    const document = parse(html) as unknown as HtmlNode;
    const visit = (node: HtmlNode): void => {
      if (node.attrs) {
        const id = node.attrs.find((attr) => attr.name === 'data-dc-edit-id')?.value;
        const attribute = node.attrs.find((attr) => attr.name === 'data-dc-edit-attribute')?.value ?? '';
        if (id) slots.add(`${page}\0${id}\0${attribute}`);
      }
      for (const child of node.childNodes ?? []) visit(child);
    };
    visit(document);
  }
  return slots;
}

function reachableContentSlots(
  design: CanonicalDesign,
  preset: ContentPreset,
): { edits: Set<string>; images: Set<string> } {
  const edits = pageEditSlots(design.pages);
  const images = imageSlots(design);
  const entries = new Map(
    preset.entries.map((entry) => [
      `${entry.page}\0${entry.nodeId}\0${entry.attribute ?? ''}`,
      entry,
    ]),
  );
  const pending = [...edits];
  const expanded = new Set<string>();

  // Visible-text presets intentionally retain safe inline markup. That markup
  // can itself contain independently editable metadata (for example a button
  // aria-label) or an image. Those descendant slots are absent from the bare
  // design because the parent's children are represented by a content marker,
  // but applyContentPreset restores the subtree and then visits its descendants.
  // Follow only entries reachable from the design so an orphan preset entry
  // cannot make itself appear valid merely by referring to its own markup.
  while (pending.length > 0) {
    const key = pending.pop()!;
    if (expanded.has(key)) continue;
    expanded.add(key);
    const entry = entries.get(key);
    if (!entry || entry.attribute) continue;

    const fragment = parseFragment(entry.html) as unknown as HtmlNode;
    const visit = (node: HtmlNode): void => {
      if (node.attrs) {
        const id = node.attrs.find((attr) => attr.name === 'data-dc-edit-id')?.value;
        const attribute = node.attrs.find((attr) => attr.name === 'data-dc-edit-attribute')?.value ?? '';
        if (id) {
          const nestedKey = `${entry.page}\0${id}\0${attribute}`;
          if (!edits.has(nestedKey)) {
            edits.add(nestedKey);
            pending.push(nestedKey);
          }
        }
      }
      for (const child of node.childNodes ?? []) visit(child);
    };
    visit(fragment);
    for (const match of entry.html.matchAll(/__DC_IMAGE_([A-Za-z0-9_-]+)__/g)) {
      images.add(`${entry.page}\0${match[1]}`);
    }
  }
  return { edits, images };
}

function imageSlots(design: CanonicalDesign): Set<string> {
  const slots = new Set<string>();
  for (const [page, value] of [...Object.entries(design.pages), ...Object.entries(design.styles)]) {
    for (const match of value.matchAll(/__DC_IMAGE_([A-Za-z0-9_-]+)__/g)) slots.add(`${page}\0${match[1]}`);
  }
  return slots;
}

function themeSlots(design: CanonicalDesign): Set<string> {
  const slots = new Set<string>();
  for (const value of Object.values(design.styles)) {
    for (const match of value.matchAll(/var\(--dc-theme-([A-Za-z0-9_-]+)\)/g)) slots.add(match[1]!);
  }
  return slots;
}

/**
 * Hash the literal composition skeleton, after copy/images/theme values have
 * already been extracted. Equal hashes therefore mean presets address the
 * exact same DOM, navigation attributes, CSS rules, and slot identifiers.
 */
function presetCompatibility(design: CanonicalDesign, candidate: DedupeCandidate): CompositionCompatibility {
  const reachable = reachableContentSlots(design, candidate.contentPreset);
  const expectedEdits = reachable.edits;
  const suppliedEdits = new Set(candidate.contentPreset.entries.map((entry) => `${entry.page}\0${entry.nodeId}\0${entry.attribute ?? ''}`));
  const expectedImages = reachable.images;
  const suppliedImages = new Set(candidate.contentPreset.images.map((entry) => `${entry.page}\0${entry.slotId}`));
  const expectedTheme = themeSlots(design);
  const suppliedTheme = new Set(candidate.themePreset.tokens.map((token) => token.id));
  const issues: string[] = [];
  const report = (label: string, missing: string[], extra: string[]): void => {
    if (missing.length) issues.push(`${label}:missing:${missing.slice(0, 8).join(',')}${missing.length > 8 ? `,+${missing.length - 8}` : ''}`);
    if (extra.length) issues.push(`${label}:extra:${extra.slice(0, 8).join(',')}${extra.length > 8 ? `,+${extra.length - 8}` : ''}`);
  };
  report('editable', setDifference(expectedEdits, suppliedEdits), setDifference(suppliedEdits, expectedEdits));
  report('image', setDifference(expectedImages, suppliedImages), setDifference(suppliedImages, expectedImages));
  report('theme', setDifference(expectedTheme, suppliedTheme), setDifference(suppliedTheme, expectedTheme));
  return {
    pass: issues.length === 0,
    designHash: canonicalDesignHash(design),
    editableSlots: expectedEdits.size,
    imageSlots: expectedImages.size,
    themeSlots: expectedTheme.size,
    issues,
  };
}

/**
 * Fail-closed proof that both presets can address the canonical design. This
 * intentionally does not decide whether two different designs are equivalent;
 * that decision belongs to the independent structural and render-evidence gate.
 */
function checkPresetCompatibility(
  canonical: DedupeCandidate,
  candidate: DedupeCandidate,
): CompositionCompatibility {
  const canonicalHash = canonicalDesignHash(canonical.design);
  const canonicalPreset = presetCompatibility(canonical.design, canonical);
  const candidatePreset = presetCompatibility(canonical.design, candidate);
  const issues = [...canonicalPreset.issues, ...candidatePreset.issues];
  return { ...candidatePreset, pass: issues.length === 0, designHash: canonicalHash, issues };
}

/** Fail-closed proof of exact design identity plus preset compatibility. */
export function checkCompositionCompatibility(
  canonical: DedupeCandidate,
  candidate: DedupeCandidate,
): CompositionCompatibility {
  const compatibility = checkPresetCompatibility(canonical, candidate);
  const candidateHash = canonicalDesignHash(candidate.design);
  const issues = [...compatibility.issues];
  if (candidateHash !== compatibility.designHash) {
    issues.unshift(`design:mismatch:${compatibility.designHash}:${candidateHash}`);
  }
  return { ...compatibility, pass: issues.length === 0, issues };
}

function normalizeAttrs(node: HtmlNode): string {
  return (node.attrs ?? [])
    .filter((attr) => !/^data-dc-(?:edit|image)-id$/.test(attr.name))
    .filter((attr) => !['href', 'src', 'srcset', 'alt', 'title', 'content', 'value', 'placeholder'].includes(attr.name))
    .map((attr) => {
      if (attr.name === 'class') {
        const classes = attr.value.split(/\s+/).filter(Boolean).filter((value) => !VOLATILE_CLASSES.has(value)).sort();
        return `${attr.name}=${classes.join('.')}`;
      }
      if (attr.name === 'style') {
        return `${attr.name}=${attr.value.replace(THEME_VALUE, '<color>').replace(/url\([^)]*\)/gi, 'url(<asset>)').replace(/\s+/g, ' ').trim()}`;
      }
      return `${attr.name}=${attr.value}`;
    })
    .sort()
    .join('|');
}

function domShape(node: HtmlNode): string {
  if (node.nodeName === '#text' || node.nodeName === '#comment') return '';
  if (node.tagName === 'style') {
    const css = (node.childNodes ?? []).map((child) => child.nodeName === '#text' ? (child as HtmlNode & { value?: string }).value ?? '' : '').join('');
    return `<style[${normalizeAttrs(node)}]>${normalizeCssStructure(css)}</style>`;
  }
  const children = (node.childNodes ?? []).map(domShape).filter(Boolean).join('');
  if (!node.tagName) return children;
  return `<${node.tagName}[${normalizeAttrs(node)}]>${children}</${node.tagName}>`;
}

export function normalizeHtmlStructure(html: string): string {
  return domShape(parse(html) as unknown as HtmlNode);
}

/** Fast local structural similarity used to decide whether render comparison is worthwhile. */
export function domSimilarity(leftHtml: string, rightHtml: string): number {
  const left = normalizeHtmlStructure(leftHtml);
  const right = normalizeHtmlStructure(rightHtml);
  if (left === right) return 1;
  const shingles = (value: string): Map<string, number> => {
    const tokens = value.match(/<\/?[^>]+>|[^<>]+/g) ?? [];
    const output = new Map<string, number>();
    for (let index = 0; index < Math.max(1, tokens.length - 2); index += 1) {
      const shingle = tokens.slice(index, index + 3).join('');
      output.set(shingle, (output.get(shingle) ?? 0) + 1);
    }
    return output;
  };
  const leftSet = shingles(left);
  const rightSet = shingles(right);
  let overlap = 0;
  let leftCount = 0;
  let rightCount = 0;
  for (const count of leftSet.values()) leftCount += count;
  for (const count of rightSet.values()) rightCount += count;
  for (const [key, count] of leftSet) overlap += Math.min(count, rightSet.get(key) ?? 0);
  return leftCount + rightCount === 0 ? 1 : (2 * overlap) / (leftCount + rightCount);
}

function normalizeCssValue(property: string, value: string): string {
  let output = value
    .replace(/url\([^)]*\)/gi, 'url(<asset>)')
    .replace(THEME_VALUE, '<color>')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(?:font|font-family)$/i.test(property)) output = '<font>';
  return output;
}

export function normalizeCssStructure(css: string): string {
  try {
    const root = postcss.parse(css);
    const records: string[] = [];
    root.walkRules((rule) => {
      const declarations: string[] = [];
      rule.walkDecls((declaration) => {
        declarations.push(`${declaration.prop.toLowerCase()}:${normalizeCssValue(declaration.prop, declaration.value)}${declaration.important ? '!important' : ''}`);
      });
      records.push(`${rule.selector.replace(/\s+/g, ' ').trim()}{${declarations.join(';')}}`);
    });
    root.walkAtRules((rule) => {
      if (rule.name !== 'import') records.push(`@${rule.name} ${rule.params.replace(/\s+/g, ' ').trim()}`);
    });
    return records.join('\n');
  } catch {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/url\([^)]*\)/gi, 'url(<asset>)')
      .replace(THEME_VALUE, '<color>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

type CssShapeNode = {
  type: string;
  name?: string;
  params?: string;
  selector?: string;
  prop?: string;
  value?: string;
  important?: boolean;
  nodes?: CssShapeNode[];
};

function compactCssValue(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s*([,:;()])\s*/g, '$1').trim();
}

function compositionCssNode(node: CssShapeNode): string {
  if (node.type === 'decl') return `${node.prop?.toLowerCase()}:${compactCssValue(node.value ?? '')}${node.important ? '!important' : ''};`;
  if (node.type === 'rule') return `${node.selector?.replace(/\s+/g, ' ').trim()}{${(node.nodes ?? []).map(compositionCssNode).join('')}}`;
  if (node.type === 'atrule') {
    const head = `@${node.name?.toLowerCase()}${node.params ? ` ${compactCssValue(node.params)}` : ''}`;
    return node.nodes ? `${head}{${node.nodes.map(compositionCssNode).join('')}}` : `${head};`;
  }
  return '';
}

export function normalizeCompositionCss(css: string): string {
  try {
    const root = postcss.parse(css) as unknown as CssShapeNode;
    return (root.nodes ?? []).map(compositionCssNode).join('');
  } catch {
    return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
  }
}

function compositionAttrs(node: HtmlNode): string {
  return (node.attrs ?? []).map((attr) => {
    const name = attr.name.toLowerCase();
    const value = name === 'class'
      ? attr.value.split(/\s+/).filter(Boolean).sort().join(' ')
      : name === 'style'
        ? compactCssValue(attr.value)
        : attr.value.replace(/\s+/g, ' ').trim();
    return `${name}=${JSON.stringify(value)}`;
  }).sort().join('|');
}

function compositionHtmlNode(node: HtmlNode): string {
  if (node.nodeName === '#text') {
    const value = (node.value ?? '').replace(/\s+/g, ' ').trim();
    return value ? `#text:${value}` : '';
  }
  if (node.nodeName === '#comment') {
    const value = (node.data ?? '').trim();
    return value.startsWith('dc-content:') ? `#comment:${value}` : '';
  }
  if (node.tagName === 'style') {
    const css = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
    return `<style[${compositionAttrs(node)}]>${normalizeCompositionCss(css)}</style>`;
  }
  const children = (node.childNodes ?? []).map(compositionHtmlNode).filter(Boolean).join('');
  if (!node.tagName) return children;
  return `<${node.tagName}[${compositionAttrs(node)}]>${children}</${node.tagName}>`;
}

export function normalizeCompositionHtml(html: string): string {
  return compositionHtmlNode(parse(html) as unknown as HtmlNode);
}

/**
 * Hash the literal composition skeleton that produces a browser-receipted
 * artifact. Structural normalization remains available through the DOM/CSS
 * fingerprint fields for candidate discovery, but canonical identity is
 * intentionally byte-sensitive so one design ID can never represent two
 * compositions that emit different bytes at promotion time.
 */
export function canonicalDesignHash(design: Omit<CanonicalDesign, 'id'> | CanonicalDesign): string {
  return sha256(stableStringify({
    niche: design.niche,
    foundation: design.foundation ?? null,
    pages: Object.fromEntries(Object.entries(design.pages)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, html]) => [name, html])),
    styles: Object.fromEntries(Object.entries(design.styles)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, css]) => [name, css])),
    pageRoles: design.pageRoles,
  }));
}

function normalizePageSet(pages: Readonly<Record<string, string>>): { dom: string } {
  const names = Object.keys(pages).sort();
  return {
    dom: names.map((name) => `${name}:${normalizeHtmlStructure(pages[name]!)}`).join('\n'),
  };
}

function normalizeStyleSet(styles: Readonly<Record<string, string>>): { css: string } {
  const names = Object.keys(styles).sort();
  return {
    css: names.map((name) => `${name}:${normalizeCssStructure(styles[name]!)}`).join('\n'),
  };
}

export function createDedupeFingerprint(input: {
  legacySlug: string;
  niche: string;
  foundation?: string;
  pages: Readonly<Record<string, string>>;
  styles: Readonly<Record<string, string>>;
  pageRoles: Readonly<Record<string, string>>;
  contentHash: string;
  themeHash: string;
}): DedupeFingerprint {
  const pageSet = normalizePageSet(input.pages);
  const styleSet = normalizeStyleSet(input.styles);
  const pageRoles = [...new Set(Object.values(input.pageRoles))].sort();
  const domHash = sha256(pageSet.dom);
  const cssHash = sha256(styleSet.css);
  const structureHash = sha256(stableStringify({ niche: input.niche, pageRoles, domHash, cssHash }));
  const fingerprint: DedupeFingerprint = {
    legacySlug: input.legacySlug,
    niche: input.niche,
    pageRoles,
    domHash,
    cssHash,
    structureHash,
    // Structural hashes above deliberately ignore copy/theme details for
    // similarity discovery. Alias identity is stricter: it must retain every
    // byte of the separated composition skeleton so a canonical design plus
    // this source's presets can reproduce its browser-receipted artifact.
    exactDesignHash: canonicalDesignHash({
      niche: input.niche,
      ...(input.foundation ? { foundation: input.foundation } : {}),
      pages: input.pages,
      styles: input.styles,
      pageRoles: input.pageRoles,
      structureHash,
      domHash,
      cssHash,
    }),
    contentHash: input.contentHash,
    themeHash: input.themeHash,
  };
  if (input.foundation) fingerprint.foundation = input.foundation;
  return fingerprint;
}

export function satisfiesVisualAliasThresholds(
  evidence: VisualAliasEvidence,
  expectedPages?: readonly string[],
): boolean {
  const observedPages = evidence.pages.map((page) => page.page);
  const uniquePages = new Set(observedPages);
  const expected = expectedPages ? [...expectedPages].sort() : [...uniquePages].sort();
  const completePageSet = evidence.pages.length > 0
    && uniquePages.size === evidence.pages.length
    && stableStringify([...uniquePages].sort()) === stableStringify(expected);
  const everyPagePasses = evidence.pages.every((page) => (
    page.desktopSsim >= 0.995
      && page.mobileSsim >= 0.995
      && page.desktopPerceptualHashDistance <= 4
      && page.mobilePerceptualHashDistance <= 4
  ));
  return completePageSet
    && everyPagePasses
    && evidence.domSimilarity >= 0.98
    && evidence.desktopSsim >= 0.995
    && evidence.mobileSsim >= 0.995
    && evidence.desktopPerceptualHashDistance <= 4
    && evidence.mobilePerceptualHashDistance <= 4;
}

/**
 * A foundation marker is lineage evidence, not proof that two emitted
 * composition skeletons are interchangeable. Foundation aliases require exact
 * post-repair identity. Irregular designs with different exact hashes may only
 * alias after matching niche/page roles, literal preset compatibility, and the
 * conservative two-viewport visual evidence gate.
 */
export function canAliasDesigns(
  left: DedupeFingerprint,
  right: DedupeFingerprint,
  evidence?: VisualAliasEvidence,
  expectedPages?: readonly string[],
): { alias: boolean; reason: DedupeAlias['reason'] } {
  if (left.niche !== right.niche) {
    return { alias: false, reason: 'distinct' };
  }
  if (
    left.foundation
    && right.foundation
    && left.foundation === right.foundation
    && left.exactDesignHash === right.exactDesignHash
  ) {
    return { alias: true, reason: 'foundation-lineage' };
  }
  if (stableStringify(left.pageRoles) !== stableStringify(right.pageRoles)) {
    return { alias: false, reason: 'distinct' };
  }
  if (!left.foundation && !right.foundation && left.exactDesignHash === right.exactDesignHash) {
    return { alias: true, reason: 'exact-design' };
  }
  if (
    !left.foundation
    && !right.foundation
    && evidence
    && satisfiesVisualAliasThresholds(evidence, expectedPages)
    && evidence.pages.length === left.pageRoles.length
  ) {
    return { alias: true, reason: 'verified-visual-equivalence' };
  }
  return { alias: false, reason: 'distinct' };
}

/** Deterministic grouping; every source slug is retained as an alias record. */
export function buildDedupeClusters(
  candidates: readonly DedupeCandidate[],
  evidenceProvider?: AliasEvidenceProvider,
): DedupeCluster[] {
  const sorted = [...candidates].sort((a, b) => a.fingerprint.legacySlug.localeCompare(b.fingerprint.legacySlug));
  const clusters: DedupeCluster[] = [];
  const clusterByStrictKey = new Map<string, DedupeCluster>();
  const canonicalByClusterId = new Map<string, DedupeCandidate>();
  for (const candidate of sorted) {
    const selfCompatibility = checkCompositionCompatibility(candidate, candidate);
    if (!selfCompatibility.pass) {
      throw new Error(`Template ${candidate.fingerprint.legacySlug} has an invalid design/preset composition: ${selfCompatibility.issues.join('; ')}`);
    }
    const roleKey = stableStringify(candidate.fingerprint.pageRoles);
    const compositionHash = canonicalDesignHash(candidate.design);
    const strictKey = candidate.fingerprint.foundation
      ? `foundation\0${candidate.fingerprint.niche}\0${candidate.fingerprint.foundation}\0${compositionHash}`
      : `exact\0${candidate.fingerprint.niche}\0${roleKey}\0${compositionHash}`;
    let cluster = clusterByStrictKey.get(strictKey);
    let reason: DedupeAlias['reason'] = 'distinct';
    if (cluster) {
      reason = candidate.fingerprint.foundation ? 'foundation-lineage' : 'exact-design';
    } else if (evidenceProvider) {
      for (const existing of clusters) {
        const canonical = canonicalByClusterId.get(existing.id)!;
        // Avoid both an unnecessary render-evidence lookup and any possibility
        // of cross-niche, cross-topology, or foundation visual aliasing.
        if (
          canonical.fingerprint.foundation
          || candidate.fingerprint.foundation
          || canonical.fingerprint.niche !== candidate.fingerprint.niche
          || stableStringify(canonical.fingerprint.pageRoles) !== roleKey
        ) continue;
        const composition = checkPresetCompatibility(canonical, candidate);
        if (!composition.pass) continue;
        const evidence = evidenceProvider(canonical, candidate);
        const decision = canAliasDesigns(
          canonical.fingerprint,
          candidate.fingerprint,
          evidence,
          Object.keys(canonical.design.pages),
        );
        if (decision.alias) {
          cluster = existing;
          reason = decision.reason;
          break;
        }
      }
    }
    if (!cluster) {
      cluster = {
        id: `cluster_${sha256(strictKey).slice(0, 20)}`,
        designId: candidate.design.id,
        canonicalLegacySlug: candidate.fingerprint.legacySlug,
        aliases: [],
      };
      clusters.push(cluster);
      clusterByStrictKey.set(strictKey, cluster);
      canonicalByClusterId.set(cluster.id, candidate);
    }
    const canonicalCandidate = canonicalByClusterId.get(cluster.id) ?? candidate;
    const composition = reason === 'verified-visual-equivalence'
      ? checkPresetCompatibility(canonicalCandidate, candidate)
      : checkCompositionCompatibility(canonicalCandidate, candidate);
    if (!composition.pass) {
      throw new Error(`Unsafe alias ${candidate.fingerprint.legacySlug} -> ${cluster.canonicalLegacySlug}: ${composition.issues.join('; ')}`);
    }
    cluster.aliases.push({
      legacySlug: candidate.fingerprint.legacySlug,
      designId: cluster.designId,
      contentPresetId: candidate.catalogTemplate.contentPresetId,
      themePresetId: candidate.catalogTemplate.themePresetId,
      reason,
      canonicalLegacySlug: cluster.canonicalLegacySlug,
      composition: {
        pass: true,
        designHash: composition.designHash,
        editableSlots: composition.editableSlots,
        imageSlots: composition.imageSlots,
        themeSlots: composition.themeSlots,
      },
    });
  }
  return clusters;
}

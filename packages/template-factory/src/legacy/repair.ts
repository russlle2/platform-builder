import { parse, parseFragment, serialize, serializeOuter } from 'parse5';
import postcss from 'postcss';
import {
  COMPATIBILITY_SCRIPT_PATH,
  TOKEN_ALIASES,
  type CanonicalField,
  type RepairIssue,
  type Transformation,
  normalizeFieldName,
  sha256,
} from './contracts.js';
import {
  CORE_PERSONALIZATION_TOKENS,
  SENSITIVE_FORM_TEXT_RE,
  UNSUPPORTED_ABSOLUTE_EFFICACY_RE,
  UNSUPPORTED_CREDENTIAL_CLAIM_RE,
  UNSUPPORTED_CREDENTIAL_PROOF_RE,
  UNSUPPORTED_OUTCOME_CLAIM_RE,
  UNSUPPORTED_PERCENT_RESULT_RE,
  UNSUPPORTED_PROOF_ATTRIBUTE_RE,
  UNSUPPORTED_PROOF_TEXT_RE,
  extractTemplateTokens,
  isCorePersonalizationToken,
} from '../template-contract.js';

type Attr = { name: string; value: string; namespace?: string; prefix?: string };
export type HtmlNode = {
  nodeName: string;
  tagName?: string;
  attrs?: Attr[];
  childNodes?: HtmlNode[];
  parentNode?: HtmlNode;
  value?: string;
  data?: string;
};

export interface BackgroundSelector {
  stylesheet: string;
  selector: string;
  source: string;
  slotId: string;
}

export interface StylesheetRepairResult {
  css: string;
  backgrounds: BackgroundSelector[];
  issues: RepairIssue[];
  transformations: Transformation[];
}

export interface PageRepairResult {
  html: string;
  fields: CanonicalField[];
  editIds: string[];
  imageIds: string[];
  backgroundSelectors: BackgroundSelector[];
  issues: RepairIssue[];
  transformations: Transformation[];
}

export interface RepairPageOptions {
  file: string;
  slug: string;
  niche: string;
  fields: readonly CanonicalField[];
  pageNames: readonly string[];
  foundation?: string;
}

const TEXT_TAGS = new Set([
  'a', 'blockquote', 'button', 'caption', 'code', 'dd', 'dt', 'figcaption', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'label', 'legend', 'li', 'option', 'p', 'pre', 'summary', 'td', 'th', 'title',
]);
const FALLBACK_TEXT_TAGS = new Set(['address', 'article', 'aside', 'b', 'div', 'em', 'footer', 'header', 'i', 'main', 'nav', 'section', 'small', 'span', 'strong', 'time', 'u']);
const NON_CONTENT_TEXT_ANCESTORS = new Set(['script', 'style', 'svg', 'template']);
const NON_EDITABLE_ELEMENTS = new Set(['script', 'style', 'svg', 'template']);
const REMOVED_ELEMENTS = new Set(['frame', 'frameset', 'iframe', 'object', 'embed']);
const URL_ATTRS = new Set(['action', 'formaction', 'href', 'poster', 'src', 'xlink:href']);
const SENSITIVE_FORM = SENSITIVE_FORM_TEXT_RE;
const PROOF_TEXT = UNSUPPORTED_PROOF_TEXT_RE;
const PROOF_ATTR = UNSUPPORTED_PROOF_ATTRIBUTE_RE;
const SYNTHETIC_BADGE_SIGNAL = UNSUPPORTED_CREDENTIAL_PROOF_RE;
const CLAIM_TEXT = new RegExp(
  `${UNSUPPORTED_OUTCOME_CLAIM_RE.source}|${UNSUPPORTED_ABSOLUTE_EFFICACY_RE.source}|${UNSUPPORTED_CREDENTIAL_CLAIM_RE.source}`,
  'i',
);
const PERCENT_RESULT = UNSUPPORTED_PERCENT_RESULT_RE;
const PRICE = /(?:[$£€]\s*\d[\d,.]*(?:\s*(?:USD|EUR|GBP))?|\b\d[\d,.]*\s*(?:USD|EUR|GBP)\b)/gi;
const THEME_COLOR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<![\w-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?(?![\w-])/gi;
const MUSTACHE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SAFE_PROTOCOL = /^(?:https?:|mailto:|tel:|#|\/|\.\.?\/)/i;
const REMOTE_URL = /^(?:https?:)?\/\//i;

const NEUTRAL_BLOCK = '<section class="dc-neutral-guidance" data-dc-safe-replacement="proof"><h2>A clear, practical next step</h2><p>Ask about current services, availability, and what to expect before you decide.</p></section>';
const NEUTRAL_CLAIM = 'Services and experiences vary. Ask the practice what is currently offered and what to expect.';
const STANDARD_FORM = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button><p class="dc-form-status" aria-live="polite"></p></form>';

/** Audited, dependency-free behavior shared by every rehabilitated template. */
export const LEGACY_COMPATIBILITY_SCRIPT = `(() => {
  'use strict';
  if (window.__dailyClarityCompatibilityInstalled) return;
  window.__dailyClarityCompatibilityInstalled = true;
  document.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[aria-controls]') : null;
    if (!(control instanceof HTMLElement)) return;
    const targetId = control.getAttribute('aria-controls');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    const expanded = control.getAttribute('aria-expanded') === 'true';
    control.setAttribute('aria-expanded', String(!expanded));
    target.classList.toggle('is-open', !expanded);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-dc-standard-form]')) return;
    if (!form.checkValidity()) return;
    form.dispatchEvent(new CustomEvent('dc:form-submit', { bubbles: true }));
  });
})();
`;

function attrs(node: HtmlNode): Attr[] {
  if (!node.attrs) node.attrs = [];
  return node.attrs;
}

function getAttr(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((attr) => attr.name.toLowerCase() === name.toLowerCase())?.value;
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  const existing = attrs(node).find((attr) => attr.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.value = value;
  else attrs(node).push({ name, value });
}

function removeAttr(node: HtmlNode, name: string): void {
  if (!node.attrs) return;
  node.attrs = node.attrs.filter((attr) => attr.name.toLowerCase() !== name.toLowerCase());
}

function textContent(node: HtmlNode): string {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(textContent).join('');
}

function nodeMarkup(node: HtmlNode): string {
  return serializeOuter(node as never);
}

function walk(node: HtmlNode, visitor: (node: HtmlNode) => void): void {
  visitor(node);
  for (const child of [...(node.childNodes ?? [])]) walk(child, visitor);
}

function isDataBearingFormControl(node: HtmlNode): boolean {
  if (!['input', 'select', 'textarea'].includes(node.tagName ?? '')) return false;
  return node.tagName !== 'input' || !/^(?:button|submit|reset|image)$/i.test(getAttr(node, 'type') ?? 'text');
}

/** Names descendant and explicit `form=` controls according to their real form owner. */
function nameFormControls(document: HtmlNode): number {
  const forms: HtmlNode[] = [];
  const controls: HtmlNode[] = [];
  walk(document, (node) => {
    if (node.tagName === 'form') forms.push(node);
    else if (isDataBearingFormControl(node)) controls.push(node);
  });
  const formsById = new Map<string, HtmlNode>();
  for (const form of forms) {
    const id = getAttr(form, 'id');
    if (id && !formsById.has(id)) formsById.set(id, form);
  }
  const controlsByForm = new Map(forms.map((form) => [form, [] as HtmlNode[]]));
  for (const control of controls) {
    const explicitOwner = getAttr(control, 'form');
    let owner = explicitOwner === undefined ? undefined : formsById.get(explicitOwner);
    if (explicitOwner === undefined) {
      let cursor = control.parentNode;
      while (cursor && !owner) {
        if (cursor.tagName === 'form') owner = cursor;
        cursor = cursor.parentNode;
      }
    }
    if (owner) controlsByForm.get(owner)?.push(control);
  }

  let named = 0;
  for (const formControls of controlsByForm.values()) {
    const usedNames = new Set(formControls
      .map((control) => getAttr(control, 'name')?.trim())
      .filter((name): name is string => Boolean(name)));
    let controlIndex = 0;
    for (const control of formControls) {
      controlIndex += 1;
      if (getAttr(control, 'name')?.trim()) continue;
      const marker = (getAttr(control, 'id') ?? `${control.tagName}-${controlIndex}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || `field-${controlIndex}`;
      let generated = marker;
      let suffix = 2;
      while (usedNames.has(generated)) generated = `${marker}-${suffix++}`;
      setAttr(control, 'name', generated);
      usedNames.add(generated);
      named += 1;
    }
  }
  return named;
}

function findElement(node: HtmlNode, tagName: string): HtmlNode | undefined {
  let found: HtmlNode | undefined;
  walk(node, (candidate) => {
    if (!found && candidate.tagName === tagName) found = candidate;
  });
  return found;
}

function removeNode(node: HtmlNode): void {
  const parent = node.parentNode;
  if (!parent?.childNodes) return;
  parent.childNodes = parent.childNodes.filter((child) => child !== node);
}

function replaceNode(node: HtmlNode, replacementHtml: string): void {
  const parent = node.parentNode;
  if (!parent?.childNodes) return;
  const fragment = parseFragment(replacementHtml) as unknown as HtmlNode;
  const replacements = fragment.childNodes ?? [];
  const index = parent.childNodes.indexOf(node);
  for (const replacement of replacements) replacement.parentNode = parent;
  parent.childNodes.splice(index, 1, ...replacements);
}

function replaceWithText(node: HtmlNode, value: string): void {
  node.childNodes = [{ nodeName: '#text', value, parentNode: node }];
}

function appendHtml(node: HtmlNode, html: string): void {
  const fragment = parseFragment(html) as unknown as HtmlNode;
  if (!node.childNodes) node.childNodes = [];
  for (const child of fragment.childNodes ?? []) {
    child.parentNode = node;
    node.childNodes.push(child);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function concreteDefault(value: string | undefined): boolean {
  return Boolean(value?.trim() && !/\{\{|\}\}/.test(value));
}

function fallbackForToken(token: string): string {
  if (/HEADLINE|HEADING|TITLE/.test(token)) return 'Support designed around your priorities';
  if (/BODY|DESCRIPTION|COPY|TEXT|INTRO/.test(token)) return 'Explore the available services and ask the practice about a next step that fits your needs.';
  if (/FAQ_Q|QUESTION/.test(token)) return 'What should I know before getting started?';
  if (/FAQ_A|ANSWER/.test(token)) return 'Contact the practice for current details, availability, and answers to your questions.';
  if (/PRICE|RATE|COST/.test(token)) return 'Contact for current pricing';
  if (/BLEND|PRODUCT|SERVICE|PROGRAM|OFFER/.test(token)) return 'Current featured option';
  if (/CTA.*LABEL|BUTTON.*TEXT/.test(token)) return 'Get in touch';
  return 'Contact the practice for current details.';
}

function normalizeExpressions(html: string, fields: readonly CanonicalField[], file: string): {
  html: string;
  issues: RepairIssue[];
  transformations: Transformation[];
} {
  let escapedDelimiters = 0;
  let zeroWidthDelimiters = 0;
  let spacedDelimiters = 0;
  // One legacy cohort escaped Mustache braces as `{\{TOKEN\}}`. Normalize
  // that exact generated defect before the ordinary expression mapping so a
  // safe core token is retained instead of forcing the whole design to the
  // fallback lane.
  const expressionSource = html
    .replace(/\{\\\{/g, () => { escapedDelimiters += 1; return '{{'; })
    .replace(/\\\}\}/g, () => { escapedDelimiters += 1; return '}}'; })
    .replace(/\{[\u200B-\u200D\uFEFF]+\{/g, () => { zeroWidthDelimiters += 1; return '{{'; })
    .replace(/\}[\u200B-\u200D\uFEFF]+\}/g, () => { zeroWidthDelimiters += 1; return '}}'; })
    .replace(
      /\{\s+\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\s*\}|\{\s*\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\s+\}/g,
      (_full, leading: string | undefined, trailing: string | undefined) => {
        spacedDelimiters += 1;
        return `{{${leading ?? trailing}}}`;
      },
    );
  const defaults = new Map(fields.map((field) => [field.name, field.default]));
  let aliases = 0;
  let materialized = 0;
  const issues: RepairIssue[] = [];
  const normalized = expressionSource.replace(MUSTACHE, (full, expression: string) => {
    const trimmed = expression.trim();
    // Explicitly support the malformed initial/slice expressions observed in the corpus.
    const baseMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)(?::0(?::1)?|\.charAt\(0\)|\.slice\(0\s*,\s*1\)|\s*\|\s*first)$/i);
    const simple = trimmed.match(/^[A-Za-z][A-Za-z0-9_]*$/) ? trimmed : baseMatch?.[1];
    if (!simple) {
      materialized += 1;
      issues.push({ code: 'unsupported-expression', severity: 'warning', file, message: `Replaced unsupported expression ${full.slice(0, 80)} with vetted neutral copy.`, resolved: true });
      return fallbackForToken(trimmed.toUpperCase());
    }
    const sourceName = normalizeFieldName(simple);
    const canonical = TOKEN_ALIASES[sourceName] ?? sourceName;
    if (isCorePersonalizationToken(canonical)) {
      if (canonical !== simple.toUpperCase() || baseMatch) aliases += 1;
      return `{{${canonical}}}`;
    }
    const defaultValue = defaults.get(sourceName) ?? defaults.get(canonical);
    materialized += 1;
    issues.push({ code: 'editorial-token-materialized', severity: 'info', file, message: `Materialized unsupported editorial token {{${trimmed}}} into its content preset.`, resolved: true });
    return escapeHtml(concreteDefault(defaultValue) ? defaultValue! : fallbackForToken(canonical));
  });
  const transformations: Transformation[] = [];
  if (escapedDelimiters) transformations.push({ rule: 'normalize-escaped-token-delimiters', file, count: escapedDelimiters });
  if (zeroWidthDelimiters) transformations.push({ rule: 'normalize-zero-width-token-delimiters', file, count: zeroWidthDelimiters });
  if (spacedDelimiters) transformations.push({ rule: 'normalize-spaced-token-delimiters', file, count: spacedDelimiters });
  if (aliases) transformations.push({ rule: 'normalize-token-aliases', file, count: aliases });
  if (materialized) transformations.push({ rule: 'materialize-editorial-tokens', file, count: materialized });
  return { html: normalized, issues, transformations };
}

function structuralPath(node: HtmlNode): string {
  const parts: string[] = [];
  let cursor: HtmlNode | undefined = node;
  while (cursor?.parentNode) {
    const tag = cursor.tagName ?? cursor.nodeName;
    const siblings = (cursor.parentNode.childNodes ?? []).filter((candidate) => (candidate.tagName ?? candidate.nodeName) === tag);
    parts.push(`${tag}:${Math.max(0, siblings.indexOf(cursor))}`);
    cursor = cursor.parentNode;
  }
  return parts.reverse().join('/');
}

function hasClassOrId(node: HtmlNode, pattern: RegExp): boolean {
  const value = `${getAttr(node, 'class') ?? ''} ${getAttr(node, 'id') ?? ''} ${getAttr(node, 'data-section') ?? ''}`;
  return pattern.test(value);
}

function nearestProofContainer(node: HtmlNode): HtmlNode {
  const tag = node.tagName ?? '';
  if (['section', 'article', 'aside', 'figure', 'div'].includes(tag)) return node;
  if (tag === 'blockquote') {
    const parent = node.parentNode;
    if (parent && ['article', 'figure'].includes(parent.tagName ?? '')) return parent;
    if (parent?.tagName === 'div' && hasClassOrId(parent, PROOF_ATTR)) return parent;
  }
  return node;
}

function isProofContainer(node: HtmlNode): boolean {
  const tag = node.tagName ?? '';
  if (!['section', 'article', 'aside', 'figure', 'blockquote', 'div'].includes(tag)) return false;
  if (hasClassOrId(node, PROOF_ATTR)) return true;

  const accessibleSignal = [
    getAttr(node, 'aria-label'),
    getAttr(node, 'title'),
    getAttr(node, 'aria-labelledby'),
    getAttr(node, 'alt'),
    getAttr(node, 'data-tip'),
    getAttr(node, 'data-tooltip'),
    getAttr(node, 'data-title'),
  ].filter(Boolean).join(' ');
  if (PROOF_TEXT.test(accessibleSignal) || PROOF_ATTR.test(accessibleSignal) || SYNTHETIC_BADGE_SIGNAL.test(accessibleSignal)) return true;

  // A quote class is an explicit generated-proof signal, but searching through
  // an arbitrary div can once again select an entire page wrapper. Restrict the
  // descendant search to semantic regions and stop at nested sections so the
  // smallest meaningful testimonial region is replaced.
  if (tag !== 'div') {
    const hasExplicitProofDescendant = (candidate: HtmlNode): boolean => {
      for (const child of candidate.childNodes ?? []) {
        if (!child.tagName) continue;
        // Let the nested section select itself when the outer section is only
        // a general content wrapper.
        if (child.tagName === 'section') continue;
        if (hasClassOrId(child, PROOF_ATTR)) return true;
        const childSignal = [
          getAttr(child, 'aria-label'),
          getAttr(child, 'title'),
          getAttr(child, 'alt'),
          getAttr(child, 'data-tip'),
          getAttr(child, 'data-tooltip'),
          getAttr(child, 'data-title'),
        ].filter(Boolean).join(' ');
        if (PROOF_TEXT.test(childSignal) || PROOF_ATTR.test(childSignal) || SYNTHETIC_BADGE_SIGNAL.test(childSignal)) return true;
        if (hasExplicitProofDescendant(child)) return true;
      }
      return false;
    };
    if (hasExplicitProofDescendant(node)) return true;
  }

  // Text inherited from an entire wrapper must not cause that wrapper (and
  // unrelated sibling content) to be replaced merely because a descendant
  // navigation link mentions client stories. Attribute/class evidence above
  // may search descendants, while vocabulary-only evidence must be direct.
  const signalText = (node.childNodes ?? []).map((child) => {
    if (child.nodeName === '#text') return child.value ?? '';
    return /^(?:h[1-6]|p|blockquote|figcaption|small|strong)$/.test(child.tagName ?? '')
      || (child.tagName === 'div' && (child.childNodes ?? []).every((nested) => nested.nodeName === '#text'))
      ? textContent(child)
      : '';
  }).join(' ');
  return PROOF_TEXT.test(signalText.replace(/\s+/g, ' '));
}

function ensureMainLandmark(document: HtmlNode): number {
  if (findElement(document, 'main')) return 0;

  let roleMain: HtmlNode | undefined;
  walk(document, (node) => {
    if (!roleMain && node.tagName && /^main$/i.test(getAttr(node, 'role') ?? '')) roleMain = node;
  });
  if (roleMain) {
    roleMain.tagName = 'main';
    roleMain.nodeName = 'main';
    removeAttr(roleMain, 'role');
    return 1;
  }

  const body = findElement(document, 'body');
  if (!body) return 0;
  const excluded = new Set(['header', 'nav', 'footer', 'script', 'style', 'noscript', 'template']);
  const elementChildren = (node: HtmlNode): HtmlNode[] => (node.childNodes ?? []).filter((child) => Boolean(child.tagName));
  const isDecoration = (node: HtmlNode): boolean => {
    if (getAttr(node, 'aria-hidden') === 'true' && !textContent(node).trim()) return true;
    const marker = `${getAttr(node, 'class') ?? ''} ${getAttr(node, 'id') ?? ''}`;
    return /(?:^|[-_\s])(?:decor(?:ation)?|background|backdrop|texture|orb|blob)(?:$|[-_\s])/i.test(marker)
      && !textContent(node).trim();
  };

  // Most main-less legacy pages place all site chrome and content inside one
  // wrapper. Insert the landmark within that shell so header/nav/footer do not
  // become descendants of main and existing wrapper-level layout remains intact.
  const significantBodyChildren = elementChildren(body)
    .filter((node) => !['script', 'style', 'noscript', 'template'].includes(node.tagName ?? ''))
    .filter((node) => !isDecoration(node));
  const dominantShell = significantBodyChildren.length === 1
    ? significantBodyChildren[0]
    : significantBodyChildren.find((node) => {
      if (!['div', 'section'].includes(node.tagName ?? '')) return false;
      const marker = `${getAttr(node, 'class') ?? ''} ${getAttr(node, 'id') ?? ''}`;
      const looksLikeShell = /(?:^|[-_\s])(?:wrap(?:per)?|container|site|shell|page|app)(?:$|[-_\s])/i.test(marker);
      const children = elementChildren(node);
      return looksLikeShell && children.length >= 2 && children.some((child) => ['header', 'nav', 'footer'].includes(child.tagName ?? ''));
    });
  const parent = dominantShell && elementChildren(dominantShell).length > 0 ? dominantShell : body;
  const fragment = parseFragment('<main></main>') as unknown as HtmlNode;
  const main = fragment.childNodes?.find((node) => node.tagName === 'main');
  if (!main) return 0;
  const candidates = (parent.childNodes ?? []).filter((node) => {
    if (node.nodeName === '#text') return Boolean(node.value?.trim());
    if (!node.tagName) return false;
    return !excluded.has(node.tagName) && !isDecoration(node);
  });
  if (candidates.length === 0) {
    appendHtml(main, '<section class="dc-role-page"><h1>{{BUSINESS_NAME}}</h1><p>Ask about current services and availability.</p></section>');
    main.parentNode = parent;
    parent.childNodes ??= [];
    parent.childNodes.push(main);
    return 1;
  }

  if (candidates.length === 1 && candidates[0]!.tagName && !['html', 'body'].includes(candidates[0]!.tagName!)) {
    const candidate = candidates[0]!;
    candidate.tagName = 'main';
    candidate.nodeName = 'main';
    removeAttr(candidate, 'role');
    return 1;
  }

  const selected = new Set(candidates);
  const rebuilt: HtmlNode[] = [];
  main.childNodes = [];
  main.parentNode = parent;
  let inserted = false;
  for (const child of parent.childNodes ?? []) {
    if (!selected.has(child)) {
      rebuilt.push(child);
      continue;
    }
    if (!inserted) {
      rebuilt.push(main);
      inserted = true;
    }
    child.parentNode = main;
    main.childNodes.push(child);
  }
  parent.childNodes = rebuilt;
  return 1;
}

function ensureHeading(document: HtmlNode, file: string): number {
  if (findElement(document, 'h1') || findElement(document, 'h2') || findElement(document, 'h3')
    || findElement(document, 'h4') || findElement(document, 'h5') || findElement(document, 'h6')) return 0;
  const main = findElement(document, 'main') ?? findElement(document, 'body') ?? document;
  const stem = file.split('/').pop()?.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim() ?? '';
  const label = /^(?:index|home)$/i.test(stem) || !stem
    ? '{{BUSINESS_NAME}}'
    : `${stem.replace(/\b\w/g, (character) => character.toUpperCase())} — {{BUSINESS_NAME}}`;
  const fragment = parseFragment(`<h1 class="dc-repaired-heading">${label}</h1>`) as unknown as HtmlNode;
  const heading = fragment.childNodes?.find((node) => node.tagName === 'h1');
  if (!heading) return 0;
  heading.parentNode = main;
  main.childNodes ??= [];
  main.childNodes.unshift(heading);
  return 1;
}

function relocateOrphanDecorativeOverlays(document: HtmlNode): number {
  const body = findElement(document, 'body');
  if (!body?.childNodes?.length) return 0;
  let count = 0;
  for (const overlay of [...body.childNodes]) {
    if (overlay.tagName !== 'svg' || getAttr(overlay, 'aria-hidden') !== 'true') continue;
    const overlayClasses = (getAttr(overlay, 'class') ?? '').split(/\s+/).filter(Boolean);
    const semanticTokens = new Set(overlayClasses.flatMap((className) => [
      className,
      className.replace(/-(?:svg|overlay|decoration|background|bg)$/i, ''),
    ]).filter((value) => value.length >= 4));
    if (semanticTokens.size === 0) continue;
    const overlayIndex = body.childNodes.indexOf(overlay);
    const container = body.childNodes
      .slice(0, overlayIndex)
      .reverse()
      .find((candidate) => {
        if (!candidate.tagName || !['section', 'div', 'main', 'header'].includes(candidate.tagName)) return false;
        const containerClasses = new Set((getAttr(candidate, 'class') ?? '').split(/\s+/).filter(Boolean));
        return [...semanticTokens].some((token) => containerClasses.has(token));
      });
    if (!container) continue;
    body.childNodes.splice(overlayIndex, 1);
    container.childNodes ??= [];
    overlay.parentNode = container;
    container.childNodes.push(overlay);
    count += 1;
  }
  return count;
}

function neutralizeSensitiveFormMarker(value: string): string {
  return value.replace(new RegExp(SENSITIVE_FORM.source, 'gi'), 'contact');
}

function replaceSensitiveFormContents(node: HtmlNode): { changedWrapper: boolean; renamedId?: readonly [string, string] } {
  const fragment = parseFragment(STANDARD_FORM) as unknown as HtmlNode;
  const standard = fragment.childNodes?.find((candidate) => candidate.tagName === 'form');
  if (!standard) return { changedWrapper: false };
  const preserved = new Map((node.attrs ?? [])
    .filter((attr) => ['class', 'id', 'style', 'aria-label', 'aria-labelledby'].includes(attr.name))
    .map((attr) => [attr.name, attr.value]));
  const originalId = preserved.get('id');
  let changedWrapper = false;
  node.attrs = [...(standard.attrs ?? []).map((attr) => ({ ...attr }))];
  for (const [name, value] of preserved) {
    if (name === 'aria-labelledby' && SENSITIVE_FORM.test(value)) {
      setAttr(node, 'aria-label', 'Contact form');
      changedWrapper = true;
      continue;
    }
    const safeValue = name === 'style' ? value : neutralizeSensitiveFormMarker(value);
    if (safeValue !== value) changedWrapper = true;
    if (name === 'class') {
      const merged = new Set(`${safeValue} ${getAttr(node, 'class') ?? ''}`.split(/\s+/).filter(Boolean));
      setAttr(node, 'class', [...merged].join(' '));
    } else {
      setAttr(node, name, name === 'aria-label' && SENSITIVE_FORM.test(value) ? 'Contact form' : safeValue);
    }
  }
  node.childNodes = standard.childNodes ?? [];
  for (const child of node.childNodes) child.parentNode = node;
  const repairedId = getAttr(node, 'id');
  return {
    changedWrapper,
    ...(originalId && repairedId && originalId !== repairedId ? { renamedId: [originalId, repairedId] as const } : {}),
  };
}

function normalizeAccessibility(document: HtmlNode): number {
  let count = 0;
  const explicitLabels = new Set<string>();
  const nodesById = new Map<string, HtmlNode>();
  walk(document, (node) => {
    const id = getAttr(node, 'id');
    if (id && !nodesById.has(id)) nodesById.set(id, node);
    if (node.tagName === 'label') {
      const target = getAttr(node, 'for');
      if (target) explicitLabels.add(target);
    }
  });

  const hasLabelAncestor = (node: HtmlNode): boolean => {
    let cursor = node.parentNode;
    while (cursor) {
      if (cursor.tagName === 'label') return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  const accessibleControlName = (node: HtmlNode): string => {
    const className = getAttr(node, 'class') ?? '';
    const href = getAttr(node, 'href') ?? '';
    if (node.tagName === 'a' && (/(?:^|\s)(?:brand|logo)(?:\s|$)/i.test(className) || /(?:^|\/)index\.html?(?:[?#]|$)/i.test(href))) {
      return '{{BUSINESS_NAME}} home';
    }
    const hrefStem = href.split(/[?#]/, 1)[0]?.split('/').pop()?.replace(/\.html?$/i, '');
    const marker = getAttr(node, 'name') ?? getAttr(node, 'id') ?? hrefStem ?? '';
    const normalized = marker
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^q[-_\s]+/i, '')
      .replace(/^(?:comp(?:onent)?|control|btn|button)[-_\s]+/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim();
    if (normalized) return normalized;
    if (node.tagName === 'a' || /^link$/i.test(getAttr(node, 'role') ?? '')) return 'View information';
    if (/^(?:button|switch)$/i.test(getAttr(node, 'role') ?? '') || node.tagName === 'button') return 'Interactive control';
    return 'Form field';
  };
  const accessibleText = (node: HtmlNode, isRoot = true): string => {
    if (!isRoot && getAttr(node, 'aria-hidden') === 'true') return '';
    if (node.nodeName === '#text') return node.value ?? '';
    return (node.childNodes ?? []).map((child) => accessibleText(child, false)).join(' ');
  };
  const hasReferencedName = (node: HtmlNode): boolean => (getAttr(node, 'aria-labelledby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .some((id) => {
      const target = nodesById.get(id);
      return Boolean(target && (accessibleText(target).trim() || getAttr(target, 'aria-label')?.trim() || getAttr(target, 'title')?.trim()));
    });
  const hasAccessibleName = (node: HtmlNode): boolean => Boolean(
    getAttr(node, 'aria-label')?.trim()
    || getAttr(node, 'title')?.trim()
    || hasReferencedName(node)
    || accessibleText(node).trim(),
  );
  const isPotentiallyFocusable = (node: HtmlNode): boolean => {
    if (!node.tagName || getAttr(node, 'disabled') !== undefined || getAttr(node, 'hidden') !== undefined) return false;
    const tabindex = getAttr(node, 'tabindex');
    if (tabindex !== undefined && Number.parseInt(tabindex, 10) >= 0) return true;
    if (getAttr(node, 'contenteditable') !== undefined && !/^false$/i.test(getAttr(node, 'contenteditable') ?? '')) return true;
    if ((node.tagName === 'a' || node.tagName === 'area') && getAttr(node, 'href') !== undefined) return true;
    if (['button', 'select', 'textarea', 'summary'].includes(node.tagName)) return true;
    if (node.tagName === 'input' && !/^hidden$/i.test(getAttr(node, 'type') ?? 'text')) return true;
    return (node.tagName === 'audio' || node.tagName === 'video') && getAttr(node, 'controls') !== undefined;
  };
  const containsFocusable = (node: HtmlNode): boolean => {
    if (isPotentiallyFocusable(node)) return true;
    return (node.childNodes ?? []).some(containsFocusable);
  };
  const stripRoleState = (node: HtmlNode): void => {
    for (const attribute of [
      'aria-checked', 'aria-colindex', 'aria-colspan', 'aria-level', 'aria-posinset',
      'aria-rowindex', 'aria-rowspan', 'aria-selected', 'aria-setsize', 'aria-sort',
    ]) removeAttr(node, attribute);
  };
  const stripDescendantRoles = (root: HtmlNode, roles: ReadonlySet<string>): void => {
    for (const child of root.childNodes ?? []) {
      const role = (getAttr(child, 'role') ?? '').trim().toLowerCase();
      if (roles.has(role)) {
        removeAttr(child, 'role');
        stripRoleState(child);
        setAttr(child, 'data-dc-repaired-semantics', role);
        count += 1;
      }
      stripDescendantRoles(child, roles);
    }
  };
  const demoteListDescendants = (root: HtmlNode): void => {
    for (const child of root.childNodes ?? []) {
      const role = (getAttr(child, 'role') ?? '').trim().toLowerCase();
      // A nested list remains a complete accessibility context of its own.
      if (child.tagName === 'ul' || child.tagName === 'ol' || role === 'list') continue;
      let changed = false;
      if (child.tagName === 'li') {
        child.tagName = 'div';
        child.nodeName = 'div';
        changed = true;
      }
      if (role === 'listitem') {
        removeAttr(child, 'role');
        stripRoleState(child);
        changed = true;
      }
      if (changed) {
        setAttr(child, 'data-dc-repaired-semantics', 'listitem');
        count += 1;
      }
      demoteListDescendants(child);
    }
  };
  const compositeChildren: Readonly<Record<string, ReadonlySet<string>>> = {
    tablist: new Set(['tab']),
    listbox: new Set(['option']),
    menu: new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio']),
    menubar: new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio']),
    tree: new Set(['treeitem']),
    grid: new Set(['row', 'rowgroup', 'gridcell', 'columnheader', 'rowheader']),
    treegrid: new Set(['row', 'rowgroup', 'gridcell', 'columnheader', 'rowheader', 'treeitem']),
  };

  walk(document, (node) => {
    if (!node.tagName) return;
    const ariaHidden = getAttr(node, 'aria-hidden');
    if (ariaHidden !== undefined && !/^(?:true|false)$/i.test(ariaHidden)) {
      removeAttr(node, 'aria-hidden');
      count += 1;
    } else if (/^true$/i.test(ariaHidden ?? '') && containsFocusable(node)) {
      // A focusable descendant must not be hidden only from assistive
      // technology. Scripts that managed legacy carousel/modal state are gone,
      // so exposing the still-interactive content is the least destructive fix.
      removeAttr(node, 'aria-hidden');
      count += 1;
    }
    if (node.tagName === 'ul' || node.tagName === 'ol') {
      const invalidChild = (node.childNodes ?? []).some((child) => {
        if (child.nodeName === '#text') return Boolean(child.value?.trim());
        return Boolean(child.tagName && !['li', 'script', 'template'].includes(child.tagName));
      });
      if (invalidChild) {
        // A legacy script often populated an empty list at runtime. Scripts are
        // intentionally removed, so a surviving loading label or arbitrary
        // direct child must not retain native list semantics it cannot satisfy.
        node.tagName = 'div';
        node.nodeName = 'div';
        setAttr(node, 'data-dc-repaired-semantics', 'list');
        count += 1;
        demoteListDescendants(node);
      }
    }
    if (node.tagName === 'dl') {
      const elementChildren = (node.childNodes ?? []).filter((child) => Boolean(child.tagName));
      const validGroup = (child: HtmlNode): boolean => child.tagName === 'div'
        && (child.childNodes ?? []).filter((nested) => Boolean(nested.tagName))
          .every((nested) => nested.tagName === 'dt' || nested.tagName === 'dd');
      const valid = elementChildren.every((child) => ['dt', 'dd', 'script', 'template'].includes(child.tagName ?? '') || validGroup(child));
      if (!valid) {
        node.tagName = 'div';
        node.nodeName = 'div';
        setAttr(node, 'data-dc-repaired-semantics', 'definition-list');
        count += 1;
      }
    }

    const nodeRole = (getAttr(node, 'role') ?? '').trim().toLowerCase();
    const requiredChildren = compositeChildren[nodeRole];
    if (requiredChildren) {
      // Legacy scripts are removed, so composite widget roles would promise
      // keyboard behavior and owned child roles that no longer exist.
      removeAttr(node, 'role');
      for (const attribute of ['aria-activedescendant', 'aria-multiselectable', 'aria-orientation', 'aria-readonly']) removeAttr(node, attribute);
      stripDescendantRoles(node, requiredChildren);
      count += 1;
    }
    if (nodeRole === 'tab') {
      // The corresponding tablist behavior lived in the removed template
      // script. Preserve the visible control as ordinary content/button UI,
      // but remove the now-false composite-widget promise.
      removeAttr(node, 'role');
      removeAttr(node, 'aria-selected');
      setAttr(node, 'data-dc-repaired-semantics', 'tab');
      count += 1;
    }
    if (nodeRole === 'list') {
      const invalidChild = (node.childNodes ?? []).some((child) => {
        if (child.nodeName === '#text') return Boolean(child.value?.trim());
        if (!child.tagName || ['script', 'template'].includes(child.tagName)) return false;
        return child.tagName !== 'li' && !/^listitem$/i.test(getAttr(child, 'role') ?? '');
      });
      if (invalidChild) {
        removeAttr(node, 'role');
        setAttr(node, 'data-dc-repaired-semantics', 'aria-list');
        count += 1;
        demoteListDescendants(node);
      }
    }
    if (/^(?:dialog|alertdialog)$/i.test(getAttr(node, 'role') ?? '')
      && !getAttr(node, 'aria-label') && !getAttr(node, 'aria-labelledby') && !getAttr(node, 'title')) {
      setAttr(node, 'aria-label', 'Information');
      count += 1;
    }

    const role = (getAttr(node, 'role') ?? '').trim().toLowerCase();
    const nativeCommand = node.tagName === 'button'
      || (node.tagName === 'a' && getAttr(node, 'href') !== undefined)
      || (node.tagName === 'input' && /^(?:button|submit|reset|image)$/i.test(getAttr(node, 'type') ?? 'text'));
    const ariaCommand = /^(?:button|checkbox|link|menuitem|menuitemcheckbox|menuitemradio|radio|switch)$/i.test(role);
    if ((nativeCommand || ariaCommand) && !hasAccessibleName(node)) {
      setAttr(node, 'aria-label', accessibleControlName(node));
      count += 1;
    }

    if (!['input', 'select', 'textarea'].includes(node.tagName)) return;
    if (node.tagName === 'input' && /^(?:hidden|submit|reset|button|image)$/i.test(getAttr(node, 'type') ?? 'text')) return;
    const id = getAttr(node, 'id');
    const named = Boolean(getAttr(node, 'aria-label') || getAttr(node, 'aria-labelledby') || getAttr(node, 'title')
      || (id && explicitLabels.has(id)) || hasLabelAncestor(node));
    if (!named) {
      setAttr(node, 'aria-label', accessibleControlName(node));
      count += 1;
    }
  });
  return count;
}

function resolveInternalHref(href: string, pageNames: readonly string[]): string | undefined {
  if (!href || href.startsWith('#') || /^(?:mailto:|tel:|\{\{)/i.test(href)) return href;
  if (href === '/' || href === './' || href === '') return pageNames.find((page) => /(?:^|\/)index\.html?$/i.test(page)) ?? 'index.html';
  const [rawPath, suffix = ''] = href.split(/(?=[?#])/u, 2);
  if (!rawPath || /^(?:https?:|data:)/i.test(rawPath)) return undefined;
  let target = rawPath.replace(/^\.\//, '').replace(/^\//, '').replace(/\\/g, '/');
  if (!/\.[a-z0-9]+$/i.test(target)) target += '.html';
  const direct = pageNames.find((page) => page.toLowerCase() === target.toLowerCase())
    ?? pageNames.find((page) => page.split('/').pop()?.toLowerCase() === target.split('/').pop()?.toLowerCase());
  if (direct) return `${direct}${suffix}`;

  const stem = target.split('/').pop()?.replace(/\.html?$/i, '') ?? '';
  const patterns: Array<[RegExp, RegExp]> = [
    [/book|schedule|appointment|consult/i, /book|schedule|appointment|consult/i],
    [/contact|connect|inquir/i, /contact|connect|inquir/i],
    [/service|offering|program|treatment/i, /service|offering|program|treatment/i],
    [/about|team|story|bio/i, /about|team|story|bio/i],
    [/price|rate|fee|invest/i, /price|rate|fee|invest/i],
    [/faq|question/i, /faq|question/i],
  ];
  const role = patterns.find(([source]) => source.test(stem));
  if (!role) return undefined;
  const replacement = pageNames.find((page) => role[1].test(page));
  return replacement ? `${replacement}${suffix}` : undefined;
}

type StaticCombinator = ' ' | '>' | '+' | '~';

interface StaticAttributeSelector {
  name: string;
  operator?: '=' | '~=' | '|=' | '^=' | '$=' | '*=';
  value?: string;
  insensitive: boolean;
}

interface StaticCompoundSelector {
  tag?: string;
  ids: string[];
  classes: string[];
  attributes: StaticAttributeSelector[];
}

interface StaticSelector {
  compounds: StaticCompoundSelector[];
  combinators: StaticCombinator[];
}

function splitSelectorList(selector: string): string[] | undefined {
  const result: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]!;
    if (quote) {
      if (char === quote && selector[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth -= 1;
    else if (char === '(') parenthesisDepth += 1;
    else if (char === ')') parenthesisDepth -= 1;
    else if (char === ',' && bracketDepth === 0 && parenthesisDepth === 0) {
      const value = selector.slice(start, index).trim();
      if (!value) return undefined;
      result.push(value);
      start = index + 1;
    }
    if (bracketDepth < 0 || parenthesisDepth < 0) return undefined;
  }
  if (quote || bracketDepth !== 0 || parenthesisDepth !== 0) return undefined;
  const final = selector.slice(start).trim();
  if (!final) return undefined;
  result.push(final);
  return result;
}

function selectorTokens(selector: string): { compounds: string[]; combinators: StaticCombinator[] } | undefined {
  const compounds: string[] = [];
  const combinators: StaticCombinator[] = [];
  let buffer = '';
  let bracketDepth = 0;
  let quote = '';
  let pendingDescendant = false;
  const flush = (): boolean => {
    const value = buffer.trim();
    buffer = '';
    if (!value) return false;
    compounds.push(value);
    return true;
  };

  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]!;
    if (quote) {
      buffer += char;
      if (char === quote && selector[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      buffer += char;
      continue;
    }
    if (char === ']') {
      bracketDepth -= 1;
      if (bracketDepth < 0) return undefined;
      buffer += char;
      continue;
    }
    if (bracketDepth > 0) {
      buffer += char;
      continue;
    }
    // Dynamic states and pseudo-elements do not identify a clickable DOM box
    // with sufficiently stable semantics for this compiler contract.
    if (char === ':' || char === '\\' || char === ',') return undefined;
    if (/\s/.test(char)) {
      if (buffer.trim()) flush();
      if (compounds.length === combinators.length + 1) pendingDescendant = true;
      continue;
    }
    if (char === '>' || char === '+' || char === '~') {
      if (buffer.trim()) flush();
      if (compounds.length !== combinators.length + 1) return undefined;
      combinators.push(char);
      pendingDescendant = false;
      continue;
    }
    if (pendingDescendant) {
      if (compounds.length !== combinators.length + 1) return undefined;
      combinators.push(' ');
      pendingDescendant = false;
    }
    buffer += char;
  }
  if (quote || bracketDepth !== 0) return undefined;
  if (buffer.trim()) flush();
  if (compounds.length === 0 || combinators.length !== compounds.length - 1) return undefined;
  return { compounds, combinators };
}

function readSelectorIdentifier(value: string, offset: number): { value: string; end: number } | undefined {
  const match = value.slice(offset).match(/^[-_A-Za-z][-_A-Za-z0-9]*/);
  return match ? { value: match[0], end: offset + match[0].length } : undefined;
}

function parseAttributeSelector(value: string): StaticAttributeSelector | undefined {
  const match = value.match(
    /^\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\s*(?:(~=|\|=|\^=|\$=|\*=|=)\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=]+))\s*([iIsS])?)?\s*$/,
  );
  if (!match) return undefined;
  const operator = match[2] as StaticAttributeSelector['operator'] | undefined;
  const attribute: StaticAttributeSelector = {
    name: match[1]!.toLowerCase(),
    insensitive: match[6]?.toLowerCase() === 'i',
  };
  if (operator) {
    attribute.operator = operator;
    attribute.value = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attribute;
}

function parseCompoundSelector(value: string): StaticCompoundSelector | undefined {
  let offset = 0;
  let universal = false;
  const result: StaticCompoundSelector = { ids: [], classes: [], attributes: [] };
  if (value[offset] === '*') {
    universal = true;
    offset += 1;
  }
  else {
    const tag = readSelectorIdentifier(value, offset);
    if (tag) {
      result.tag = tag.value.toLowerCase();
      offset = tag.end;
    }
  }

  while (offset < value.length) {
    const marker = value[offset]!;
    if (marker === '#' || marker === '.') {
      const identifier = readSelectorIdentifier(value, offset + 1);
      if (!identifier) return undefined;
      (marker === '#' ? result.ids : result.classes).push(identifier.value);
      offset = identifier.end;
      continue;
    }
    if (marker === '[') {
      let end = offset + 1;
      let quote = '';
      for (; end < value.length; end += 1) {
        const char = value[end]!;
        if (quote) {
          if (char === quote && value[end - 1] !== '\\') quote = '';
        } else if (char === '"' || char === "'") quote = char;
        else if (char === ']') break;
      }
      if (end >= value.length || quote) return undefined;
      const attribute = parseAttributeSelector(value.slice(offset + 1, end));
      if (!attribute) return undefined;
      result.attributes.push(attribute);
      offset = end + 1;
      continue;
    }
    return undefined;
  }
  return universal || result.tag || result.ids.length || result.classes.length || result.attributes.length ? result : undefined;
}

function parseStaticSelector(selector: string): StaticSelector | undefined {
  const tokens = selectorTokens(selector.trim());
  if (!tokens) return undefined;
  const compounds = tokens.compounds.map(parseCompoundSelector);
  if (compounds.some((compound) => !compound)) return undefined;
  return { compounds: compounds as StaticCompoundSelector[], combinators: tokens.combinators };
}

function attributeMatches(actual: string | undefined, selector: StaticAttributeSelector): boolean {
  if (actual === undefined) return false;
  if (!selector.operator) return true;
  const expected = selector.value ?? '';
  const left = selector.insensitive ? actual.toLowerCase() : actual;
  const right = selector.insensitive ? expected.toLowerCase() : expected;
  if (selector.operator === '=') return left === right;
  if (selector.operator === '~=') return left.split(/\s+/).includes(right);
  if (selector.operator === '|=') return left === right || left.startsWith(`${right}-`);
  if (selector.operator === '^=') return left.startsWith(right);
  if (selector.operator === '$=') return left.endsWith(right);
  return left.includes(right);
}

function compoundMatches(node: HtmlNode, selector: StaticCompoundSelector): boolean {
  if (!node.tagName || (selector.tag && node.tagName !== selector.tag)) return false;
  const nodeId = getAttr(node, 'id');
  if (selector.ids.some((id) => id !== nodeId)) return false;
  const classes = new Set((getAttr(node, 'class') ?? '').split(/\s+/).filter(Boolean));
  if (selector.classes.some((className) => !classes.has(className))) return false;
  return selector.attributes.every((attribute) => attributeMatches(getAttr(node, attribute.name), attribute));
}

function previousElementSiblings(node: HtmlNode): HtmlNode[] {
  const siblings = node.parentNode?.childNodes ?? [];
  const index = siblings.indexOf(node);
  return index < 1 ? [] : siblings.slice(0, index).filter((candidate) => Boolean(candidate.tagName));
}

function staticSelectorMatches(node: HtmlNode, selector: StaticSelector, index = selector.compounds.length - 1): boolean {
  if (!compoundMatches(node, selector.compounds[index]!)) return false;
  if (index === 0) return true;
  const combinator = selector.combinators[index - 1]!;
  if (combinator === '>') {
    return Boolean(node.parentNode?.tagName && staticSelectorMatches(node.parentNode, selector, index - 1));
  }
  if (combinator === '+') {
    const siblings = previousElementSiblings(node);
    const previous = siblings[siblings.length - 1];
    return Boolean(previous && staticSelectorMatches(previous, selector, index - 1));
  }
  if (combinator === '~') {
    return previousElementSiblings(node).some((previous) => staticSelectorMatches(previous, selector, index - 1));
  }
  let ancestor = node.parentNode;
  while (ancestor) {
    if (ancestor.tagName && staticSelectorMatches(ancestor, selector, index - 1)) return true;
    ancestor = ancestor.parentNode;
  }
  return false;
}

/** Resolve a deliberately static CSS subset, returning undefined when unsafe or unsupported. */
export function resolveStaticSelectorTargets(document: HtmlNode, selector: string): HtmlNode[] | undefined {
  const parsed = parseStaticSelector(selector);
  if (!parsed) return undefined;
  const targets: HtmlNode[] = [];
  walk(document, (node) => {
    if (node.tagName && staticSelectorMatches(node, parsed)) targets.push(node);
  });
  return targets;
}

export function cssBackgroundSlotId(stylesheet: string, imageIndex: number): string {
  return `css_${sha256(`${stylesheet}:background-image:${imageIndex}`).slice(0, 18)}`;
}

export function inlineStylesheetPath(page: string, styleIndex: number): string {
  const directory = page.includes('/') ? page.slice(0, page.lastIndexOf('/') + 1) : '';
  return `${directory}.dc-inline-${sha256(`${page}:${styleIndex}`).slice(0, 16)}.css`;
}

function fieldDefaultMap(fields: readonly CanonicalField[]): Map<string, string> {
  return new Map(fields.filter((field) => concreteDefault(field.default)).map((field) => [field.name, field.default!]));
}

function outsideMustache(value: string, transform: (segment: string) => string): string {
  return value
    .split(/(\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\})/g)
    .map((segment, index) => index % 2 === 1 ? segment : transform(segment))
    .join('');
}

function replaceLiteralWithToken(segment: string, literal: string, token: string): string {
  const startsWithWord = /^[A-Za-z0-9]/.test(literal);
  const endsWithWord = /[A-Za-z0-9]$/.test(literal);
  const pattern = `${startsWithWord ? '(?<![A-Za-z0-9])' : ''}${escapeRegExp(literal)}${endsWithWord ? '(?![A-Za-z0-9])' : ''}`;
  return segment.replace(new RegExp(pattern, 'gi'), token);
}

function restoreKnownLiterals(document: HtmlNode, fields: readonly CanonicalField[], file: string): Transformation[] {
  const defaults = fieldDefaultMap(fields);
  const replacements = new Map<string, string>();
  for (const [name, value] of defaults) {
    const canonical = normalizeFieldName(name);
    const safelySpecific = /EMAIL|PHONE/.test(canonical) || value.length >= 5;
    if (isCorePersonalizationToken(canonical) && safelySpecific) replacements.set(value, `{{${canonical}}}`);
  }
  let count = 0;
  const replaceKnownPlaceholders = (segment: string): string => segment
    .replace(/\bDr\.\s+Morgan\s+Ellis\b/gi, '{{PRACTITIONER_NAME}}')
    .replace(/\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/gi, '{{BUSINESS_NAME}}')
    .replace(/\bYour\s+City\b/gi, '{{CITY}}')
    .replace(/\bYour\s+State\b/gi, '{{STATE}}');
  walk(document, (node) => {
    if (node.nodeName === '#text' && typeof node.value === 'string') {
      let parent = node.parentNode;
      while (parent) {
        if (NON_CONTENT_TEXT_ANCESTORS.has(parent.tagName ?? '')) return;
        parent = parent.parentNode;
      }
      let value = outsideMustache(node.value, (segment) => replaceKnownPlaceholders(segment).replace(EMAIL, '{{EMAIL}}').replace(PHONE, '{{PHONE}}'));
      for (const [literal, token] of replacements) value = outsideMustache(value, (segment) => {
        const next = replaceLiteralWithToken(segment, literal, token);
        if (next !== segment) count += 1;
        return next;
      });
      if (value !== node.value) count += 1;
      node.value = value;
    }
    if (!node.attrs) return;
    for (const attr of node.attrs) {
      const attributeName = attr.name.toLowerCase();
      if (!['action', 'alt', 'aria-label', 'content', 'href', 'placeholder', 'title', 'value'].includes(attributeName)
        && !attributeName.startsWith('data-')) continue;
      let value = outsideMustache(attr.value, (segment) => replaceKnownPlaceholders(segment).replace(EMAIL, '{{EMAIL}}').replace(PHONE, '{{PHONE}}'));
      const ctaish = /(?:btn|button|cta|book|schedule)/i.test(`${getAttr(node, 'class') ?? ''} ${textContent(node)}`);
      for (const [literal, token] of replacements) {
        if ((token === '{{PRIMARY_CTA_URL}}' || token === '{{BOOKING_URL}}') && !ctaish) continue;
        value = outsideMustache(value, (segment) => replaceLiteralWithToken(segment, literal, token));
      }
      if (value !== attr.value) count += 1;
      attr.value = value;
    }
  });
  return count ? [{ rule: 'restore-personalization-tokens', file, count }] : [];
}

function canonicalFieldsForTokens(tokens: readonly string[], sourceFields: readonly CanonicalField[]): CanonicalField[] {
  const byName = new Map(sourceFields.map((field) => [field.name, field]));
  return [...new Set(tokens)].sort().map((name): CanonicalField => {
    const source = byName.get(name);
    const output: CanonicalField = {
      name,
      label: source?.label ?? name.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      type: source?.type ?? (/EMAIL/.test(name) ? 'email' : /PHONE/.test(name) ? 'tel' : /URL|WEBSITE/.test(name) ? 'url' : 'text'),
    };
    // Identity/contact defaults are intentionally not carried into published presets.
    if (!/BUSINESS|PRACTICE|BRAND|STUDIO|PRACTITIONER|OWNER|COACH|FACILITATOR|EMAIL|PHONE|BOOKING_URL|PRIMARY_CTA_URL|WEBSITE/.test(name)) {
      const value = source?.default;
      if (concreteDefault(value)) output.default = value;
      else if (name === 'CITY') output.default = 'City';
      else if (name === 'STATE') output.default = 'State';
      else if (name === 'ADDRESS' || name === 'STREET_ADDRESS') output.default = 'Address available on request';
    }
    return output;
  });
}

function addRequiredPersonalization(document: HtmlNode, file: string): Transformation[] {
  const current = serialize(document as never);
  const tokens = extractTemplateTokens(current);
  const identity = new Set(['BUSINESS_NAME', 'PRACTICE_NAME', 'BRAND_NAME', 'STUDIO_NAME', 'PRACTITIONER_NAME', 'OWNER_NAME', 'COACH_NAME', 'FACILITATOR_NAME']);
  const contact = new Set(['EMAIL', 'CONTACT_EMAIL', 'PHONE', 'PHONE_NUMBER', 'CONTACT_PHONE', 'PRIMARY_CTA_URL', 'BOOKING_URL', 'WEBSITE']);
  const needsIdentity = !tokens.some((token) => identity.has(token));
  const needsContact = !tokens.some((token) => contact.has(token));
  if (!needsIdentity && !needsContact) return [];
  const body = findElement(document, 'body') ?? document;
  const parts = ['<footer class="dc-template-contact" data-dc-repaired-contact="true">'];
  if (needsIdentity) parts.push('<p class="dc-template-identity">{{BUSINESS_NAME}}</p>');
  if (needsContact) parts.push('<p><a href="mailto:{{EMAIL}}">Contact {{BUSINESS_NAME}}</a></p>');
  parts.push('</footer>');
  appendHtml(body, parts.join(''));
  return [{ rule: 'add-required-personalization', file, count: Number(needsIdentity) + Number(needsContact) }];
}

function sanitizeProofVocabulary(document: HtmlNode, pageNames: readonly string[]): number {
  let count = 0;
  const renamedIds = new Map<string, string>();
  const fallbackPage = pageNames.find((page) => /about|service|offering|program/i.test(page))
    ?? pageNames.find((page) => /index\.html?$/i.test(page))
    ?? '#';
  walk(document, (node) => {
    if (node.nodeName === '#text' && typeof node.value === 'string') {
      const next = node.value
        .replace(/\btestimonials?\b/gi, 'practice information')
        .replace(/\b(?:client|patient) (?:success )?stor(?:y|ies)\b/gi, 'service information')
        .replace(/\bwhat (?:our )?(?:clients?|patients?) (?:say|share)\b/gi, 'what to expect')
        .replace(/\bvoices? from (?:the )?(?:cohort|community|clients?)\b/gi, 'practice perspectives');
      if (next !== node.value) count += 1;
      node.value = next;
    }
    for (const attr of node.attrs ?? []) {
      let next = attr.value;
      if (attr.name === 'class' || attr.name === 'id' || attr.name.startsWith('data-')) {
        next = next.replace(/(?:testimonial|review|quote|social[-_]?proof|success[-_]?stor(?:y|ies))s?/gi, 'dc-guidance');
      } else if ((attr.name === 'href' || attr.name === 'action') && /testimonial|review|success[-_]?stor/i.test(next)) {
        next = fallbackPage;
      } else if (attr.name === 'content' || attr.name === 'title' || attr.name === 'aria-label' || attr.name === 'alt') {
        next = next
          .replace(/\btestimonials?\b/gi, 'practice information')
          .replace(/\b(?:client|patient) (?:success )?stor(?:y|ies)\b/gi, 'service information')
          .replace(/\bwhat (?:our )?(?:clients?|patients?) (?:say|share)\b/gi, 'what to expect')
          .replace(/\bvoices? from (?:the )?(?:cohort|community|clients?)\b/gi, 'practice perspectives');
      }
      if (next !== attr.value) {
        if (attr.name === 'id') renamedIds.set(attr.value, next);
        count += 1;
      }
      attr.value = next;
    }
  });

  const idReferenceAttributes = new Set(['aria-labelledby', 'aria-describedby', 'aria-controls', 'headers', 'for', 'list']);
  const existingIds = new Set<string>();
  walk(document, (node) => {
    const id = getAttr(node, 'id');
    if (id) existingIds.add(id);
  });
  walk(document, (node) => {
    const nextAttrs: Attr[] = [];
    for (const attr of node.attrs ?? []) {
      if (!idReferenceAttributes.has(attr.name)) {
        nextAttrs.push(attr);
        continue;
      }
      const next = attr.value
        .split(/\s+/)
        .map((id) => renamedIds.get(id) ?? id)
        .filter((id) => existingIds.has(id))
        .join(' ');
      if (next !== attr.value) count += 1;
      if (next) nextAttrs.push({ ...attr, value: next });
    }
    node.attrs = nextAttrs;
  });
  return count;
}

function annotateEditableNodes(
  document: HtmlNode,
  file: string,
): { editIds: string[]; imageIds: string[] } {
  const editIds: string[] = [];
  const imageIds: string[] = [];

  const mark = (node: HtmlNode, kind: 'edit' | 'image'): string => {
    const id = `${kind === 'edit' ? 'txt' : 'img'}_${sha256(`${file}:${structuralPath(node)}:${kind}`).slice(0, 18)}`;
    setAttr(node, kind === 'edit' ? 'data-dc-edit-id' : 'data-dc-image-id', id);
    return id;
  };

  const visit = (node: HtmlNode, editableAncestor: boolean): void => {
    if (!node.tagName) {
      for (const child of node.childNodes ?? []) visit(child, editableAncestor);
      return;
    }
    const hidden = getAttr(node, 'aria-hidden') === 'true' || NON_EDITABLE_ELEMENTS.has(node.tagName);
    const text = textContent(node).replace(/\s+/g, ' ').trim();
    const directText = (node.childNodes ?? []).some((child) => child.nodeName === '#text' && Boolean(child.value?.trim()));
    const shouldEdit = !hidden && !editableAncestor && Boolean(text) && (
      TEXT_TAGS.has(node.tagName) || (FALLBACK_TEXT_TAGS.has(node.tagName) && directText)
    );
    // Attribute content is independent from ancestor inner HTML. Keep useful
    // alt/label/title metadata editable even when an enclosing link or figure
    // already owns the visible-text slot.
    const editableAttribute = !shouldEdit
      ? node.tagName === 'meta' && getAttr(node, 'content')?.trim()
        ? 'content'
        : node.tagName === 'img' && getAttr(node, 'alt')?.trim()
          ? 'alt'
          : getAttr(node, 'aria-label')?.trim()
            ? 'aria-label'
            : getAttr(node, 'title')?.trim()
              ? 'title'
              : ['input', 'textarea'].includes(node.tagName) && getAttr(node, 'placeholder')?.trim()
                ? 'placeholder'
                : undefined
      : undefined;
    if (shouldEdit || editableAttribute) {
      editIds.push(mark(node, 'edit'));
      if (editableAttribute) setAttr(node, 'data-dc-edit-attribute', editableAttribute);
      else removeAttr(node, 'data-dc-edit-attribute');
    }

    const inlineBackground = /background(?:-image)?\s*:[^;]*url\(/i.test(getAttr(node, 'style') ?? '');
    if (node.tagName === 'img' || node.tagName === 'source' || inlineBackground) {
      imageIds.push(mark(node, 'image'));
    }
    for (const child of node.childNodes ?? []) visit(child, editableAncestor || shouldEdit);
  };
  visit(document, false);
  return { editIds: [...new Set(editIds)].sort(), imageIds: [...new Set(imageIds)].sort() };
}

export function detectFoundation(html: string): string | undefined {
  const marker = html.match(/<!--\s*FOUNDATION:\s*([^\r\n]+?)\s*-->/i)?.[1]?.trim();
  return marker?.replace(/\s+/g, ' ');
}

export function repairStylesheet(css: string, file: string): StylesheetRepairResult {
  const issues: RepairIssue[] = [];
  const transformations: Transformation[] = [];
  const backgrounds: BackgroundSelector[] = [];
  let root;
  try {
    root = postcss.parse(css, { from: file });
  } catch (error) {
    // A small legacy cohort contains CSS serialized with literal "\\n" or
    // "\\r\\n" separators, plus one observed declaration where the intended
    // `background-color` property was accidentally prefixed with `margin:`.
    // Recover only after the original parse fails so valid author CSS remains
    // byte-stable and the mapping stays explicit and auditable.
    const escapedLinebreakCount = (css.match(/\\r\\n|\\n|\\r/g) ?? []).length;
    let malformedDeclarationCount = 0;
    const recovered = css
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\bmargin\s*:\s*background-color\s*:/gi, () => {
        malformedDeclarationCount += 1;
        return 'background-color:';
      });
    if (recovered !== css) {
      try {
        root = postcss.parse(recovered, { from: file });
        if (escapedLinebreakCount > 0) {
          transformations.push({ rule: 'recover-escaped-css-linebreaks', file, count: escapedLinebreakCount });
          issues.push({
            code: 'escaped-css-linebreaks-recovered',
            severity: 'warning',
            file,
            message: 'Recovered a stylesheet that had been serialized with escaped line-break delimiters.',
            resolved: true,
          });
        }
        if (malformedDeclarationCount > 0) {
          transformations.push({ rule: 'recover-known-malformed-css-declaration', file, count: malformedDeclarationCount });
          issues.push({
            code: 'malformed-css-declaration-recovered',
            severity: 'warning',
            file,
            message: 'Recovered a known malformed margin/background-color declaration before theme extraction.',
            resolved: true,
          });
        }
      } catch {
        // Fall through to the conservative sanitizer with the original error,
        // which is generally the most actionable parse diagnostic.
      }
    }
    if (!root) {
      const sanitized = css
        .replace(/expression\s*\([^)]*\)/gi, 'unset')
        .replace(/url\(\s*(['"]?)\s*javascript:[^)]*\)/gi, 'none');
      issues.push({ code: 'css-parse-fallback', severity: 'warning', file, message: `PostCSS could not parse the stylesheet; applied the conservative safety fallback: ${error instanceof Error ? error.message : String(error)}`, resolved: true });
      return { css: sanitized, backgrounds, issues, transformations: [{ rule: 'sanitize-malformed-css', file, count: Number(sanitized !== css) }] };
    }
  }

  let unsafe = 0;
  let backgroundImageIndex = 0;
  root.walkDecls((declaration) => {
    if (/expression\s*\(|url\(\s*(['"]?)\s*(?:javascript:|data:text\/html)/i.test(declaration.value)) {
      declaration.remove();
      unsafe += 1;
      return;
    }
    if (/^background(?:-image)?$/i.test(declaration.prop)) {
      for (const match of declaration.value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
        const source = match[2]?.trim();
        const selector = declaration.parent?.type === 'rule' ? declaration.parent.selector : undefined;
        if (source && !/^data:image/i.test(source)) {
          const slotId = cssBackgroundSlotId(file, backgroundImageIndex++);
          const individualSelectors = selector ? splitSelectorList(selector) : undefined;
          if (individualSelectors) {
            for (const individual of individualSelectors) {
              backgrounds.push({ stylesheet: file, selector: individual, source, slotId });
            }
          }
        }
      }
    }
    for (const match of declaration.value.matchAll(/url\(\s*(['"]?)(https?:\/\/.*?)\1\s*\)/gi)) {
      issues.push({ code: 'remote-asset-awaiting-vendor', severity: 'info', file, message: `Remote asset queued for content-addressed vendoring: ${match[2]}`, resolved: false });
    }
  });
  root.walkAtRules('import', (rule) => {
    if (/javascript:|data:text\/html/i.test(rule.params)) {
      rule.remove();
      unsafe += 1;
    }
  });
  if (unsafe) transformations.push({ rule: 'strip-unsafe-css', file, count: unsafe });
  return { css: root.toString(), backgrounds, issues, transformations };
}

function retainFoundationThemeOverrides(css: string): { css: string; removed: number } {
  let root;
  try {
    root = postcss.parse(css);
  } catch {
    return { css, removed: 0 };
  }
  let removed = 0;
  root.walkDecls((declaration) => {
    const themeProperty = /^(?:color|background-color|border(?:-(?:top|right|bottom|left))?-color|outline-color|text-decoration-color|fill|stroke|font(?:-.+)?)$/i.test(declaration.prop);
    const themeVariable = declaration.prop.startsWith('--') && (THEME_COLOR.test(declaration.value) || /font/i.test(declaration.prop));
    if (!themeProperty && !themeVariable) {
      declaration.remove();
      removed += 1;
    }
  });
  root.walkRules((rule) => {
    if (!rule.nodes?.length) rule.remove();
  });
  // Media/supports/container wrappers can become empty after layout removal.
  root.walkAtRules((rule) => {
    if (rule.name.toLowerCase() !== 'import' && !rule.nodes?.length) rule.remove();
  });
  return { css: root.toString(), removed };
}

export function repairPage(html: string, options: RepairPageOptions): PageRepairResult {
  const expressionResult = normalizeExpressions(html, options.fields, options.file);
  const document = parse(expressionResult.html, { sourceCodeLocationInfo: false }) as unknown as HtmlNode;
  const issues = [...expressionResult.issues];
  const transformations = [...expressionResult.transformations];
  const pageBackgrounds: BackgroundSelector[] = [];
  transformations.push(...restoreKnownLiterals(document, options.fields, options.file));

  const removals = new Set<HtmlNode>();
  const proofReplacements = new Set<HtmlNode>();
  let scripts = 0;
  let unsafeAttrs = 0;
  let unsafeElements = 0;
  let riskyProof = 0;
  let standardizedForms = 0;
  let claims = 0;
  let prices = 0;
  let linkRepairs = 0;
  let inlineStyles = 0;
  let formIndex = 0;
  let namedFormFields = 0;
  let sanitizedFormWrappers = 0;
  const sensitiveFormIdRenames = new Map<string, string>();

  walk(document, (node) => {
    if (node.tagName === 'script') {
      removals.add(node);
      scripts += 1;
      return;
    }
    if (node.tagName && REMOVED_ELEMENTS.has(node.tagName)) {
      removals.add(node);
      unsafeElements += 1;
      return;
    }
    if (node.tagName === 'meta' && /^refresh$/i.test(getAttr(node, 'http-equiv') ?? '')) {
      removals.add(node);
      unsafeElements += 1;
      return;
    }

    if (node.tagName === 'form') {
      formIndex += 1;
      const priorFormKind = getAttr(node, 'data-dc-standard-form');
      const sensitive = SENSITIVE_FORM.test(nodeMarkup(node));
      if (sensitive) {
        const replacement = replaceSensitiveFormContents(node);
        if (replacement.changedWrapper) sanitizedFormWrappers += 1;
        if (replacement.renamedId) sensitiveFormIdRenames.set(...replacement.renamedId);
        standardizedForms += 1;
      }
      if (!getAttr(node, 'name')?.trim()) setAttr(node, 'name', `legacy-form-${sha256(options.file).slice(0, 10)}-${formIndex}`);
      if (!getAttr(node, 'method')) setAttr(node, 'method', 'post');
      const contactForm = sensitive
        || priorFormKind === 'contact'
        || /(?:^|\s)dc-contact-form(?:\s|$)/.test(getAttr(node, 'class') ?? '');
      setAttr(node, 'data-dc-standard-form', contactForm ? 'contact' : 'safe');
      setAttr(node, 'data-netlify', 'true');

    }

    if (isProofContainer(node)) {
      proofReplacements.add(nearestProofContainer(node));
      riskyProof += 1;
      return;
    }

    if (node.nodeName === '#text' && typeof node.value === 'string') {
      let parent = node.parentNode;
      while (parent) {
        if (NON_CONTENT_TEXT_ANCESTORS.has(parent.tagName ?? '')) return;
        parent = parent.parentNode;
      }
      if (CLAIM_TEXT.test(node.value) || PERCENT_RESULT.test(node.value)) {
        node.value = ` ${NEUTRAL_CLAIM} `;
        claims += 1;
      }
      const replaced = node.value.replace(PRICE, 'Contact for current pricing');
      if (replaced !== node.value) prices += 1;
      node.value = replaced;
      return;
    }

    if (!node.attrs) return;
    const nextAttrs: Attr[] = [];
    for (const attr of node.attrs) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        unsafeAttrs += 1;
        continue;
      }
      if (URL_ATTRS.has(name) && /^(?:javascript:|vbscript:|data:text\/html)/i.test(attr.value.trim())) {
        unsafeAttrs += 1;
        continue;
      }
      if ((name === 'action' || name === 'formaction') && /^(?:https?:|mailto:)/i.test(attr.value.trim()) && !/\{\{/.test(attr.value)) {
        unsafeAttrs += 1;
        continue;
      }
      if (name === 'style' && /expression\s*\(|url\(\s*(['"]?)\s*(?:javascript:|data:text\/html)/i.test(attr.value)) {
        unsafeAttrs += 1;
        continue;
      }
      if (['content', 'title', 'aria-label', 'alt', 'placeholder'].includes(name)) {
        if (CLAIM_TEXT.test(attr.value) || PERCENT_RESULT.test(attr.value)) {
          attr.value = NEUTRAL_CLAIM;
          claims += 1;
        }
        const safeValue = attr.value.replace(PRICE, 'Contact for current pricing');
        if (safeValue !== attr.value) prices += 1;
        attr.value = safeValue;
      }
      nextAttrs.push(attr);
    }
    node.attrs = nextAttrs;

    if (node.tagName === 'a') {
      const href = getAttr(node, 'href');
      if (href && /^mailto:/i.test(href) && !/\{\{\s*(?:EMAIL|CONTACT_EMAIL)\s*\}\}/i.test(href)) {
        const query = href.includes('?') ? href.slice(href.indexOf('?')) : '';
        setAttr(node, 'href', `mailto:{{EMAIL}}${query}`);
        linkRepairs += 1;
      } else if (href && /^tel:/i.test(href) && !/\{\{\s*(?:PHONE|PHONE_NUMBER|CONTACT_PHONE)\s*\}\}/i.test(href)) {
        setAttr(node, 'href', 'tel:{{PHONE}}');
        linkRepairs += 1;
      } else if (href && REMOTE_URL.test(href)) {
        const ctaish = /(?:book|schedule|reserve|appointment|consult|cta|btn|button)/i.test(`${textContent(node)} ${getAttr(node, 'class') ?? ''}`);
        setAttr(node, 'href', ctaish ? '{{BOOKING_URL}}' : '{{WEBSITE}}');
        linkRepairs += 1;
      } else if (href && !SAFE_PROTOCOL.test(href) && !href.startsWith('{{')) {
        const resolved = resolveInternalHref(href, options.pageNames);
        if (resolved !== href) {
          setAttr(node, 'href', resolved ?? '#');
          linkRepairs += 1;
          if (!resolved) issues.push({ code: 'unresolved-page-reference', severity: 'warning', file: options.file, message: `Replaced missing internal target ${href} with a safe inert link.`, resolved: true });
        }
      } else if (href?.startsWith('/')) {
        const resolved = resolveInternalHref(href, options.pageNames);
        if (resolved && resolved !== href) {
          setAttr(node, 'href', resolved);
          linkRepairs += 1;
        }
      }
      if (getAttr(node, 'target') === '_blank') {
        const rel = new Set((getAttr(node, 'rel') ?? '').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        setAttr(node, 'rel', [...rel].sort().join(' '));
      }
    }

    if (node.tagName === 'img' && REMOTE_URL.test(getAttr(node, 'src') ?? '')) {
      issues.push({ code: 'remote-image-awaiting-vendor', severity: 'info', file: options.file, message: `Remote image queued for content-addressed vendoring: ${getAttr(node, 'src')}`, resolved: false });
    }

    if (node.tagName === 'style' && node.childNodes?.length) {
      const css = textContent(node);
      const foundationTheme = options.foundation && getAttr(node, 'id') === 'variation-overrides'
        ? retainFoundationThemeOverrides(css)
        : { css, removed: 0 };
      if (foundationTheme.removed) transformations.push({ rule: 'align-foundation-variation', file: options.file, count: foundationTheme.removed });
      const styleIndex = inlineStyles++;
      const repaired = repairStylesheet(foundationTheme.css, inlineStylesheetPath(options.file, styleIndex));
      replaceWithText(node, repaired.css);
      pageBackgrounds.push(...repaired.backgrounds);
      issues.push(...repaired.issues);
      transformations.push(...repaired.transformations);
    }
  });

  if (sensitiveFormIdRenames.size > 0) {
    const idReferences = new Set(['aria-controls', 'aria-describedby', 'aria-labelledby', 'for', 'form', 'headers', 'list']);
    walk(document, (node) => {
      for (const attr of node.attrs ?? []) {
        if (idReferences.has(attr.name)) {
          attr.value = attr.value.split(/\s+/).map((id) => sensitiveFormIdRenames.get(id) ?? id).join(' ');
        } else if (attr.name === 'href' && attr.value.startsWith('#')) {
          const replacement = sensitiveFormIdRenames.get(attr.value.slice(1));
          if (replacement) attr.value = `#${replacement}`;
        }
      }
    });
  }

  // Re-evaluate proof containers after text/form normalization. Several legacy
  // pages nest proof blocks in malformed markup that parse5 reparents while we
  // walk it; this post-pass makes removal deterministic on the repaired tree.
  walk(document, (node) => {
    if (isProofContainer(node)) {
      proofReplacements.add(nearestProofContainer(node));
    }
  });

  const hasSelectedDescendant = (node: HtmlNode): boolean => [...proofReplacements].some((candidate) => {
    if (candidate === node) return false;
    let cursor = candidate.parentNode;
    while (cursor) {
      if (cursor === node) return true;
      cursor = cursor.parentNode;
    }
    return false;
  });
  for (const node of proofReplacements) {
    if (!node.parentNode || hasSelectedDescendant(node)) continue;
    replaceNode(node, NEUTRAL_BLOCK);
  }
  for (const node of removals) {
    if (!node.parentNode || removals.has(node.parentNode) || proofReplacements.has(node.parentNode)) continue;
    removeNode(node);
  }
  // Netlify and ordinary form encoding omit successful controls without a
  // name. Resolve ownership after form replacement/removal so both descendant
  // controls and controls associated through HTML's `form=` attribute receive
  // stable, collision-free names in the final artifact.
  namedFormFields = nameFormControls(document);
  const decorativeOverlays = relocateOrphanDecorativeOverlays(document);
  const proofVocabulary = sanitizeProofVocabulary(document, options.pageNames);
  const mainLandmarks = ensureMainLandmark(document);
  const headings = ensureHeading(document, options.file);
  const accessibility = normalizeAccessibility(document);
  if (scripts) transformations.push({ rule: 'replace-scripts-with-audited-runtime', file: options.file, count: scripts });
  if (unsafeAttrs) transformations.push({ rule: 'strip-event-and-unsafe-url-attributes', file: options.file, count: unsafeAttrs });
  if (unsafeElements) transformations.push({ rule: 'strip-active-embedded-content', file: options.file, count: unsafeElements });
  if (riskyProof) transformations.push({ rule: 'replace-unsupported-proof', file: options.file, count: riskyProof });
  if (proofVocabulary) transformations.push({ rule: 'remove-proof-vocabulary', file: options.file, count: proofVocabulary });
  if (decorativeOverlays) transformations.push({ rule: 'relocate-orphan-decorative-overlay', file: options.file, count: decorativeOverlays });
  if (mainLandmarks) transformations.push({ rule: 'restore-main-landmark', file: options.file, count: mainLandmarks });
  if (headings) transformations.push({ rule: 'restore-page-heading', file: options.file, count: headings });
  if (accessibility) transformations.push({ rule: 'normalize-accessibility-semantics', file: options.file, count: accessibility });
  if (standardizedForms) transformations.push({ rule: 'standardize-contact-form', file: options.file, count: standardizedForms });
  if (namedFormFields) transformations.push({ rule: 'name-form-controls', file: options.file, count: namedFormFields });
  if (sanitizedFormWrappers) transformations.push({ rule: 'sanitize-sensitive-form-wrapper', file: options.file, count: sanitizedFormWrappers });
  if (claims) transformations.push({ rule: 'neutralize-outcome-claims', file: options.file, count: claims });
  if (prices) transformations.push({ rule: 'replace-fixed-price', file: options.file, count: prices, detail: 'Contact for current pricing' });
  if (linkRepairs) transformations.push({ rule: 'repair-navigation-targets', file: options.file, count: linkRepairs });

  transformations.push(...addRequiredPersonalization(document, options.file));
  const body = findElement(document, 'body') ?? document;
  appendHtml(body, `<script defer src="${COMPATIBILITY_SCRIPT_PATH}" data-dc-runtime="compatibility-v1"></script>`);

  const annotated = annotateEditableNodes(document, options.file);
  const outputHtml = serialize(document as never);
  const fields = canonicalFieldsForTokens(extractTemplateTokens(outputHtml), options.fields);

  return {
    html: outputHtml,
    fields,
    editIds: annotated.editIds,
    imageIds: annotated.imageIds,
    backgroundSelectors: pageBackgrounds,
    issues,
    transformations,
  };
}

export function supportedTokenNames(): readonly string[] {
  return CORE_PERSONALIZATION_TOKENS;
}

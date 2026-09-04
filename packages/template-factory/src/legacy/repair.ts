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
  HARD_CODED_OFFER_PRICE_RE,
  PRICE_SEMANTIC_ATTRIBUTE_RE,
  SENSITIVE_FORM_TEXT_RE,
  UNSAFE_INQUIRY_FORM_TEXT_RE,
  UNSUPPORTED_ABSOLUTE_EFFICACY_RE,
  UNSUPPORTED_CREDENTIAL_CLAIM_RE,
  UNSUPPORTED_CREDENTIAL_PROOF_RE,
  UNSUPPORTED_FABRICATED_METRIC_RE,
  UNSUPPORTED_PERCENT_RESULT_RE,
  UNSUPPORTED_PROOF_ATTRIBUTE_RE,
  UNSUPPORTED_PROOF_TEXT_RE,
  containsUnsupportedOutcomeClaim,
  cssGeneratedContentAttributeNames,
  expandCssGeneratedValue,
  extractTemplateTokens,
  findUnsafeCssGeneratedText,
  isCorePersonalizationToken,
  isUnsupportedProofHeading,
} from '../template-contract.js';
import {
  containsNonLocalCssReferences,
  containsUnsafeCssReferences,
  containsUnsafeSrcset,
  decodeCssEscapes,
  isNonLocalSvgReference,
  isUnsafeCssUrl,
  isUnsafeStaticUrl,
} from './url-safety.js';

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

export interface SvgAssetRepairResult {
  svg: string;
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
  cssContentAttributes?: readonly string[];
  siteLiteralTokens?: Readonly<Record<string, string>>;
}

const TEXT_TAGS = new Set([
  'a', 'blockquote', 'button', 'caption', 'code', 'dd', 'dt', 'figcaption', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'label', 'legend', 'li', 'option', 'p', 'pre', 'summary', 'td', 'th', 'title',
]);
const FALLBACK_TEXT_TAGS = new Set(['address', 'article', 'aside', 'b', 'div', 'em', 'footer', 'header', 'i', 'main', 'nav', 'section', 'small', 'span', 'strong', 'time', 'u']);
const NON_CONTENT_TEXT_ANCESTORS = new Set(['script', 'style', 'svg', 'template']);
const NON_EDITABLE_ELEMENTS = new Set(['script', 'style', 'svg', 'template']);
const SVG_SEMANTIC_ATTRIBUTE_NAMES = new Set([
  'alt', 'aria-description', 'aria-label', 'data-tip', 'data-title', 'data-tooltip', 'title',
]);
const REMOVED_ELEMENTS = new Set(['frame', 'frameset', 'iframe', 'object', 'embed']);
const URL_ATTRS = new Set(['action', 'formaction', 'href', 'poster', 'src', 'xlink:href']);
const SENSITIVE_FORM = SENSITIVE_FORM_TEXT_RE;
const UNSAFE_FORM_MARKER = new RegExp(`${SENSITIVE_FORM_TEXT_RE.source}|${UNSAFE_INQUIRY_FORM_TEXT_RE.source}`, 'i');
const PROOF_TEXT = UNSUPPORTED_PROOF_TEXT_RE;
const PROOF_ATTR = UNSUPPORTED_PROOF_ATTRIBUTE_RE;
const SYNTHETIC_BADGE_SIGNAL = UNSUPPORTED_CREDENTIAL_PROOF_RE;
const PERCENT_RESULT = UNSUPPORTED_PERCENT_RESULT_RE;
const PRICE = new RegExp(HARD_CODED_OFFER_PRICE_RE.source, 'gi');
const THEME_COLOR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<![\w-])(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]*|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?(?![\w-])/gi;
const CONTEXTUAL_PHONE = /\b(?:call|phone|telephone|tel|fax|text)(?:\s+(?:us|me))?\s*(?::|at)?\s*(?:\+\s*)?\(?\d[\d().\s-]{7,}\d\b/gi;
const MUSTACHE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SAFE_PROTOCOL = /^(?:https?:|mailto:|tel:|#|\/|\.\.?\/)/i;
const REMOTE_URL = /^(?:https?:)?\/\//i;

const NEUTRAL_BLOCK = '<section class="dc-neutral-guidance" data-dc-safe-replacement="neutral-guidance"><h2>A clear, practical next step</h2><p>Ask about current services, availability, and what to expect before you decide.</p></section>';
const NEUTRAL_CLAIM = 'Services and experiences vary. Ask the practice what is currently offered and what to expect.';
const NEUTRAL_PRICE = 'Contact for current pricing';
const ADDRESS_PLACEHOLDER = /^(?:(?:street )?address\s*:\s*)?(?:enter\s+)?(?:your (?:street )?address|123 Main (?:St(?:reet)?|Road|Rd\.?))\s*\.?$/i;
const STANDARD_FORM = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button><p class="dc-form-status" aria-live="polite"></p></form>';
const STRUCTURAL_PROOF_TOKEN_SOURCE = String.raw`(^|[-_\s])(testimonials?|reviews?|quotes?|social[-_]?proof|success[-_]?stor(?:y|ies)|proof(?:[-_]?gallery)?|credibility)(?=$|[-_\s])`;

function replaceStructuralProofTokens(value: string, replacement: string): string {
  return value.replace(new RegExp(STRUCTURAL_PROOF_TOKEN_SOURCE, 'gi'), `$1${replacement}`);
}

function sanitizedProofId(value: string): string {
  return replaceStructuralProofTokens(value, `dc-guidance-${sha256(value).slice(0, 10)}`);
}

function sanitizedProofStructuralValue(value: string): string {
  return replaceStructuralProofTokens(value, 'dc-guidance');
}

function sanitizedProofClass(value: string): string {
  return value.replace(
    new RegExp(STRUCTURAL_PROOF_TOKEN_SOURCE, 'gi'),
    (_match, prefix: string, token: string) => `${prefix}dc-guidance-${sha256(token.toLowerCase()).slice(0, 10)}`,
  );
}

/**
 * Keep stylesheet selectors aligned with proof-bearing IDs/classes repaired in
 * HTML. This deliberately scans only CSS selector identifiers outside quoted
 * strings and attribute selectors; declarations and customer prose are never
 * rewritten as though they were selectors.
 */
function sanitizeProofSelector(selector: string): { selector: string; count: number } {
  let output = '';
  let count = 0;
  let quote: '"' | "'" | undefined;
  let bracketDepth = 0;
  for (let index = 0; index < selector.length;) {
    const character = selector[index]!;
    if (character === '\\') {
      output += selector.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (quote) {
      output += character;
      if (character === quote) quote = undefined;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      output += character;
      index += 1;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    else if (character === ']' && bracketDepth > 0) bracketDepth -= 1;
    if (bracketDepth === 0 && (character === '#' || character === '.')) {
      const identifier = selector.slice(index + 1).match(/^[-_A-Za-z][-_A-Za-z0-9]*/)?.[0];
      // Escaped identifiers (for example `#reviews\:panel`) are not equivalent
      // to the plain HTML token `reviews`; leave the whole selector untouched
      // unless we can prove the same deterministic rewrite applies to both.
      if (identifier && selector[index + identifier.length + 1] !== '\\') {
        const next = character === '#'
          ? sanitizedProofId(identifier)
          : sanitizedProofClass(identifier);
        output += `${character}${next}`;
        if (next !== identifier) count += 1;
        index += identifier.length + 1;
        continue;
      }
    }
    output += character;
    index += 1;
  }
  return { selector: output, count };
}

function containsUnsupportedClaim(value: string): boolean {
  return containsUnsupportedOutcomeClaim(value)
    || UNSUPPORTED_ABSOLUTE_EFFICACY_RE.test(value)
    || UNSUPPORTED_CREDENTIAL_CLAIM_RE.test(value);
}

function neutralizeUnsupportedClaimSentences(value: string): { value: string; count: number } {
  let count = 0;
  const repaired = value.replace(
    /[^.!?\r\n]+(?:[.!?]+["'’”)*\]]*|(?=\r?\n)|$)/gu,
    (sentence) => {
      if (!containsUnsupportedClaim(sentence) && !PERCENT_RESULT.test(sentence)) return sentence;
      count += 1;
      const leading = sentence.match(/^\s*/u)?.[0] ?? '';
      const trailing = sentence.match(/\s*$/u)?.[0] ?? '';
      return `${leading}${NEUTRAL_CLAIM}${trailing}`;
    },
  );
  return { value: repaired, count };
}

function neutralizeFixedPrices(value: string): string {
  const repaired = value.replace(PRICE, NEUTRAL_PRICE);
  const repeatedNeutralRange = new RegExp(
    `${NEUTRAL_PRICE}(?:\\s*[–—-]\\s*${NEUTRAL_PRICE})+`,
    'gi',
  );
  return repaired.replace(repeatedNeutralRange, NEUTRAL_PRICE);
}

function neutralizeFixedPriceAttribute(name: string, value: string): string {
  return PRICE_SEMANTIC_ATTRIBUTE_RE.test(name) ? neutralizeFixedPrices(value) : value;
}

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

function hasNonContentTextAncestor(node: HtmlNode): boolean {
  let ancestor = node.parentNode;
  while (ancestor) {
    if (NON_CONTENT_TEXT_ANCESTORS.has(ancestor.tagName ?? '')) return true;
    ancestor = ancestor.parentNode;
  }
  return false;
}

function isWithinSvgSemanticText(node: HtmlNode): boolean {
  let cursor: HtmlNode | undefined = node;
  let semanticContainer = false;
  while (cursor) {
    const tag = cursor.tagName?.toLowerCase() ?? '';
    if (['desc', 'foreignobject', 'text', 'title'].includes(tag)) semanticContainer = true;
    if (tag === 'svg') return semanticContainer;
    if (['script', 'style', 'template'].includes(tag)) return false;
    cursor = cursor.parentNode;
  }
  return false;
}

function isWithinSvg(node: HtmlNode): boolean {
  let cursor: HtmlNode | undefined = node;
  while (cursor) {
    if (cursor.tagName?.toLowerCase() === 'svg') return true;
    cursor = cursor.parentNode;
  }
  return false;
}

const PRICE_TEXT_BOUNDARIES = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'dd', 'details', 'dialog', 'div', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'legend', 'li', 'main', 'nav', 'ol', 'option', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'title', 'desc', 'text', 'foreignobject', 'tr', 'ul',
]);

type TextRun = { node: HtmlNode; start: number; end: number };

function priceTextRuns(root: HtmlNode): { text: string; runs: TextRun[] } {
  const runs: TextRun[] = [];
  let text = '';
  if (hasNonContentTextAncestor(root) && !isWithinSvgSemanticText(root)) return { text, runs };
  const visit = (node: HtmlNode): void => {
    if (node !== root && node.tagName && PRICE_TEXT_BOUNDARIES.has(node.tagName.toLowerCase())) return;
    if (node.tagName && NON_CONTENT_TEXT_ANCESTORS.has(node.tagName)) return;
    // Browsers render these as a text boundary. Keep a virtual separator in
    // the match string while leaving the real element untouched in the DOM.
    if (node.tagName === 'br') {
      text += ' ';
      return;
    }
    if (node.tagName === 'wbr') return;
    if (node.nodeName === '#text') {
      const value = node.value ?? '';
      runs.push({ node, start: text.length, end: text.length + value.length });
      text += value;
      return;
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return { text, runs };
}

function replaceTextRunRange(
  runs: readonly TextRun[],
  start: number,
  end: number,
  replacement: string,
  minimumRuns = 2,
): boolean {
  const covered = runs.filter((run) => run.start < end && run.end > start);
  if (covered.length < minimumRuns) return false;
  const first = covered[0]!;
  const last = covered.at(-1)!;
  const firstValue = first.node.value ?? '';
  const prefix = firstValue.slice(0, Math.max(0, start - first.start));
  if (first === last) {
    first.node.value = `${prefix}${replacement}${firstValue.slice(Math.max(0, end - first.start))}`;
    return true;
  }
  first.node.value = `${prefix}${replacement}`;
  for (const run of covered.slice(1, -1)) run.node.value = '';
  const lastValue = last.node.value ?? '';
  last.node.value = lastValue.slice(Math.max(0, end - last.start));
  return true;
}

function restoreContextualAddressText(root: HtmlNode): number {
  const { text, runs } = priceTextRuns(root);
  if (!ADDRESS_PLACEHOLDER.test(text.trim())) return 0;
  const start = text.search(/\S/u);
  const trailing = text.match(/\s*$/u)?.[0].length ?? 0;
  const end = text.length - trailing;
  return start >= 0 && replaceTextRunRange(runs, start, end, '{{ADDRESS}}', 1) ? 1 : 0;
}

function isAddressField(node: HtmlNode): boolean {
  const marker = /(?:^|[-_[\]])(?:(?:street[-_ ]?)?address|street)(?:$|[-_[\]])|^address-line[12]$/i;
  return ['address', 'input', 'select', 'textarea'].includes(node.tagName ?? '')
    || (node.attrs ?? []).some((attr) => ['autocomplete', 'id', 'name'].includes(attr.name) && marker.test(attr.value));
}

function containsAddressField(node: HtmlNode): boolean {
  return isAddressField(node) || (node.childNodes ?? []).some(containsAddressField);
}

/** Rewrite only the text slices covered by a price, preserving inline DOM and controls. */
function neutralizeSplitPriceRuns(root: HtmlNode): number {
  const { text, runs } = priceTextRuns(root);
  const matcher = new RegExp(PRICE.source, 'gi');
  const matches = [...text.matchAll(matcher)];
  let count = 0;
  for (const match of matches.reverse()) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (replaceTextRunRange(runs, start, end, NEUTRAL_PRICE, isWithinSvgSemanticText(root) ? 1 : 2)) count += 1;
  }
  return count;
}

/** Neutralize unsafe sentences assembled across inline nodes without flattening their DOM. */
function neutralizeSplitRiskRuns(root: HtmlNode): number {
  const { text, runs } = priceTextRuns(root);
  const sentenceMatcher = /[^.!?\r\n]+(?:[.!?]+["'’”)*\]]*|(?=\r?\n)|$)/gu;
  const ranges: Array<{ start: number; end: number }> = [];
  for (const sentence of text.matchAll(sentenceMatcher)) {
    const value = sentence[0];
    if (
      !containsUnsupportedClaim(value)
      && !PERCENT_RESULT.test(value)
      && !PROOF_TEXT.test(value)
      && !UNSUPPORTED_FABRICATED_METRIC_RE.test(value)
    ) continue;
    const leading = value.match(/^\s*/u)?.[0].length ?? 0;
    const trailing = value.match(/\s*$/u)?.[0].length ?? 0;
    ranges.push({
      start: (sentence.index ?? 0) + leading,
      end: (sentence.index ?? 0) + value.length - trailing,
    });
  }
  let count = 0;
  for (const { start, end } of ranges.reverse()) {
    if (replaceTextRunRange(runs, start, end, NEUTRAL_CLAIM, isWithinSvgSemanticText(root) ? 1 : 2)) count += 1;
  }
  return count;
}

/** Restore generated identity/contact literals even when inline markup split a word. */
function restoreSplitPersonalizationRuns(root: HtmlNode, fields: readonly CanonicalField[]): number {
  const replacements: Array<{ source: string; flags: string; replacement: string }> = [
    { source: String.raw`\b(?:Dr\.\s+Morgan\s+Ellis|Jane\s+Doe|John\s+Doe)\b`, flags: 'gi', replacement: '{{PRACTITIONER_NAME}}' },
    { source: String.raw`\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b`, flags: 'gi', replacement: '{{BUSINESS_NAME}}' },
    { source: String.raw`\bAnytown\s*,\s*[A-Z]{2}\b`, flags: 'gi', replacement: '{{CITY}}, {{STATE}}' },
    { source: String.raw`\b(?:Anytown|Your City)\b`, flags: 'gi', replacement: '{{CITY}}' },
    { source: String.raw`\bYour State\b`, flags: 'gi', replacement: '{{STATE}}' },
    { source: EMAIL.source, flags: 'gi', replacement: '{{EMAIL}}' },
    { source: CONTEXTUAL_PHONE.source, flags: 'gi', replacement: '{{PHONE}}' },
    { source: PHONE.source, flags: 'gi', replacement: '{{PHONE}}' },
  ];
  for (const field of fields) {
    const canonical = normalizeFieldName(field.name);
    const value = field.default;
    // Token-shaped defaults describe the binding itself, not legacy literal
    // copy. Replacing `{{TOKEN}}` with the same `{{TOKEN}}` would make this
    // structure-preserving loop report progress forever on older field maps.
    if (!value || !concreteDefault(value) || !isCorePersonalizationToken(canonical)) continue;
    if (!/EMAIL|PHONE/.test(canonical) && value.length < 5) continue;
    const startsWithWord = /^[A-Za-z0-9]/.test(value);
    const endsWithWord = /[A-Za-z0-9]$/.test(value);
    replacements.unshift({
      source: `${startsWithWord ? '(?<![A-Za-z0-9])' : ''}${escapeRegExp(value)}${endsWithWord ? '(?![A-Za-z0-9])' : ''}`,
      flags: 'gi',
      replacement: `{{${canonical}}}`,
    });
  }

  let count = 0;
  for (const replacement of replacements) {
    while (true) {
      const { text, runs } = priceTextRuns(root);
      let changed = false;
      for (const match of [...text.matchAll(new RegExp(replacement.source, replacement.flags))].reverse()) {
        if (match[0] === replacement.replacement) continue;
        const start = match.index ?? 0;
        if (!replaceTextRunRange(
          runs,
          start,
          start + match[0].length,
          replacement.replacement,
          isWithinSvgSemanticText(root) ? 1 : 2,
        )) continue;
        count += 1;
        changed = true;
        break;
      }
      if (!changed) break;
    }
  }
  return count;
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

function hasDirectProofSignal(node: HtmlNode): boolean {
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
  if (
    PROOF_TEXT.test(accessibleSignal)
    || PROOF_ATTR.test(accessibleSignal)
    || SYNTHETIC_BADGE_SIGNAL.test(accessibleSignal)
    || UNSUPPORTED_FABRICATED_METRIC_RE.test(accessibleSignal)
  ) return true;

  if ((node.childNodes ?? []).some((child) => (
    /^(?:h[1-6]|legend|title)$/.test(child.tagName ?? '')
    && isUnsupportedProofHeading(textContent(child))
  ))) return true;

  const signalText = (node.childNodes ?? []).map((child) => {
    if (child.nodeName === '#text') return child.value ?? '';
    return /^(?:h[1-6]|p|blockquote|figcaption|small|strong)$/.test(child.tagName ?? '')
      || (child.tagName === 'div' && (child.childNodes ?? []).every((nested) => nested.nodeName === '#text'))
      ? textContent(child)
      : '';
  }).join(' ');
  const normalizedSignal = signalText.replace(/\s+/g, ' ');
  return PROOF_TEXT.test(normalizedSignal)
    || UNSUPPORTED_FABRICATED_METRIC_RE.test(normalizedSignal)
    || isUnsupportedProofHeading(normalizedSignal);
}

function isProofContainer(node: HtmlNode): boolean {
  const tag = node.tagName ?? '';
  if (!['section', 'article', 'aside', 'figure', 'blockquote', 'div'].includes(tag)) return false;
  if (hasDirectProofSignal(node)) return true;

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
        if (
          PROOF_TEXT.test(childSignal)
          || PROOF_ATTR.test(childSignal)
          || SYNTHETIC_BADGE_SIGNAL.test(childSignal)
          || UNSUPPORTED_FABRICATED_METRIC_RE.test(childSignal)
        ) return true;
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
  return false;
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
  return value.replace(new RegExp(UNSAFE_FORM_MARKER.source, 'gi'), 'contact');
}

function inlineStyleSuppressesInteraction(value: string): boolean {
  return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0*)?)\s*(?:!important\s*)?(?:;|$)/i.test(value);
}

function sanitizeFormInlineStyle(value: string): string {
  let root: postcss.Root;
  try {
    root = postcss.parse(`.dc-form-shell{${value}}`);
  } catch {
    return value.replace(/(?:^|;)\s*(?:display|visibility|content-visibility|opacity)\s*:[^;]*(?=;|$)/gi, '');
  }
  root.walkDecls((declaration) => {
    const property = decodeCssEscapes(declaration.prop).toLowerCase();
    if (['display', 'visibility', 'content-visibility', 'opacity'].includes(property)) declaration.remove();
  });
  const rule = root.first;
  return rule && 'nodes' in rule
    ? (rule.nodes ?? []).map((node) => node.toString()).join(';')
    : '';
}

function hasStandardInquiryControls(node: HtmlNode): boolean {
  if (
    getAttr(node, 'hidden') !== undefined
    || getAttr(node, 'inert') !== undefined
    || getAttr(node, 'novalidate') !== undefined
    || getAttr(node, 'target') !== undefined
    || getAttr(node, 'enctype') !== undefined
    || getAttr(node, 'aria-hidden')?.toLowerCase() === 'true'
    || inlineStyleSuppressesInteraction(getAttr(node, 'style') ?? '')
    || ['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'role', 'title']
      .some((attribute) => getAttr(node, attribute) !== undefined)
  ) return false;
  const controls: HtmlNode[] = [];
  const buttons: HtmlNode[] = [];
  const collect = (candidate: HtmlNode): void => {
    if (['input', 'select', 'textarea'].includes(candidate.tagName ?? '')) controls.push(candidate);
    if (candidate.tagName === 'button') buttons.push(candidate);
    for (const child of candidate.childNodes ?? []) collect(child);
  };
  for (const child of node.childNodes ?? []) collect(child);
  if (controls.length !== 4 || buttons.length !== 1) return false;
  const unavailable = (candidate: HtmlNode, readonly = false): boolean => {
    if (
      getAttr(candidate, 'disabled') !== undefined
      || (readonly && getAttr(candidate, 'readonly') !== undefined)
      || getAttr(candidate, 'hidden') !== undefined
      || getAttr(candidate, 'inert') !== undefined
      || getAttr(candidate, 'aria-hidden')?.toLowerCase() === 'true'
      || getAttr(candidate, 'aria-disabled')?.toLowerCase() === 'true'
      || inlineStyleSuppressesInteraction(getAttr(candidate, 'style') ?? '')
    ) return true;
    let ancestor = candidate.parentNode;
    while (ancestor && ancestor !== node) {
      if (
        getAttr(ancestor, 'hidden') !== undefined
        || getAttr(ancestor, 'inert') !== undefined
        || getAttr(ancestor, 'aria-hidden')?.toLowerCase() === 'true'
        || (ancestor.tagName === 'fieldset' && getAttr(ancestor, 'disabled') !== undefined)
        || inlineStyleSuppressesInteraction(getAttr(ancestor, 'style') ?? '')
      ) return true;
      ancestor = ancestor.parentNode;
    }
    return false;
  };
  const submit = buttons[0]!;
  if ((getAttr(submit, 'type') ?? 'submit').toLowerCase() !== 'submit') return false;
  if (unavailable(submit)) return false;
  if (['form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget'].some((name) => getAttr(submit, name) !== undefined)) return false;
  if (getAttr(submit, 'name') !== undefined || getAttr(submit, 'value') !== undefined) return false;
  if ((textContent(submit)).replace(/\s+/g, ' ').trim() !== 'Send inquiry') return false;
  if (['aria-description', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'role', 'title']
    .some((attribute) => getAttr(submit, attribute) !== undefined)) return false;

  const expected = new Map<string, { tag: string; type?: string; required: boolean; autocomplete?: string; label: string; rows?: string }>([
    ['name', { tag: 'input', type: 'text', required: true, autocomplete: 'name', label: 'Your name' }],
    ['email', { tag: 'input', type: 'email', required: true, autocomplete: 'email', label: 'Email' }],
    ['phone', { tag: 'input', type: 'tel', required: false, autocomplete: 'tel', label: 'Phone (optional)' }],
    ['message', { tag: 'textarea', required: true, label: 'Message', rows: '5' }],
  ]);
  const seen = new Set<string>();
  for (const control of controls) {
    const name = getAttr(control, 'name') ?? '';
    const rule = expected.get(name);
    if (!rule || seen.has(name) || control.tagName !== rule.tag) return false;
    if (rule.type && (getAttr(control, 'type') ?? 'text').toLowerCase() !== rule.type) return false;
    if ((getAttr(control, 'required') !== undefined) !== rule.required) return false;
    if (getAttr(control, 'autocomplete') !== rule.autocomplete) return false;
    if (rule.rows !== undefined && getAttr(control, 'rows') !== rule.rows) return false;
    if (['accept', 'capture', 'list', 'max', 'maxlength', 'min', 'minlength', 'multiple', 'pattern', 'step'].some((attribute) => getAttr(control, attribute) !== undefined)) return false;
    if (['aria-description', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'aria-placeholder', 'id', 'placeholder', 'title'].some((attribute) => getAttr(control, attribute) !== undefined)) return false;
    if (getAttr(control, 'form') !== undefined || unavailable(control, true)) return false;
    let label = control.parentNode;
    while (label && label.tagName !== 'label' && label !== node) label = label.parentNode;
    if (label?.tagName !== 'label') return false;
    const labelText = (candidate: HtmlNode): string => {
      if (['button', 'input', 'select', 'textarea'].includes(candidate.tagName ?? '')) return '';
      return [candidate.value ?? '', ...(candidate.childNodes ?? []).map(labelText)].join('');
    };
    if (['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'for', 'hidden', 'id', 'inert', 'role', 'title']
      .some((attribute) => getAttr(label, attribute) !== undefined)) return false;
    if (labelText(label).replace(/\s+/g, ' ').trim() !== rule.label) return false;
    seen.add(name);
  }
  return seen.size === expected.size;
}

function replaceSensitiveFormContents(node: HtmlNode): { changedWrapper: boolean; renamedId?: readonly [string, string] } {
  const fragment = parseFragment(STANDARD_FORM) as unknown as HtmlNode;
  const standard = fragment.childNodes?.find((candidate) => candidate.tagName === 'form');
  if (!standard) return { changedWrapper: false };
  const preserved = new Map((node.attrs ?? [])
    .filter((attr) => ['class', 'id', 'style'].includes(attr.name))
    .map((attr) => [attr.name, attr.value]));
  const originalId = preserved.get('id');
  let changedWrapper = false;
  node.attrs = [...(standard.attrs ?? []).map((attr) => ({ ...attr }))];
  for (const [name, value] of preserved) {
    if (name === 'aria-labelledby' && UNSAFE_FORM_MARKER.test(value)) {
      setAttr(node, 'aria-label', 'Contact form');
      changedWrapper = true;
      continue;
    }
    const safeValue = name === 'style' ? sanitizeFormInlineStyle(value) : value;
    if (safeValue !== value) changedWrapper = true;
    if (name === 'class') {
      const merged = new Set(`${safeValue} ${getAttr(node, 'class') ?? ''}`.split(/\s+/).filter(Boolean));
      setAttr(node, 'class', [...merged].join(' '));
    } else {
      setAttr(node, name, safeValue);
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

/** Reveal only ancestors that directly suppress an audited form. */
function makeStandardFormAvailable(form: HtmlNode): number {
  let count = 0;
  let cursor: HtmlNode | undefined = form;
  while (cursor) {
    for (const attribute of ['hidden', 'inert']) {
      if (getAttr(cursor, attribute) !== undefined) {
        removeAttr(cursor, attribute);
        count += 1;
      }
    }
    if (getAttr(cursor, 'aria-hidden')?.toLowerCase() === 'true') {
      removeAttr(cursor, 'aria-hidden');
      count += 1;
    }
    if (cursor.tagName === 'fieldset' && getAttr(cursor, 'disabled') !== undefined) {
      removeAttr(cursor, 'disabled');
      count += 1;
    }
    const style = getAttr(cursor, 'style');
    if (style && inlineStyleSuppressesInteraction(style)) {
      const repaired = sanitizeFormInlineStyle(style);
      if (repaired.trim()) setAttr(cursor, 'style', repaired);
      else removeAttr(cursor, 'style');
      count += 1;
    }
    cursor = cursor.parentNode;
  }
  const existingStyle = sanitizeFormInlineStyle(getAttr(form, 'style') ?? '').trim().replace(/;+$/u, '');
  const visibilityStyle = 'display:grid!important;visibility:visible!important;content-visibility:visible!important;opacity:1!important';
  const normalizedStyle = existingStyle ? `${existingStyle};${visibilityStyle}` : visibilityStyle;
  if (getAttr(form, 'style') !== normalizedStyle) {
    setAttr(form, 'style', normalizedStyle);
    count += 1;
  }
  return count;
}

/**
 * Legacy modal/reveal forms depended on scripts that rehabilitation removes.
 * Move only the audited form out of a likely toggle container so unrelated
 * hidden UI stays hidden and the contact path is reachable without JavaScript.
 */
function relocateToggleHiddenStandardForms(document: HtmlNode): number {
  const forms: HtmlNode[] = [];
  walk(document, (node) => {
    if (node.tagName === 'form' && getAttr(node, 'data-dc-standard-form') === 'contact') forms.push(node);
  });
  const toggleContainer = /(?:^|[\s_-])(?:collapsed|drawer|hidden|modal|overlay|popup|reveal-hidden)(?:$|[\s_-])/i;
  let count = 0;
  for (const form of forms) {
    let ancestor = form.parentNode;
    let suppressed: HtmlNode | undefined;
    while (ancestor && !['body', 'main'].includes(ancestor.tagName ?? '')) {
      const marker = `${getAttr(ancestor, 'class') ?? ''} ${getAttr(ancestor, 'id') ?? ''}`;
      if (toggleContainer.test(marker) || inlineStyleSuppressesInteraction(getAttr(ancestor, 'style') ?? '')) {
        suppressed = ancestor;
        break;
      }
      ancestor = ancestor.parentNode;
    }
    if (!suppressed) continue;
    const target = findElement(document, 'main') ?? findElement(document, 'body');
    if (!target || target === form.parentNode) continue;
    removeNode(form);
    target.childNodes ??= [];
    form.parentNode = target;
    target.childNodes.push(form);
    count += 1;
  }
  return count;
}

/**
 * HTML ID lookups are first-match/ambiguous when legacy markup repeats an ID.
 * Preserve the first (and therefore existing IDREF/CSS target) and give every
 * later occurrence a stable, source-position-derived identity. References to
 * an already-ambiguous source ID intentionally continue to resolve to the
 * first node instead of being guessed onto a different duplicate.
 */
function ensureUniqueDomIds(document: HtmlNode, file: string): number {
  const used = new Set<string>();
  const ordinals = new Map<string, number>();
  let count = 0;
  walk(document, (node) => {
    const id = getAttr(node, 'id');
    if (!id) return;
    const ordinal = (ordinals.get(id) ?? 0) + 1;
    ordinals.set(id, ordinal);
    if (!used.has(id)) {
      used.add(id);
      return;
    }
    let suffix = 0;
    let replacement: string;
    do {
      replacement = `${id}-dc-${sha256(`${file}:${id}:${ordinal}:${suffix}`).slice(0, 10)}`;
      suffix += 1;
    } while (used.has(replacement));
    setAttr(node, 'id', replacement);
    used.add(replacement);
    count += 1;
  });
  return count;
}

/**
 * Revalidate the accessible name after a form body has been replaced.
 *
 * Legacy forms commonly point `aria-labelledby` at a heading inside the form.
 * Replacing the body removes that heading, leaving a dangling IDREF. A label
 * outside the form can also preserve sensitive intake wording even though the
 * visible controls were standardized. Resolve the final tree rather than
 * trusting the identifier spelling and fail closed to a neutral name whenever
 * a reference is missing, ambiguous, or unsafe.
 */
function normalizeStandardFormAccessibleNames(document: HtmlNode): number {
  const nodesById = new Map<string, HtmlNode[]>();
  const labels: HtmlNode[] = [];
  walk(document, (node) => {
    const id = getAttr(node, 'id');
    if (id) {
      const nodes = nodesById.get(id) ?? [];
      nodes.push(node);
      nodesById.set(id, nodes);
    }
    if (node.tagName === 'label') labels.push(node);
  });

  const safeLabels = new Map([
    ['name', 'Your name'],
    ['email', 'Email'],
    ['phone', 'Phone (optional)'],
    ['message', 'Message'],
  ]);
  const rewriteLabel = (label: HtmlNode, safe: string): void => {
    const textNodes: HtmlNode[] = [];
    const collect = (node: HtmlNode): void => {
      if (['input', 'select', 'textarea', 'button'].includes(node.tagName ?? '')) return;
      if (node.nodeName === '#text') textNodes.push(node);
      for (const child of node.childNodes ?? []) collect(child);
    };
    collect(label);
    for (const text of textNodes) text.value = '';
    label.childNodes ??= [];
    label.childNodes.unshift({ nodeName: '#text', value: `${safe} `, parentNode: label });
    if (UNSAFE_FORM_MARKER.test(getAttr(label, 'aria-label') ?? '')) setAttr(label, 'aria-label', safe);
    if (UNSAFE_FORM_MARKER.test(getAttr(label, 'title') ?? '')) setAttr(label, 'title', safe);
  };
  const isHiddenLabel = (label: HtmlNode): boolean => {
    let cursor: HtmlNode | undefined = label;
    while (cursor) {
      if (
        getAttr(cursor, 'hidden') !== undefined
        || getAttr(cursor, 'inert') !== undefined
        || getAttr(cursor, 'aria-hidden')?.toLowerCase() === 'true'
      ) return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  const unsafePrompt = (value: string): boolean => (
    UNSAFE_FORM_MARKER.test(value)
    || containsUnsupportedClaim(value)
    || PERCENT_RESULT.test(value)
    || PROOF_TEXT.test(value)
    || UNSUPPORTED_FABRICATED_METRIC_RE.test(value)
  );

  let count = 0;
  // A rebuilt canonical form intentionally drops legacy control IDs. Remove
  // now-dangling labels instead of leaving misleading or sensitive visible
  // prompts behind as inert prose.
  for (const label of labels) {
    const target = getAttr(label, 'for');
    if (target === undefined) continue;
    const matches = nodesById.get(target) ?? [];
    if (matches.length === 1 && ['input', 'select', 'textarea'].includes(matches[0]!.tagName ?? '')) continue;
    removeNode(label);
    count += 1;
  }
  walk(document, (node) => {
    if (node.tagName !== 'form' || getAttr(node, 'data-dc-standard-form') !== 'contact') return;
    const reference = getAttr(node, 'aria-labelledby');
    if (reference !== undefined) {
      const ids = reference.split(/\s+/).filter(Boolean);
      const targets = ids.map((id) => nodesById.get(id) ?? []);
      const invalidReference = ids.length === 0 || targets.some((matches) => matches.length !== 1);
      const referencedName = targets
        .flatMap((matches) => matches)
        .map((target) => [
          textContent(target),
          getAttr(target, 'aria-label') ?? '',
          getAttr(target, 'title') ?? '',
        ].join(' '))
        .join(' ');
      if (invalidReference || UNSAFE_FORM_MARKER.test(referencedName)) {
        removeAttr(node, 'aria-labelledby');
        setAttr(node, 'aria-label', 'Contact form');
        count += 1;
      }
    }

    const controls: HtmlNode[] = [];
    const collectControls = (candidate: HtmlNode): void => {
      if (['input', 'select', 'textarea'].includes(candidate.tagName ?? '')) controls.push(candidate);
      for (const child of candidate.childNodes ?? []) collectControls(child);
    };
    for (const child of node.childNodes ?? []) collectControls(child);
    for (const control of controls) {
      const name = (getAttr(control, 'name') ?? '').toLowerCase();
      const safe = safeLabels.get(name);
      if (!safe) continue;
      const associatedLabels = new Set<HtmlNode>();
      let ancestor = control.parentNode;
      while (ancestor) {
        if (ancestor.tagName === 'label' && !isHiddenLabel(ancestor)) associatedLabels.add(ancestor);
        ancestor = ancestor.parentNode;
      }
      const id = getAttr(control, 'id');
      if (id) {
        for (const label of labels) {
          if (getAttr(label, 'for') === id && !isHiddenLabel(label)) associatedLabels.add(label);
        }
      }

      let invalidReference = false;
      const labelledBy = getAttr(control, 'aria-labelledby');
      const referenced: HtmlNode[] = [];
      if (labelledBy !== undefined) {
        const ids = labelledBy.split(/\s+/).filter(Boolean);
        invalidReference = ids.length === 0;
        for (const labelledId of ids) {
          const matches = nodesById.get(labelledId) ?? [];
          if (matches.length !== 1) invalidReference = true;
          else referenced.push(matches[0]!);
        }
      }
      const described: HtmlNode[] = [];
      for (const attribute of ['aria-describedby', 'aria-details', 'aria-errormessage']) {
        const value = getAttr(control, attribute);
        if (value === undefined) continue;
        const ids = value.split(/\s+/).filter(Boolean);
        let invalidDescription = ids.length === 0;
        const resolved: HtmlNode[] = [];
        for (const describedId of ids) {
          const matches = nodesById.get(describedId) ?? [];
          if (matches.length !== 1) invalidDescription = true;
          else resolved.push(matches[0]!);
        }
        const descriptionText = resolved.map((source) => [
          textContent(source),
          getAttr(source, 'aria-label') ?? '',
          getAttr(source, 'title') ?? '',
        ].join(' ')).join(' ');
        if (invalidDescription || unsafePrompt(descriptionText)) {
          removeAttr(control, attribute);
          count += 1;
        } else {
          described.push(...resolved);
        }
      }
      const sourceText = [
        getAttr(control, 'aria-label') ?? '',
        getAttr(control, 'aria-description') ?? '',
        getAttr(control, 'aria-placeholder') ?? '',
        getAttr(control, 'placeholder') ?? '',
        getAttr(control, 'title') ?? '',
        ...[...associatedLabels, ...referenced, ...described].map((source) => [
          textContent(source),
          getAttr(source, 'aria-label') ?? '',
          getAttr(source, 'title') ?? '',
        ].join(' ')),
      ].join(' ');
      const unsafe = unsafePrompt(sourceText);
      if (unsafe) {
        for (const label of associatedLabels) {
          const labelSignal = `${textContent(label)} ${getAttr(label, 'aria-label') ?? ''} ${getAttr(label, 'title') ?? ''}`;
          if (unsafePrompt(labelSignal)) rewriteLabel(label, safe);
        }
      }
      if (invalidReference || referenced.some((source) => unsafePrompt(textContent(source)))) {
        removeAttr(control, 'aria-labelledby');
      }
      for (const attribute of ['aria-description', 'aria-placeholder', 'placeholder', 'title']) {
        if (unsafePrompt(getAttr(control, attribute) ?? '')) removeAttr(control, attribute);
      }
      if (
        invalidReference
        || unsafe
        || (![...associatedLabels].length && referenced.length === 0 && !(getAttr(control, 'aria-label') ?? '').trim())
      ) {
        setAttr(control, 'aria-label', safe);
        count += 1;
      }
    }
  });
  return count;
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
  const hasFocusableDescendant = (node: HtmlNode): boolean => (node.childNodes ?? []).some(containsFocusable);
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
    if (ariaHidden !== undefined && !ariaHidden.trim() && node.tagName === 'svg' && !containsFocusable(node)) {
      // Legacy generators emitted the intended decorative SVG marker as a
      // boolean HTML attribute even though aria-hidden requires a value.
      // Preserve that unambiguous intent so the accessibility tree and the
      // mobile overflow clamp both continue to recognize the decoration.
      setAttr(node, 'aria-hidden', 'true');
      count += 1;
    } else if (ariaHidden !== undefined && !/^(?:true|false)$/i.test(ariaHidden)) {
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
      // A surviving set of native controls can still be exposed as a simple
      // named group. If sanitization removed those controls, also remove the
      // now-prohibited accessible name from the generic container.
      if (nodeRole === 'tablist' && hasFocusableDescendant(node)) {
        setAttr(node, 'role', 'group');
      } else {
        removeAttr(node, 'role');
        removeAttr(node, 'aria-label');
        removeAttr(node, 'aria-labelledby');
      }
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

  // `aria-label` and `aria-labelledby` cannot name a generic roleless div.
  // Preserve the author's grouping intent when usable controls survived the
  // script/form cleanup; otherwise remove the prohibited name. Re-repairing a
  // compiler artifact can carry an editor slot for that former attribute, so
  // remove both namespaces' slot metadata before annotation rebuilds any
  // legitimate visible-text slot.
  walk(document, (node) => {
    if (node.tagName !== 'div') return;
    const role = (getAttr(node, 'role') ?? '').trim().toLowerCase();
    const explicitlyProhibitedNamingRole = role === 'generic' || role === 'none' || role === 'presentation';
    if (role && !explicitlyProhibitedNamingRole) return;
    const namingAttributes = ['aria-label', 'aria-labelledby'] as const;
    const hasAccessibleNameAttribute = namingAttributes.some((attribute) => getAttr(node, attribute) !== undefined);
    if (!role && hasAccessibleNameAttribute && hasFocusableDescendant(node)) {
      setAttr(node, 'role', 'group');
      count += 1;
      return;
    }

    for (const attribute of namingAttributes) {
      if (getAttr(node, attribute) === undefined) continue;
      removeAttr(node, attribute);
      count += 1;
    }
    const staleAttributeSlot = ['data-dc-edit-attribute', 'data-pb-edit-attribute']
      .some((attribute) => namingAttributes.includes((getAttr(node, attribute) ?? '').trim().toLowerCase() as typeof namingAttributes[number]));
    if (!staleAttributeSlot) return;
    for (const attribute of [
      'data-dc-edit-id',
      'data-dc-edit-attribute',
      'data-pb-edit-id',
      'data-pb-edit-attribute',
    ]) {
      if (getAttr(node, attribute) === undefined) continue;
      removeAttr(node, attribute);
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

function restoreKnownLiterals(
  document: HtmlNode,
  fields: readonly CanonicalField[],
  file: string,
  siteLiteralTokens: Readonly<Record<string, string>> = {},
): Transformation[] {
  const defaults = fieldDefaultMap(fields);
  const replacements = new Map<string, string>();
  for (const [name, value] of defaults) {
    const canonical = normalizeFieldName(name);
    const safelySpecific = /EMAIL|PHONE/.test(canonical) || value.length >= 5;
    if (isCorePersonalizationToken(canonical) && safelySpecific) replacements.set(value, `{{${canonical}}}`);
  }
  for (const [literal, token] of Object.entries(siteLiteralTokens)) {
    if (literal.trim().length < 3) continue;
    if (token === 'CITY_STATE') {
      replacements.set(literal, '{{CITY}}, {{STATE}}');
    } else if (isCorePersonalizationToken(token)) {
      replacements.set(literal, `{{${normalizeFieldName(token)}}}`);
    }
  }
  let count = 0;
  const replaceKnownPlaceholders = (segment: string): string => segment
    .replace(/\b(?:Dr\.\s+Morgan\s+Ellis|Jane\s+Doe|John\s+Doe)\b/gi, '{{PRACTITIONER_NAME}}')
    .replace(/\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/gi, '{{BUSINESS_NAME}}')
    .replace(/\bAnytown\s*,\s*[A-Z]{2}\b/gi, '{{CITY}}, {{STATE}}')
    .replace(/\bAnytown\b/gi, '{{CITY}}')
    .replace(/\bYour\s+City\b/gi, '{{CITY}}')
    .replace(/\bYour\s+State\b/gi, '{{STATE}}');
  walk(document, (node) => {
    if (node.nodeName === '#text' && typeof node.value === 'string') {
      let parent = node.parentNode;
      while (parent) {
        if (NON_CONTENT_TEXT_ANCESTORS.has(parent.tagName ?? '')) return;
        parent = parent.parentNode;
      }
      let value = outsideMustache(node.value, (segment) => replaceKnownPlaceholders(segment)
        .replace(EMAIL, '{{EMAIL}}')
        .replace(CONTEXTUAL_PHONE, '{{PHONE}}')
        .replace(PHONE, '{{PHONE}}'));
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
      let value = outsideMustache(attr.value, (segment) => {
        const visitorSafe = attributeName === 'placeholder'
          ? segment
            .replace(/\b(?:Jane|John)\s+Doe\b/gi, 'Your name')
            .replace(EMAIL, 'Email address')
            .replace(CONTEXTUAL_PHONE, 'Phone number')
            .replace(PHONE, 'Phone number')
          : segment;
        return replaceKnownPlaceholders(visitorSafe)
          .replace(EMAIL, '{{EMAIL}}')
          .replace(CONTEXTUAL_PHONE, '{{PHONE}}')
          .replace(PHONE, '{{PHONE}}');
      });
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
  const sanitizeText = (value: string): string => value
    .replace(/\bproof\s*(?:(?:&|and)\s*(?:credibility|notes?|perspective)|gallery)\b/gi, 'practice information')
    .replace(/\bproof of progress\b/gi, 'practical progress')
    .replace(/\bsocial[- ]proof\b/gi, 'practice information')
    .replace(/\bcredibility\s*(?:badges?|bar|gallery|indicators?)\b/gi, 'practice information')
    .replace(/\btestimonials?\b/gi, 'practice information')
    .replace(/\b(?:client|patient) (?:success )?stor(?:y|ies)\b/gi, 'service information')
    .replace(/\b(?:client|patient) reviews?\b/gi, 'service information')
    .replace(/\bsuccess stor(?:y|ies)\b/gi, 'service information')
    .replace(/\bwhat (?:our )?(?:clients?|patients?) (?:say|share)\b/gi, 'what to expect')
    .replace(/\b(?:direct|rotating) voices?\b/gi, 'practice perspectives')
    .replace(/\bvoices? from (?:the )?(?:cohort|community|clients?)\b/gi, 'practice perspectives')
    .replace(/\b(?:(?:real )?client|anonymized) (?:case )?note\b/gi, 'service note')
    .replace(/\bcase note\s*\(\s*anonymized\s*\)/gi, 'service information')
    .replace(/\b(?:selected|short|illustrative) (?:case )?(?:vignettes?|examples?)\s*\(\s*(?:anonymized|de-identified)\s*\)/gi, 'service information')
    .replace(/\bfeatured in\b/gi, 'described in')
    .replace(/\breal results\b/gi, 'practical progress')
    .replace(/\btrusted by\b/gi, 'designed for');
  walk(document, (node) => {
    if (node.nodeName === '#text' && typeof node.value === 'string') {
      if (hasNonContentTextAncestor(node)) return;
      const parentTag = node.parentNode?.tagName ?? '';
      const next = UNSUPPORTED_FABRICATED_METRIC_RE.test(node.value)
        ? ` ${NEUTRAL_CLAIM} `
        : /^(?:h[1-6]|legend|title)$/.test(parentTag) && isUnsupportedProofHeading(node.value)
          ? 'Practice information'
          : sanitizeText(node.value);
      if (next !== node.value) count += 1;
      node.value = next;
    }
    for (const attr of node.attrs ?? []) {
      let next = attr.value;
      if (['class', 'id', 'data-block', 'data-component', 'data-kind', 'data-role', 'data-section', 'data-type'].includes(attr.name)) {
        next = attr.name === 'id'
          ? sanitizedProofId(next)
          : attr.name === 'class'
            ? sanitizedProofClass(next)
            : sanitizedProofStructuralValue(next);
      } else if (
        (attr.name === 'href' || attr.name === 'action')
        && !next.startsWith('#')
        && /(?:^|[\/_.-])(?:testimonials?|reviews?|success[-_]?stor(?:y|ies))(?:[\/_.?#-]|$)/i.test(next)
      ) {
        next = fallbackPage;
      } else if (['data-bs-target', 'data-target'].includes(attr.name) && next.startsWith('#')) {
        // Rewritten after every target ID is known; do not treat a fragment
        // reference as customer-visible proof copy.
      } else if (
        attr.name === 'content'
        || attr.name === 'title'
        || attr.name === 'aria-label'
        || attr.name === 'alt'
        || (attr.name.startsWith('data-') && attr.name !== 'data-dc-safe-replacement')
      ) {
        next = PROOF_TEXT.test(next)
          || UNSUPPORTED_FABRICATED_METRIC_RE.test(next)
          || containsUnsupportedClaim(next)
          ? 'Practice information'
          : sanitizeText(next);
      }
      if (next !== attr.value) {
        if (attr.name === 'id') renamedIds.set(attr.value, next);
        count += 1;
      }
      attr.value = next;
    }
  });

  const idReferenceAttributes = new Set(['aria-labelledby', 'aria-describedby', 'aria-controls', 'form', 'headers', 'for', 'list']);
  const fragmentReferenceAttributes = new Set(['data-bs-target', 'data-target', 'href']);
  const existingIds = new Set<string>();
  walk(document, (node) => {
    const id = getAttr(node, 'id');
    if (id) existingIds.add(id);
  });
  walk(document, (node) => {
    const nextAttrs: Attr[] = [];
    for (const attr of node.attrs ?? []) {
      if (fragmentReferenceAttributes.has(attr.name) && attr.value.startsWith('#')) {
        const renamed = renamedIds.get(attr.value.slice(1));
        if (renamed) {
          nextAttrs.push({ ...attr, value: `#${renamed}` });
          count += 1;
          continue;
        }
      }
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
): {
  editIds: string[];
  imageIds: string[];
  wrappedTextNodes: number;
  suppressions: {
    hiddenEditSlots: number;
    pointerlessEditSlots: number;
    decorativeEditSlots: number;
    hiddenImageSlots: number;
    pointerlessImageSlots: number;
    decorativeImageSlots: number;
    protectedBackgroundSlots: number;
    incompletePictureSlots: number;
  };
} {
  const editIds: string[] = [];
  const imageIds: string[] = [];
  let wrappedTextNodes = 0;
  const suppressions = {
    hiddenEditSlots: 0,
    pointerlessEditSlots: 0,
    decorativeEditSlots: 0,
    hiddenImageSlots: 0,
    pointerlessImageSlots: 0,
    decorativeImageSlots: 0,
    protectedBackgroundSlots: 0,
    incompletePictureSlots: 0,
  };

  const mark = (node: HtmlNode, kind: 'edit' | 'image'): string => {
    const id = `${kind === 'edit' ? 'txt' : 'img'}_${sha256(`${file}:${structuralPath(node)}:${kind}`).slice(0, 18)}`;
    setAttr(node, kind === 'edit' ? 'data-dc-edit-id' : 'data-dc-image-id', id);
    return id;
  };

  const pointerEventsNone = (node: HtmlNode): boolean => (
    /(?:^|;)\s*pointer-events\s*:\s*none(?:\s*!important)?\s*(?:;|$)/i.test(getAttr(node, 'style') ?? '')
  );
  const decorativeImage = (node: HtmlNode): boolean => {
    const role = (getAttr(node, 'role') ?? '').trim().toLowerCase();
    const identity = [
      getAttr(node, 'id') ?? '',
      getAttr(node, 'class') ?? '',
      getAttr(node, 'src') ?? '',
      getAttr(node, 'srcset') ?? '',
      getAttr(node, 'style') ?? '',
    ].join(' ');
    return role === 'none' || role === 'presentation'
      || /(?:^|[\s/_.-])(?:aura|decor(?:ation|ative)?|grain|noise|ornament|pattern|texture)(?=$|[\s/_.-])/i.test(identity);
  };
  type Unavailability = 'hidden' | 'pointerless' | 'excluded';
  const directlyUnavailable = (node: HtmlNode): Unavailability | undefined => {
    if (NON_EDITABLE_ELEMENTS.has(node.tagName ?? '')) return 'excluded';
    if (
      getAttr(node, 'hidden') !== undefined
    || getAttr(node, 'inert') !== undefined
    || getAttr(node, 'aria-hidden')?.trim().toLowerCase() === 'true'
    || (node.tagName === 'input' && (getAttr(node, 'type') ?? '').trim().toLowerCase() === 'hidden')
    || inlineStyleSuppressesInteraction(getAttr(node, 'style') ?? '')
    ) return 'hidden';
    if (pointerEventsNone(node)) return 'pointerless';
    return undefined;
  };
  const protectedBackground = (node: HtmlNode): boolean => {
    const role = (getAttr(node, 'role') ?? '').trim().toLowerCase();
    return ['a', 'button', 'input', 'select', 'textarea', 'option', 'label', 'summary'].includes(node.tagName ?? '')
      || role === 'button' || role === 'link';
  };

  // Compiler IDs are derived output, never immutable source content. Clear
  // both current and v2 namespaces before rebuilding them so a second pass
  // cannot keep advertising a slot that has since become hidden/decorative.
  walk(document, (node) => {
    for (const attribute of [
      'data-dc-edit-id',
      'data-dc-edit-attribute',
      'data-dc-image-id',
      'data-pb-edit-id',
      'data-pb-edit-attribute',
      'data-pb-image-id',
    ]) removeAttr(node, attribute);
  });

  const visit = (node: HtmlNode, editableAncestor: boolean, unavailableAncestor?: Unavailability): void => {
    if (!node.tagName) {
      for (const child of node.childNodes ?? []) visit(child, editableAncestor, unavailableAncestor);
      return;
    }
    const unavailable = unavailableAncestor ?? directlyUnavailable(node);
    const elementChildren = (node.childNodes ?? []).filter((child) => Boolean(child.tagName));

    // An ID-targeted text edit replaces the target's complete inner HTML. A
    // container-level slot must therefore never own links, controls, icons, or
    // other element structure. Preserve mixed-content markup by wrapping only
    // its meaningful direct text nodes, then annotate those leaf wrappers and
    // the existing descendants independently.
    if (!unavailable && elementChildren.length > 0 && (TEXT_TAGS.has(node.tagName) || FALLBACK_TEXT_TAGS.has(node.tagName))) {
      for (const child of [...(node.childNodes ?? [])]) {
        if (child.nodeName !== '#text' || !child.value?.trim()) continue;
        const fragment = parseFragment('<span data-dc-edit-wrapper="direct-text"></span>') as unknown as HtmlNode;
        const wrapper = fragment.childNodes?.[0];
        if (!wrapper) continue;
        const childIndex = node.childNodes?.indexOf(child) ?? -1;
        if (childIndex < 0 || !node.childNodes) continue;
        wrapper.parentNode = node;
        wrapper.childNodes = [child];
        child.parentNode = wrapper;
        node.childNodes.splice(childIndex, 1, wrapper);
        wrappedTextNodes += 1;
      }
    }

    const text = textContent(node).replace(/\s+/g, ' ').trim();
    const directText = (node.childNodes ?? []).some((child) => child.nodeName === '#text' && Boolean(child.value?.trim()));
    const hasElementChildren = (node.childNodes ?? []).some((child) => Boolean(child.tagName));
    const textCandidate = !editableAncestor && !hasElementChildren && Boolean(text) && (
      TEXT_TAGS.has(node.tagName) || (FALLBACK_TEXT_TAGS.has(node.tagName) && directText)
    );
    const shouldEdit = !unavailable && textCandidate;
    // Attribute content is independent from ancestor inner HTML. Keep useful
    // alt/label/title metadata editable even when an enclosing link or figure
    // already owns the visible-text slot.
    const attributeCandidate = !textCandidate
      ? node.tagName === 'meta'
          && (getAttr(node, 'name') ?? '').trim().toLowerCase() === 'description'
          && getAttr(node, 'content')?.trim()
        ? 'content'
        : node.tagName === 'img' && getAttr(node, 'alt')?.trim()
          ? 'alt'
          : ['input', 'textarea'].includes(node.tagName) && getAttr(node, 'placeholder')?.trim()
            ? 'placeholder'
          : getAttr(node, 'aria-label')?.trim()
            ? 'aria-label'
            : getAttr(node, 'title')?.trim()
              ? 'title'
              : undefined
      : undefined;
    const nodeDecorative = decorativeImage(node);
    const editableAttribute = !unavailable && !(node.tagName === 'img' && nodeDecorative)
      ? attributeCandidate
      : undefined;
    if ((textCandidate || attributeCandidate) && unavailable && unavailable !== 'excluded') {
      if (unavailable === 'hidden') suppressions.hiddenEditSlots += 1;
      else suppressions.pointerlessEditSlots += 1;
    } else if (attributeCandidate && node.tagName === 'img' && nodeDecorative) {
      suppressions.decorativeEditSlots += 1;
    }
    if (shouldEdit || editableAttribute) {
      editIds.push(mark(node, 'edit'));
      if (editableAttribute) setAttr(node, 'data-dc-edit-attribute', editableAttribute);
      else removeAttr(node, 'data-dc-edit-attribute');
    }

    const style = getAttr(node, 'style') ?? '';
    const inlineBackground = /background(?:-image)?\s*:[^;]*url\(/i.test(style);
    const inlineBackgroundCount = (style.match(/url\(/gi) ?? []).length;
    const picture = ['img', 'source'].includes(node.tagName) && node.parentNode?.tagName === 'picture'
      ? node.parentNode
      : undefined;
    const pictureChildren = picture
      ? (picture.childNodes ?? []).filter((child) => ['img', 'source'].includes(child.tagName ?? ''))
      : [];
    const usablePicture = !picture || (
      pictureChildren.some((child) => child.tagName === 'img')
      && !decorativeImage(picture)
      && pictureChildren.every((child) => !directlyUnavailable(child) && !decorativeImage(child))
    );
    const nativeImage = node.tagName === 'img' || (node.tagName === 'source' && Boolean(picture));
    const editableBackground = inlineBackground && inlineBackgroundCount === 1 && !protectedBackground(node);
    const imageCandidate = nativeImage || (inlineBackground && inlineBackgroundCount === 1);
    const imageDecorative = nodeDecorative || Boolean(picture && decorativeImage(picture));
    if (!unavailable && !imageDecorative && usablePicture && (nativeImage || editableBackground)) {
      imageIds.push(mark(node, 'image'));
    } else if (imageCandidate) {
      if (imageDecorative) suppressions.decorativeImageSlots += 1;
      else if (unavailable === 'hidden') suppressions.hiddenImageSlots += 1;
      else if (unavailable === 'pointerless') suppressions.pointerlessImageSlots += 1;
      else if (!usablePicture) suppressions.incompletePictureSlots += 1;
      else if (inlineBackground && protectedBackground(node)) suppressions.protectedBackgroundSlots += 1;
    }
    for (const child of node.childNodes ?? []) visit(child, editableAncestor || shouldEdit, unavailable);
  };
  visit(document, false);
  return {
    editIds: [...new Set(editIds)].sort(),
    imageIds: [...new Set(imageIds)].sort(),
    wrappedTextNodes,
    suppressions,
  };
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
    // "\\r\\n" separators, or one of a bounded set of observed declaration
    // typos (missing separators/parentheses and accidental property prefixes).
    // Recover only after the original parse fails so valid author CSS remains
    // byte-stable and every legacy correction stays explicit and auditable.
    const escapedLinebreakCount = (css.match(/\\r\\n|\\n|\\r/g) ?? []).length;
    let malformedDeclarationCount = 0;
    const recovered = css
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\b(?:margin|border)\s*:\s*(background-color|box-shadow)\s*:/gi, (_match, property: string) => {
        malformedDeclarationCount += 1;
        return `${property.toLowerCase()}:`;
      })
      .replace(/\bdisplay\s*:\s*grid\s*:\s*grid-template-columns\s*:/gi, () => {
        malformedDeclarationCount += 1;
        return 'display:grid;grid-template-columns:';
      })
      .replace(/\bsubtle\s*:\s*color\s*:/gi, () => {
        malformedDeclarationCount += 1;
        return 'color:';
      })
      .replace(/\bgap\s*:\s*([^;{}]+?)\s*,\s*list-style\s*:/gi, (_match, gap: string) => {
        malformedDeclarationCount += 1;
        return `gap:${gap.trim()};list-style:`;
      })
      .replace(/\bgap\s*:\s*([^;{}]+?)\s+list-style\s*:/gi, (_match, gap: string) => {
        malformedDeclarationCount += 1;
        return `gap:${gap.trim()};list-style:`;
      })
      .replace(/(\bfont-family\s*:[^;{}]+),\s*(color\s*:)/gi, (_match, family: string, nextProperty: string) => {
        malformedDeclarationCount += 1;
        return `${family};${nextProperty}`;
      })
      .replace(/\bvar\(\s*(--[-_A-Za-z0-9]+)\s*(?=[;}])/g, (_match, property: string) => {
        malformedDeclarationCount += 1;
        return `var(${property})`;
      })
      // PostCSS cannot reach its normal URL sanitizer when malformed legacy
      // CSS also contains a quoted data URL. Consume through the matching
      // outer quote (rather than the first nested `url(...)` inside an SVG)
      // so the rest of the declaration remains syntactically intact.
      .replace(/url\(\s*(['"])\s*(?:javascript|vbscript|data|blob)\s*:(?:(?!\1)[\s\S])*?\1\s*\)/gi, () => {
        malformedDeclarationCount += 1;
        return 'none';
      })
      // Two generated pages end an otherwise valid filter value with an
      // orphaned quote. This recovery only runs after the original parse has
      // failed and is deliberately scoped to a declaration ending at `}`.
      .replace(/(\bfilter\s*:\s*[^;{}]+?)['"]\s*(?=})/gi, (_match, value: string) => {
        malformedDeclarationCount += 1;
        return value;
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
            message: 'Recovered a known malformed legacy declaration before theme extraction.',
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
        .replace(/url\(\s*(['"]?)\s*(?:javascript|vbscript|data|blob)\s*:[^)]*\)/gi, 'none')
        .replace(/@import\s+[^;]*(?:javascript|vbscript|data|blob)\s*:[^;]*;?/gi, '');
      issues.push({ code: 'css-parse-fallback', severity: 'warning', file, message: `PostCSS could not parse the stylesheet; applied the conservative safety fallback: ${error instanceof Error ? error.message : String(error)}`, resolved: true });
      return { css: sanitized, backgrounds, issues, transformations: [{ rule: 'sanitize-malformed-css', file, count: Number(sanitized !== css) }] };
    }
  }

  let proofSelectorReferences = 0;
  root.walkRules((rule) => {
    const repaired = sanitizeProofSelector(rule.selector);
    if (repaired.count > 0) {
      rule.selector = repaired.selector;
      proofSelectorReferences += repaired.count;
    }
  });

  const customValues = new Map<string, string[]>();
  const quoteValues: string[] = [];
  root.walkDecls((declaration) => {
    const property = decodeCssEscapes(declaration.prop);
    if (property.toLowerCase() === 'quotes') quoteValues.push(declaration.value);
    if (property.startsWith('--')) {
      const values = customValues.get(property) ?? [];
      values.push(declaration.value);
      customValues.set(property, values);
    }
  });
  let unsafeGeneratedContent = 0;
  const unsafeGeneratedCustomProperties = new Set<string>();
  root.walkDecls((declaration) => {
    const property = decodeCssEscapes(declaration.prop);
    if (property.toLowerCase() !== 'content') return;
    const resolved = expandCssGeneratedValue(declaration.value, customValues);
    const values = [...resolved.values];
    let unresolved = resolved.unresolved;
    if (values.some((value) => /\b(?:open|close)-quote\b/i.test(value))) {
      for (const quoteValue of quoteValues) {
        const expandedQuote = expandCssGeneratedValue(quoteValue, customValues);
        values.push(...expandedQuote.values);
        unresolved ||= expandedQuote.unresolved;
        for (const reference of expandedQuote.references) resolved.references.add(reference);
      }
    }
    const labels = new Set<string>();
    if (unresolved) labels.add('unresolved CSS generated-content variable');
    if (values.some((value) => /\{\{\s*[A-Za-z_][^{}]*(?:\}\}|$)/u.test(value))) labels.add('unsupported CSS template expression');
    for (const value of values) {
      for (const label of findUnsafeCssGeneratedText(value)) labels.add(label);
    }
    if (labels.size === 0) return;
    for (const reference of resolved.references) unsafeGeneratedCustomProperties.add(reference);
    issues.push({
      code: 'unsafe-css-generated-content',
      severity: 'warning',
      file,
      message: `Removed unsafe browser-generated text from ${declaration.prop}: ${[...labels].join(', ')}.`,
      resolved: true,
    });
    declaration.remove();
    unsafeGeneratedContent += 1;
  });
  if (unsafeGeneratedCustomProperties.size > 0) {
    root.walkDecls((declaration) => {
      if (!unsafeGeneratedCustomProperties.has(decodeCssEscapes(declaration.prop))) return;
      declaration.remove();
      unsafeGeneratedContent += 1;
    });
  }
  root.walkDecls((declaration) => {
    if (decodeCssEscapes(declaration.prop).toLowerCase() !== 'quotes') return;
    const expanded = expandCssGeneratedValue(declaration.value, customValues);
    const unsafeQuote = expanded.unresolved
      || expanded.values.some((value) => findUnsafeCssGeneratedText(value).length > 0);
    if (!unsafeQuote) return;
    declaration.remove();
    unsafeGeneratedContent += 1;
    for (const reference of expanded.references) unsafeGeneratedCustomProperties.add(reference);
  });
  if (unsafeGeneratedCustomProperties.size > 0) {
    root.walkDecls((declaration) => {
      if (!unsafeGeneratedCustomProperties.has(decodeCssEscapes(declaration.prop))) return;
      declaration.remove();
    });
  }

  let unsafe = 0;
  let backgroundImageIndex = 0;
  root.walkComments((comment) => {
    if (/\{\{\s*[A-Za-z_]/u.test(comment.text)) {
      comment.remove();
      unsafe += 1;
    }
  });
  const cssTemplateExpression = /\{\{\s*[A-Za-z_][^{}]*(?:\}\}|$)/u;
  root.walkRules((rule) => {
    if (!cssTemplateExpression.test(rule.selector)) return;
    rule.remove();
    unsafe += 1;
  });
  root.walkAtRules((rule) => {
    if (!cssTemplateExpression.test(`${rule.name} ${rule.params}`)) return;
    rule.remove();
    unsafe += 1;
  });
  root.walkDecls((declaration) => {
    if (cssTemplateExpression.test(`${declaration.prop}:${declaration.value}`)) {
      declaration.remove();
      unsafe += 1;
      return;
    }
    declaration.value = declaration.value.replace(
      /url\(\s*(['"]?)#([-_A-Za-z][-_A-Za-z0-9]*)\1\s*\)/g,
      (reference, quote: string, identifier: string) => {
        const next = sanitizedProofId(identifier);
        if (next === identifier) return reference;
        proofSelectorReferences += 1;
        return `url(${quote}#${next}${quote})`;
      },
    );
    if (/expression\s*\(/i.test(declaration.value) || containsUnsafeCssReferences(declaration.value)) {
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
    const reference = rule.params.match(/^(?:url\()?\s*(["']?)(.*?)\1\s*\)?(?:\s+.*)?$/i)?.[2] ?? rule.params;
    if (isUnsafeCssUrl(reference, true)) {
      rule.remove();
      unsafe += 1;
    }
  });
  if (proofSelectorReferences) {
    transformations.push({ rule: 'align-proof-selectors', file, count: proofSelectorReferences });
  }
  if (unsafeGeneratedContent) {
    transformations.push({ rule: 'remove-unsafe-css-generated-content', file, count: unsafeGeneratedContent });
  }
  if (unsafe) transformations.push({ rule: 'strip-unsafe-css', file, count: unsafe });
  return { css: root.toString(), backgrounds, issues, transformations };
}

function stripNonLocalSvgCssReferences(css: string, file: string): { css: string; removed: number } {
  let root;
  try {
    root = postcss.parse(css, { from: file });
  } catch {
    return { css: '', removed: css.trim() ? 1 : 0 };
  }
  let removed = 0;
  root.walkDecls((declaration) => {
    if (!containsNonLocalCssReferences(`${declaration.prop}:${declaration.value}`)) return;
    declaration.remove();
    removed += 1;
  });
  root.walkAtRules('import', (rule) => {
    if (!containsNonLocalCssReferences(`@import ${rule.params};`)) return;
    rule.remove();
    removed += 1;
  });
  return { css: root.toString(), removed };
}

/**
 * Sanitize the browser-visible and accessible copy in a local SVG asset while
 * preserving its geometry. External SVG documents do not participate in HTML
 * token hydration, so unsafe literals are replaced with vetted neutral copy.
 */
export function repairSvgAsset(
  svg: string,
  file: string,
  fields: readonly CanonicalField[] = [],
): SvgAssetRepairResult {
  const document = parseFragment(svg) as unknown as HtmlNode;
  const issues: RepairIssue[] = [];
  const transformations: Transformation[] = [];
  const removals = new Set<HtmlNode>();
  let active = 0;
  let semantic = 0;
  let styles = 0;

  const personalReplacements: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\{\{[^{}]*\}\}|\{\{|\}\}/gu, replacement: 'Practice information' },
    { pattern: /\b(?:Dr\.\s+Morgan\s+Ellis|Jane\s+Doe|John\s+Doe)\b/gi, replacement: 'Practitioner' },
    { pattern: /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/gi, replacement: 'Practice' },
    { pattern: /\bAnytown\s*,\s*[A-Z]{2}\b/gi, replacement: 'Local area' },
    { pattern: /\b(?:Anytown|Your City|Your State)\b/gi, replacement: 'Local area' },
    { pattern: new RegExp(EMAIL.source, 'gi'), replacement: 'Contact the practice' },
    { pattern: new RegExp(CONTEXTUAL_PHONE.source, 'gi'), replacement: 'Contact the practice' },
    { pattern: new RegExp(PHONE.source, 'gi'), replacement: 'Contact the practice' },
  ];
  for (const field of fields) {
    const canonical = normalizeFieldName(field.name);
    if (!field.default || !concreteDefault(field.default) || !isCorePersonalizationToken(canonical) || field.default.length < 5) continue;
    personalReplacements.unshift({
      pattern: new RegExp(escapeRegExp(field.default), 'gi'),
      replacement: /EMAIL|PHONE/.test(canonical) ? 'Contact the practice' : 'Practice',
    });
  }
  const neutralizePersonalRuns = (root: HtmlNode): number => {
    let count = 0;
    for (const { pattern, replacement } of personalReplacements) {
      while (true) {
        const { text, runs } = priceTextRuns(root);
        const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags))];
        const match = matches.at(-1);
        if (match?.[0] === replacement) break;
        if (!match || !replaceTextRunRange(runs, match.index ?? 0, (match.index ?? 0) + match[0].length, replacement, 1)) break;
        count += 1;
      }
    }
    return count;
  };
  const neutralizeAddressRuns = (root: HtmlNode): number => {
    const { text, runs } = priceTextRuns(root);
    if (!ADDRESS_PLACEHOLDER.test(text.trim())) return 0;
    const start = text.search(/\S/u);
    const end = text.length - (text.match(/\s*$/u)?.[0].length ?? 0);
    return start >= 0 && replaceTextRunRange(runs, start, end, 'Address available on request', 1) ? 1 : 0;
  };
  const neutralizeValue = (value: string): string => {
    let next = value.replace(/\{\{[^{}]*\}\}|\{\{|\}\}/gu, 'Practice information');
    for (const { pattern, replacement } of personalReplacements) {
      next = next.replace(new RegExp(pattern.source, pattern.flags), replacement);
    }
    next = neutralizeFixedPrices(next);
    if (
      containsUnsupportedClaim(next)
      || PERCENT_RESULT.test(next)
      || PROOF_TEXT.test(next)
      || UNSUPPORTED_FABRICATED_METRIC_RE.test(next)
      || SYNTHETIC_BADGE_SIGNAL.test(next)
    ) next = NEUTRAL_CLAIM;
    return next;
  };

  walk(document, (node) => {
    const tag = node.tagName?.toLowerCase() ?? '';
    if (['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'select', 'textarea', 'button'].includes(tag)) {
      removals.add(node);
      active += 1;
      return;
    }
    if (tag === 'style') {
      const styleFile = `${file}#style-${styles++}`;
      const local = stripNonLocalSvgCssReferences(textContent(node), styleFile);
      active += local.removed;
      const result = repairStylesheet(local.css, styleFile);
      replaceWithText(node, result.css);
      issues.push(...result.issues);
      transformations.push(...result.transformations);
    }
    if (!node.attrs) return;
    const insideSvg = isWithinSvg(node);
    const nextAttrs: Attr[] = [];
    for (const attribute of node.attrs) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || (tag === 'template' && name.startsWith('shadowroot'))) {
        active += 1;
        continue;
      }
      if (
        ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
        && (isUnsafeStaticUrl(tag, name, attribute.value)
          || (['src', 'href', 'xlink:href'].includes(name) && isNonLocalSvgReference(attribute.value)))
      ) {
        active += 1;
        continue;
      }
      if (name === 'style' && (containsUnsafeCssReferences(attribute.value) || containsNonLocalCssReferences(attribute.value))) {
        active += 1;
        continue;
      }
      if (SVG_SEMANTIC_ATTRIBUTE_NAMES.has(name)) {
        const repaired = neutralizeValue(attribute.value);
        if (repaired !== attribute.value) semantic += 1;
        attribute.value = repaired;
      } else if (/\{\{[^{}]*\}\}|\{\{/u.test(attribute.value)) {
        attribute.value = attribute.value.replace(/\{\{[^{}]*\}\}|\{\{[^{}]*$/gu, '');
        semantic += 1;
      }
      nextAttrs.push(attribute);
    }
    node.attrs = nextAttrs;
  });
  for (const node of removals) {
    if (node.parentNode && !removals.has(node.parentNode)) removeNode(node);
  }
  walk(document, (node) => {
    if (!node.tagName || !PRICE_TEXT_BOUNDARIES.has(node.tagName.toLowerCase())) return;
    semantic += neutralizeAddressRuns(node);
    semantic += neutralizePersonalRuns(node);
    semantic += neutralizeSplitRiskRuns(node);
    semantic += neutralizeSplitPriceRuns(node);
  });
  if (active) transformations.push({ rule: 'strip-active-svg-content', file, count: active });
  if (semantic) transformations.push({ rule: 'neutralize-svg-semantic-copy', file, count: semantic });
  return { svg: serialize(document as never), issues, transformations };
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
  const cssContentAttributes = new Set(options.cssContentAttributes ?? []);
  walk(document, (node) => {
    if (node.tagName !== 'style') return;
    for (const name of cssGeneratedContentAttributeNames(textContent(node))) cssContentAttributes.add(name);
  });
  transformations.push(...restoreKnownLiterals(document, options.fields, options.file, options.siteLiteralTokens));

  const removals = new Set<HtmlNode>();
  const proofReplacements = new Set<HtmlNode>();
  let scripts = 0;
  let unsafeAttrs = 0;
  let unsafeElements = 0;
  let riskyProof = 0;
  let standardizedForms = 0;
  let claims = 0;
  let addresses = 0;
  let splitPersonalization = 0;
  let inlineSplitRisks = 0;
  let prices = 0;
  let linkRepairs = 0;
  let inlineStyles = 0;
  let namedFormFields = 0;
  let sanitizedFormWrappers = 0;
  let detachedExternalFormControls = 0;
  let relocatedHiddenForms = 0;
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
      const formMarkup = nodeMarkup(node);
      const needsStandardForm = SENSITIVE_FORM.test(formMarkup)
        || UNSAFE_INQUIRY_FORM_TEXT_RE.test(formMarkup)
        || !hasStandardInquiryControls(node);
      if (needsStandardForm) {
        const replacement = replaceSensitiveFormContents(node);
        if (replacement.changedWrapper) sanitizedFormWrappers += 1;
        if (replacement.renamedId) sensitiveFormIdRenames.set(...replacement.renamedId);
        standardizedForms += 1;
      }
      setAttr(node, 'name', 'contact');
      setAttr(node, 'method', 'post');
      removeAttr(node, 'action');
      setAttr(node, 'data-dc-standard-form', 'contact');
      setAttr(node, 'data-netlify', 'true');
      sanitizedFormWrappers += makeStandardFormAvailable(node);

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
      const claimRepair = neutralizeUnsupportedClaimSentences(node.value);
      node.value = claimRepair.value;
      claims += claimRepair.count;
      const replaced = neutralizeFixedPrices(node.value);
      if (replaced !== node.value) prices += 1;
      node.value = replaced;
      return;
    }

    if (!node.attrs) return;
    const insideSvg = isWithinSvg(node);
    const nextAttrs: Attr[] = [];
    for (const attr of node.attrs) {
      const name = attr.name.toLowerCase();
      if (node.tagName === 'template' && name.startsWith('shadowroot')) {
        unsafeAttrs += 1;
        continue;
      }
      if (name === 'action' || name === 'formaction') {
        unsafeAttrs += 1;
        continue;
      }
      if (name.startsWith('on') || name === 'srcdoc') {
        unsafeAttrs += 1;
        continue;
      }
      if (URL_ATTRS.has(name) && (isUnsafeStaticUrl(node.tagName ?? '', name, attr.value)
        || (insideSvg && ['src', 'href', 'xlink:href'].includes(name) && isNonLocalSvgReference(attr.value)))) {
        unsafeAttrs += 1;
        continue;
      }
      if (name === 'srcset' && containsUnsafeSrcset(attr.value)) {
        unsafeAttrs += 1;
        continue;
      }
      if (name === 'style' && (/expression\s*\(/i.test(attr.value)
        || containsUnsafeCssReferences(attr.value)
        || (insideSvg && containsNonLocalCssReferences(attr.value)))) {
        unsafeAttrs += 1;
        continue;
      }
      if (['content', 'title', 'aria-label', 'alt', 'placeholder'].includes(name)) {
        if (containsUnsupportedClaim(attr.value) || PERCENT_RESULT.test(attr.value)) {
          attr.value = NEUTRAL_CLAIM;
          claims += 1;
        }
      }
      const addressContext = isAddressField(node)
        || ((['fieldset', 'form', 'label'].includes(node.tagName ?? '') || getAttr(node, 'role') === 'group') && containsAddressField(node));
      if (
        (name === 'placeholder' || name === 'value' || (addressContext && (name === 'aria-label' || name === 'title')))
        && ADDRESS_PLACEHOLDER.test(attr.value.trim())
      ) {
        attr.value = '{{ADDRESS}}';
        addresses += 1;
      }
      const safeValue = PRICE_SEMANTIC_ATTRIBUTE_RE.test(name) || cssContentAttributes.has(name)
        ? neutralizeFixedPrices(attr.value)
        : attr.value;
      if (safeValue !== attr.value) prices += 1;
      attr.value = safeValue;
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
      const styleFile = inlineStylesheetPath(options.file, styleIndex);
      const local = insideSvg
        ? stripNonLocalSvgCssReferences(foundationTheme.css, styleFile)
        : { css: foundationTheme.css, removed: 0 };
      unsafeAttrs += local.removed;
      const repaired = repairStylesheet(local.css, styleFile);
      replaceWithText(node, repaired.css);
      pageBackgrounds.push(...repaired.backgrounds);
      issues.push(...repaired.issues);
      transformations.push(...repaired.transformations);
    }
  });

  // A price may be split across inline nodes (`$<span>45</span>`). Rewrite
  // only its covered text runs; links, icons, emphasis, IDs, and attributes
  // remain byte-for-byte structural peers.
  walk(document, (node) => {
    if (!node.tagName || !PRICE_TEXT_BOUNDARIES.has(node.tagName.toLowerCase())) return;
    addresses += restoreContextualAddressText(node);
    splitPersonalization += restoreSplitPersonalizationRuns(node, options.fields);
    inlineSplitRisks += neutralizeSplitRiskRuns(node);
    prices += neutralizeSplitPriceRuns(node);
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

  // Only controls physically contained by the audited inquiry form survive.
  // A `form=` association can otherwise bypass descendant-only form checks;
  // orphan controls can still solicit unsupported data even when inert.
  walk(document, (node) => {
    if (node.tagName === 'button') {
      let physicalOwner = node.parentNode;
      while (physicalOwner && physicalOwner.tagName !== 'form') physicalOwner = physicalOwner.parentNode;
      if (getAttr(node, 'form') !== undefined) {
        if (physicalOwner?.tagName === 'form' && getAttr(physicalOwner, 'data-dc-standard-form') === 'contact') {
          removeAttr(node, 'form');
        } else {
          removals.add(node);
        }
        detachedExternalFormControls += 1;
        return;
      }
      const type = getAttr(node, 'type')?.trim().toLowerCase();
      if (!physicalOwner && type === 'submit') {
        removals.add(node);
        detachedExternalFormControls += 1;
        return;
      }
      if (!physicalOwner && (type === undefined || type === '' || !['button', 'reset', 'submit'].includes(type))) {
        // Outside a form, an omitted or invalid button type is a submit-state
        // control with no submission owner. Preserve navigation/toggle styling
        // and behavior while making its non-submit intent explicit.
        setAttr(node, 'type', 'button');
        detachedExternalFormControls += 1;
      }
    }
    if (!['input', 'select', 'textarea'].includes(node.tagName ?? '')) return;
    let owner = node.parentNode;
    while (owner && owner.tagName !== 'form') owner = owner.parentNode;
    if (owner?.tagName === 'form' && getAttr(owner, 'data-dc-standard-form') === 'contact') {
      if (getAttr(node, 'form') !== undefined) {
        removeAttr(node, 'form');
        detachedExternalFormControls += 1;
      }
      return;
    }
    const removable = node.parentNode?.tagName === 'label' ? node.parentNode : node;
    removals.add(removable);
    detachedExternalFormControls += 1;
  });

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
  const hasDirectSelectedAncestor = (node: HtmlNode): boolean => {
    let cursor = node.parentNode;
    while (cursor) {
      if (proofReplacements.has(cursor) && hasDirectProofSignal(cursor)) return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  for (const node of proofReplacements) {
    if (!node.parentNode || hasDirectSelectedAncestor(node)) continue;
    // Preserve a general wrapper that matched only because it contains a
    // smaller proof card. Conversely, when the wrapper itself is explicitly
    // labeled as proof, replace it once and suppress all selected descendants.
    if (!hasDirectProofSignal(node) && hasSelectedDescendant(node)) continue;
    replaceNode(node, NEUTRAL_BLOCK);
  }
  for (const node of removals) {
    if (!node.parentNode || removals.has(node.parentNode) || proofReplacements.has(node.parentNode)) continue;
    removeNode(node);
  }
  relocatedHiddenForms = relocateToggleHiddenStandardForms(document);
  sanitizedFormWrappers += normalizeStandardFormAccessibleNames(document);
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
  const duplicateIds = ensureUniqueDomIds(document, options.file);
  if (scripts) transformations.push({ rule: 'replace-scripts-with-audited-runtime', file: options.file, count: scripts });
  if (unsafeAttrs) transformations.push({ rule: 'strip-event-and-unsafe-url-attributes', file: options.file, count: unsafeAttrs });
  if (unsafeElements) transformations.push({ rule: 'strip-active-embedded-content', file: options.file, count: unsafeElements });
  if (riskyProof) transformations.push({ rule: 'replace-unsupported-proof', file: options.file, count: riskyProof });
  if (proofVocabulary) transformations.push({ rule: 'remove-proof-vocabulary', file: options.file, count: proofVocabulary });
  if (splitPersonalization) transformations.push({ rule: 'restore-split-personalization-tokens', file: options.file, count: splitPersonalization });
  if (inlineSplitRisks) transformations.push({ rule: 'neutralize-inline-split-risk', file: options.file, count: inlineSplitRisks });
  if (decorativeOverlays) transformations.push({ rule: 'relocate-orphan-decorative-overlay', file: options.file, count: decorativeOverlays });
  if (mainLandmarks) transformations.push({ rule: 'restore-main-landmark', file: options.file, count: mainLandmarks });
  if (headings) transformations.push({ rule: 'restore-page-heading', file: options.file, count: headings });
  if (accessibility) transformations.push({ rule: 'normalize-accessibility-semantics', file: options.file, count: accessibility });
  if (duplicateIds) transformations.push({ rule: 'deduplicate-dom-ids', file: options.file, count: duplicateIds });
  if (standardizedForms) transformations.push({ rule: 'standardize-contact-form', file: options.file, count: standardizedForms });
  if (namedFormFields) transformations.push({ rule: 'name-form-controls', file: options.file, count: namedFormFields });
  if (sanitizedFormWrappers) transformations.push({ rule: 'sanitize-sensitive-form-wrapper', file: options.file, count: sanitizedFormWrappers });
  if (detachedExternalFormControls) transformations.push({ rule: 'remove-nonstandard-form-controls', file: options.file, count: detachedExternalFormControls });
  if (relocatedHiddenForms) transformations.push({ rule: 'relocate-toggle-hidden-contact-form', file: options.file, count: relocatedHiddenForms });
  if (claims) transformations.push({ rule: 'neutralize-outcome-claims', file: options.file, count: claims });
  if (addresses) transformations.push({ rule: 'restore-address-placeholder', file: options.file, count: addresses });
  if (prices) transformations.push({ rule: 'replace-fixed-price', file: options.file, count: prices, detail: 'Contact for current pricing' });
  if (linkRepairs) transformations.push({ rule: 'repair-navigation-targets', file: options.file, count: linkRepairs });

  transformations.push(...addRequiredPersonalization(document, options.file));
  const body = findElement(document, 'body') ?? document;
  appendHtml(body, `<script defer src="${COMPATIBILITY_SCRIPT_PATH}" data-dc-runtime="compatibility-v1"></script>`);

  const annotated = annotateEditableNodes(document, options.file);
  const annotationSuppressionCount = Object.values(annotated.suppressions).reduce((sum, count) => sum + count, 0);
  if (annotationSuppressionCount > 0) {
    transformations.push({
      rule: 'suppress-unreachable-customer-slots',
      file: options.file,
      count: annotationSuppressionCount,
      detail: Object.entries(annotated.suppressions).map(([reason, count]) => `${reason}=${count}`).join(';'),
    });
  }
  if (annotated.wrappedTextNodes) {
    transformations.push({
      rule: 'wrap-direct-editable-text',
      file: options.file,
      count: annotated.wrappedTextNodes,
      detail: 'Wrapped direct text in mixed-content containers so customer edits cannot erase descendant structure.',
    });
  }
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

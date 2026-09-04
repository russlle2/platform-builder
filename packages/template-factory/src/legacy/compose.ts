import { parse, parseFragment, serialize, serializeOuter } from 'parse5';
import postcss from 'postcss';
import { posix } from 'node:path';
import {
  COMPATIBILITY_SCRIPT_PATH,
  LEGACY_REPAIR_RULE_VERSION,
  type CanonicalDesign,
  type CanonicalField,
  type CatalogTemplate,
  type ContentEntry,
  type ContentPreset,
  type ImageEntry,
  type LegacyTemplateInput,
  type QualityCheck,
  type QualityReceipt,
  type RepairIssue,
  type RepairResult,
  type ThemePreset,
  type ThemeToken,
  type Transformation,
  canonicalizeManifest,
  detectPageRole,
  normalizeFields,
  sha256,
  stableStringify,
} from './contracts.js';
import { canonicalDesignHash, createDedupeFingerprint } from './dedupe.js';
import type { HomepageDonor } from './homepage-donor.js';
import {
  LEGACY_COMPATIBILITY_SCRIPT,
  cssBackgroundSlotId,
  detectFoundation,
  inlineStylesheetPath,
  repairPage,
  repairStylesheet,
  resolveStaticSelectorTargets,
  type BackgroundSelector,
  type HtmlNode,
} from './repair.js';
import { extractTemplateTokens, validateTemplateContract } from '../template-contract.js';
import {
  containsUnsafeCssReferences,
  containsUnsafeSrcset,
  isUnsafeStaticUrl,
} from './url-safety.js';

type Attr = { name: string; value: string };

interface SeparatedContent {
  pages: Record<string, string>;
  entries: ContentEntry[];
  images: ImageEntry[];
}

interface SeparatedTheme {
  styles: Record<string, string>;
  tokens: ThemeToken[];
  fontImports: string[];
  images: ImageEntry[];
  corrections: Transformation[];
}

const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
const BACKGROUND_URL_RE = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
const TEXT_FILE_RE = /\.(?:html?|css|js|mjs|cjs|json|txt|md|xml|svg)$/i;
const REPAIR_STYLESHEET_PATH = 'assets/css/dc-repair.css';
const REPAIR_IMAGE_PATH = 'assets/img/dc-placeholder.svg';
const isVendedStylesheet = (path: string): boolean => /^assets\/vendor\/[a-f0-9]{64}\.css$/i.test(path);
const REPAIR_STYLESHEET = [
  'html,body{max-width:100%;overflow-x:clip}',
  '*,*::before,*::after{box-sizing:border-box}',
  '[hidden]{display:none!important}',
  'img,svg,video,canvas{max-width:100%;height:auto}',
  '.dc-role-page{padding:clamp(3rem,7vw,6rem) 0}',
  '.dc-role-page .container{width:min(72rem,92vw);margin-inline:auto}',
  '.dc-role-page .lead{max-width:65ch;font-size:1.1rem}',
  '.dc-role-actions{display:flex;flex-wrap:wrap;gap:1rem;margin-top:1.5rem}',
  '.dc-role-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem;margin-top:2rem}',
  '.dc-role-card{padding:1.25rem;border:1px solid currentColor;border-radius:.75rem}',
  '.dc-contact-form{display:grid;gap:1rem;max-width:42rem;margin-top:2rem}',
  '.dc-contact-form label{display:grid;gap:.35rem}',
  '.dc-contact-form input,.dc-contact-form textarea{width:100%;padding:.75rem;border:1px solid currentColor;border-radius:.4rem;font:inherit}',
  ':is(p,blockquote,figcaption,dd,td)>a{text-decoration-line:underline;text-underline-offset:.12em}',
  '@media(max-width:600px){body *{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere}',
  'body :is(nav,header,[class*="nav"],[class*="row"],[class*="flex"]){flex-wrap:wrap!important}',
  'body :is(.grid,[class*="-grid"],[class*="grid-"]){grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))!important}',
  'body>svg[aria-hidden]{inset-inline:1px!important;margin-inline:auto!important;max-width:calc(100vw - 2px)!important}',
  'table{display:block;max-width:100%;overflow-x:auto}pre,code{white-space:pre-wrap;overflow-wrap:anywhere}}',
].join('');
const REPAIR_IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="Calm abstract placeholder"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#dce8e2"/><stop offset="1" stop-color="#b9cfc5"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="1250" cy="220" r="310" fill="#fff" opacity=".2"/></svg>';

export const LEGACY_ROLE_ADAPTERS = [
  'home', 'about', 'services', 'booking', 'contact', 'pricing', 'faq', 'resources', 'shop', 'blends',
  'events', 'membership', 'results', 'privacy', 'terms', 'accessibility', 'location', 'gallery', 'press', 'other',
] as const;

type LegacyRole = (typeof LEGACY_ROLE_ADAPTERS)[number];

interface RoleCopy {
  title: string;
  lead: string;
  cards: ReadonlyArray<readonly [string, string]>;
  action: 'book' | 'contact' | 'none';
  form?: boolean;
}

const ROLE_COPY: Readonly<Record<LegacyRole, RoleCopy>> = {
  home: {
    title: 'Welcome to {{BUSINESS_NAME}}',
    lead: 'Explore current services, practical information, and a clear next step when you are ready.',
    cards: [['Current services', 'Review the ways this practice currently works with clients.'], ['What to expect', 'Learn how to prepare and what happens after an inquiry.']],
    action: 'book',
  },
  about: {
    title: 'About {{BUSINESS_NAME}}',
    lead: 'Get to know the practice, its approach, and the values that shape each client experience.',
    cards: [['The approach', 'Care is tailored to the person, the context, and the goals discussed together.'], ['The practitioner', 'Ask {{PRACTITIONER_NAME}} about experience, scope, and whether the practice may fit your needs.']],
    action: 'contact',
  },
  services: {
    title: 'Services at {{BUSINESS_NAME}}',
    lead: 'Explore the current services and ask which option best matches your priorities.',
    cards: [['Current offerings', '{{SERVICES}}'], ['Choosing a service', 'Contact the practice for current availability, format, and next-step guidance.']],
    action: 'book',
  },
  booking: {
    title: 'Book a conversation',
    lead: 'Choose a convenient next step and confirm current availability directly with {{BUSINESS_NAME}}.',
    cards: [['Before booking', 'Bring any practical questions about format, timing, access, or preparation.'], ['After booking', 'The practice will share the current details needed for your visit or session.']],
    action: 'book',
  },
  contact: {
    title: 'Contact {{BUSINESS_NAME}}',
    lead: 'Send a general inquiry without including private health details. The practice can explain secure next steps if needed.',
    cards: [['Email', 'Use the inquiry form or email {{EMAIL}}.'], ['Phone', 'Call {{PHONE}} during current business hours.']],
    action: 'none',
    form: true,
  },
  pricing: {
    title: 'Pricing and payment',
    lead: 'Contact for current pricing. Ask what is included, when payment is due, and whether any policies apply.',
    cards: [['Current pricing', 'Contact for current pricing.'], ['Before you decide', 'Confirm the service, schedule, and total cost directly with the practice.']],
    action: 'contact',
  },
  faq: {
    title: 'Frequently asked questions',
    lead: 'Start with these practical questions, then contact the practice for details specific to you.',
    cards: [['How do I begin?', 'Send a general inquiry or request current booking availability.'], ['What should I prepare?', 'Ask what information is useful and avoid sending sensitive health details through a general form.']],
    action: 'contact',
  },
  resources: {
    title: 'Resources',
    lead: 'Browse practical information from {{BUSINESS_NAME}} and ask which resources are most relevant to your goals.',
    cards: [['Getting started', 'Review the practice approach and current services before choosing a next step.'], ['Questions', 'Contact the practice when a resource does not answer your situation.']],
    action: 'contact',
  },
  shop: {
    title: 'Current shop offerings',
    lead: 'Ask {{BUSINESS_NAME}} what is currently available, how items are sourced, and which terms apply.',
    cards: [['Availability', 'Products and fulfillment options may change. Confirm current details before ordering.'], ['Questions', 'Ask about ingredients, use, shipping, pickup, or other practical details.']],
    action: 'contact',
  },
  blends: {
    title: 'Blends and preparations',
    lead: 'Explore the practice approach to current blends and ask what information is appropriate to share before choosing one.',
    cards: [['Current options', 'Ask which blends or preparations are currently offered.'], ['Responsible use', 'Request current instructions, ingredients, storage guidance, and relevant precautions.']],
    action: 'contact',
  },
  events: {
    title: 'Events and workshops',
    lead: 'Find out what is scheduled, who each event is for, and what to expect before attending.',
    cards: [['Schedule', 'Contact the practice for current dates, capacity, and access information.'], ['Preparation', 'Ask what to bring and whether advance registration is required.']],
    action: 'book',
  },
  membership: {
    title: 'Membership options',
    lead: 'Review the current membership format and confirm what is included before enrolling.',
    cards: [['What is included', 'Ask about access, scheduling, communication, and current member resources.'], ['Terms', 'Confirm current pricing, renewal, cancellation, and pause policies.']],
    action: 'contact',
  },
  results: {
    title: 'Goals and progress',
    lead: 'Every experience is individual. Discuss realistic goals, ways to notice progress, and when to reassess your next step.',
    cards: [['Your priorities', 'Begin with the changes or support that matter most to you.'], ['Review together', 'Experiences vary; ask how the practice reviews fit and progress over time.']],
    action: 'contact',
  },
  privacy: {
    title: 'Privacy information',
    lead: 'Ask {{BUSINESS_NAME}} for its current privacy practices and use an appropriate secure channel for sensitive information.',
    cards: [['General inquiries', 'Do not include private health, financial, or other sensitive details in a general website form.'], ['Privacy requests', 'Contact the practice to request the current policy or ask how your information is handled.']],
    action: 'contact',
  },
  terms: {
    title: 'Current terms and policies',
    lead: 'Request the terms that apply to the service you are considering before you book or purchase.',
    cards: [['Service terms', 'Confirm scheduling, payment, cancellation, and access details directly with the practice.'], ['Questions', 'Ask for clarification before agreeing to any current policy.']],
    action: 'contact',
  },
  accessibility: {
    title: 'Accessibility',
    lead: '{{BUSINESS_NAME}} welcomes questions about access needs and available accommodations.',
    cards: [['Website access', 'Report any barrier that makes information or navigation difficult to use.'], ['Service access', 'Ask about the location, format, communication, or other accommodations before booking.']],
    action: 'contact',
  },
  location: {
    title: 'Location and access',
    lead: 'Find {{BUSINESS_NAME}} at {{ADDRESS}} and confirm current visit details before traveling.',
    cards: [['Before your visit', 'Ask about directions, arrival time, parking, transit, and building access.'], ['Remote options', 'Contact the practice to ask whether remote or alternate formats are currently available.']],
    action: 'contact',
  },
  gallery: {
    title: 'Gallery',
    lead: 'Explore the atmosphere and approach of {{BUSINESS_NAME}}. Images can be updated to reflect the current practice.',
    cards: [['Practice setting', 'Use current, licensed images that accurately represent the space or service.'], ['Questions', 'Contact the practice for current access and visit information.']],
    action: 'contact',
  },
  press: {
    title: 'Press and media',
    lead: 'Find current background information and contact {{BUSINESS_NAME}} directly for media inquiries.',
    cards: [['Practice information', 'Confirm names, descriptions, images, and availability before publication.'], ['Media contact', 'Send a concise inquiry with your outlet, topic, and deadline.']],
    action: 'contact',
  },
  other: {
    title: 'More from {{BUSINESS_NAME}}',
    lead: 'Explore current practice information and contact the team when you need a detail that is not covered here.',
    cards: [['Current information', 'Services, schedules, and policies may change; confirm the details that affect your decision.'], ['Next step', 'Send a general inquiry or request current booking availability.']],
    action: 'contact',
  },
};

const ROLE_CONTACT_FORM = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button><p class="dc-form-status" aria-live="polite"></p></form>';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function decode(value: string | Uint8Array): string {
  return typeof value === 'string' ? value : new TextDecoder().decode(value);
}

function parseJson(value: string | Uint8Array | undefined): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(decode(value)) as unknown;
  } catch {
    return undefined;
  }
}

const EXACT_THEME_COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;

function isSingleSafeThemeDeclaration(value: string): boolean {
  if (value.length > 4_096 || /[\0\r\n]|<\/style\b/i.test(value) || containsUnsafeCssReferences(value)) return false;
  try {
    const root = postcss.parse(`:root{--dc-theme-check:${value};}`);
    if (root.nodes.length !== 1 || root.nodes[0]?.type !== 'rule') return false;
    const declarations = root.nodes[0].nodes ?? [];
    return declarations.length === 1
      && declarations[0]?.type === 'decl'
      && declarations[0].prop === '--dc-theme-check'
      && !declarations[0].important;
  } catch {
    return false;
  }
}

function isSingleSafeFontImport(value: string): boolean {
  if (!value || value.length > 4_096 || /[\0\r\n]|<\/style\b/i.test(value) || containsUnsafeCssReferences(value)) return false;
  try {
    const root = postcss.parse(value);
    const rule = root.nodes[0];
    if (
      root.nodes.length !== 1
      || rule?.type !== 'atrule'
      || rule.name.toLowerCase() !== 'import'
      || rule.nodes
    ) return false;
    const params = rule.params.trim();
    const match = params.match(/^url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s"')]+))\s*\)$/i)
      ?? params.match(/^(?:"([^"]*)"|'([^']*)')$/);
    const rawUrl = match?.slice(1).find((candidate) => candidate !== undefined);
    if (!rawUrl || /[\\\u0000-\u0020\u007f]/.test(rawUrl)) return false;
    const url = new URL(rawUrl);
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.port
      && (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com');
  } catch {
    return false;
  }
}

function assertSafeThemePresetValues(preset: ThemePreset): void {
  if (!Array.isArray(preset.tokens) || !Array.isArray(preset.fontImports)) {
    throw new Error('Theme preset must contain token and font-import arrays');
  }
  const ids = new Set<string>();
  for (const [index, token] of preset.tokens.entries()) {
    if (
      !token
      || typeof token !== 'object'
      || typeof token.id !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(token.id)
      || ids.has(token.id)
      || (token.kind !== 'color' && token.kind !== 'font')
      || typeof token.value !== 'string'
      || (token.original !== undefined && (typeof token.original !== 'string' || token.original.length > 4_096))
      || !isSingleSafeThemeDeclaration(token.value)
      || (token.kind === 'color' && !EXACT_THEME_COLOR_VALUE.test(token.value.trim()))
      || (token.kind === 'font' && /(?:url\s*\(|@import\b)/i.test(token.value))
    ) {
      throw new Error(`Theme preset contains an unsafe token at index ${index}`);
    }
    ids.add(token.id);
  }
  for (const [index, fontImport] of preset.fontImports.entries()) {
    if (typeof fontImport !== 'string' || !isSingleSafeFontImport(fontImport)) {
      throw new Error(`Theme preset contains an unsafe font import at index ${index}`);
    }
  }
}

function readPreviousThemePreset(
  value: string | Uint8Array | undefined,
  legacySlug: string,
): ThemePreset | undefined {
  if (value === undefined) return undefined;
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid prior theme preset for ${legacySlug}: expected an object`);
  }
  const candidate = parsed as Partial<ThemePreset>;
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.legacySlug !== 'string'
    || candidate.legacySlug !== legacySlug
    || typeof candidate.hash !== 'string'
    || !/^[a-f0-9]{64}$/.test(candidate.hash)
    || !Array.isArray(candidate.tokens)
    || !Array.isArray(candidate.fontImports)
  ) {
    throw new Error(`Invalid prior theme preset for ${legacySlug}: malformed schema or lineage`);
  }
  const preset = candidate as ThemePreset;
  try {
    assertSafeThemePresetValues(preset);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid prior theme preset for ${legacySlug}: ${detail}`);
  }
  if (preset.tokens.some((token) => !/^(?:color|font)_[a-f0-9]{14}$/.test(token.id) || !token.id.startsWith(`${token.kind}_`))) {
    throw new Error(`Invalid prior theme preset for ${legacySlug}: token identity does not match its kind`);
  }
  const expectedHash = sha256(stableStringify({ tokens: preset.tokens, fontImports: preset.fontImports }));
  if (preset.hash !== expectedHash || preset.id !== `theme_${expectedHash.slice(0, 24)}`) {
    throw new Error(`Invalid prior theme preset for ${legacySlug}: content hash does not match its payload`);
  }
  return preset;
}

function walk(node: HtmlNode, visitor: (node: HtmlNode) => void): void {
  visitor(node);
  for (const child of [...(node.childNodes ?? [])]) walk(child, visitor);
}

function getAttr(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((attr) => attr.name.toLowerCase() === name)?.value;
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  if (!node.attrs) node.attrs = [];
  const current = node.attrs.find((attr) => attr.name.toLowerCase() === name);
  if (current) current.value = value;
  else node.attrs.push({ name, value });
}

function textContent(node: HtmlNode): string {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(textContent).join('');
}

function innerHtml(node: HtmlNode): string {
  return (node.childNodes ?? []).map((child) => serializeOuter(child as never)).join('');
}

function replaceChildrenWithComment(node: HtmlNode, value: string): void {
  node.childNodes = [{ nodeName: '#comment', data: value, parentNode: node }];
}

function parseRgbColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})(?:[0-9a-f]{2})?$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((digit) => `${digit}${digit}`).join('') : hex;
    return [0, 2, 4].map((index) => Number.parseInt(expanded.slice(index, index + 2), 16)) as [number, number, number];
  }
  const rgb = normalized.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i);
  if (!rgb) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel)))) as [number, number, number];
}

function relativeLuminance(rgb: readonly number[]): number {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function rgbHex(rgb: readonly number[]): string {
  return `#${rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Mid-tone legacy text is the dominant contrast defect. Move only colors that
 * are actually wired into a text `color` declaration toward the nearest safe
 * luminance extreme; background/decorative colors remain unchanged. The
 * caller retains the exact source value as ThemeToken.original.
 */
export function normalizeAccessibleTextColor(value: string): string {
  const rgb = parseRgbColor(value);
  if (!rgb) return value;
  const luminance = relativeLuminance(rgb);
  if (luminance <= 0.075 || luminance >= 0.9) return value;
  const toward = luminance < 0.5 ? [0, 0, 0] : [255, 255, 255];
  const target = luminance < 0.5 ? 0.075 : 0.9;
  let low = 0;
  let high = 1;
  let candidate = [...rgb];
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const amount = (low + high) / 2;
    const mixed = rgb.map((channel, index) => channel + (toward[index]! - channel) * amount);
    const mixedLuminance = relativeLuminance(mixed);
    const reached = luminance < 0.5 ? mixedLuminance <= target : mixedLuminance >= target;
    if (reached) {
      candidate = mixed;
      high = amount;
    } else {
      low = amount;
    }
  }
  return rgbHex(candidate);
}

function restoreChildren(node: HtmlNode, html: string): void {
  const parseInContext = parseFragment as unknown as (context: unknown, fragmentHtml: string) => unknown;
  const fragment = parseInContext(node, html) as HtmlNode;
  node.childNodes = fragment.childNodes ?? [];
  for (const child of node.childNodes) child.parentNode = node;
}

function findElement(node: HtmlNode, tagName: string): HtmlNode | undefined {
  let found: HtmlNode | undefined;
  walk(node, (candidate) => {
    if (!found && candidate.tagName === tagName) found = candidate;
  });
  return found;
}

function normalizedRole(role: string): LegacyRole {
  return (LEGACY_ROLE_ADAPTERS as readonly string[]).includes(role) ? role as LegacyRole : 'other';
}

function roleDocumentTitle(role: LegacyRole): string {
  if (role === 'home') return '{{BUSINESS_NAME}} — Home';
  if (role === 'faq') return '{{BUSINESS_NAME}} — FAQ';
  return `{{BUSINESS_NAME}} — ${role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
}

function roleMarkup(roleInput: string, niche: string, sourceExcerpt?: string): string {
  const role = normalizedRole(roleInput);
  const copy = ROLE_COPY[role];
  const label = escapeHtml(niche.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const cards = [
    ...copy.cards,
    ['Practice overview', sourceExcerpt || 'Contact the practice for the current details that apply to this page.'] as const,
  ].map(([title, body]) => `<article class="dc-role-card"><h2>${title}</h2><p>${body}</p></article>`).join('');
  const action = copy.action === 'book'
    ? '<div class="dc-role-actions"><a class="btn primary" href="{{BOOKING_URL}}">Check current availability</a><a class="btn" href="mailto:{{EMAIL}}">Ask a question</a></div>'
    : copy.action === 'contact'
      ? '<div class="dc-role-actions"><a class="btn primary" href="mailto:{{EMAIL}}">Contact the practice</a></div>'
      : '';
  return `<section class="dc-role-page dc-role-${role}" data-dc-page-role="${role}" aria-labelledby="dc-role-heading"><div class="container"><p class="kicker">${label}</p><h1 id="dc-role-heading">${copy.title}</h1><p class="lead">${copy.lead}</p><div class="dc-role-grid">${cards}</div>${action}${copy.form ? ROLE_CONTACT_FORM : ''}</div></section>`;
}

/**
 * Reuse the source document's header/footer and head assets while replacing a
 * known-bad page body with deterministic, role-appropriate, editable copy.
 */
export function adaptLegacyPageShell(html: string, roleInput: string, niche: string, sourceExcerpt?: string): string {
  const role = normalizedRole(roleInput);
  const document = parse(html) as unknown as HtmlNode;
  let main = findElement(document, 'main');
  if (!main) {
    const body = findElement(document, 'body') ?? document;
    const fragment = parseFragment(`<main></main>`) as unknown as HtmlNode;
    main = fragment.childNodes?.find((node) => node.tagName === 'main');
    if (main) {
      body.childNodes ??= [];
      main.parentNode = body;
      body.childNodes.push(main);
    }
  }
  if (main) {
    setAttr(main, 'data-dc-rehabilitated-role', role);
    restoreChildren(main, roleMarkup(role, niche, sourceExcerpt ? escapeHtml(sourceExcerpt) : undefined));
  }
  const title = findElement(document, 'title');
  if (title) restoreChildren(title, roleDocumentTitle(role));
  walk(document, (node) => {
    if (node.tagName === 'meta' && getAttr(node, 'name')?.toLowerCase() === 'description') {
      setAttr(node, 'content', ROLE_COPY[role].lead);
    }
  });
  return serialize(document as never);
}

function extractRoleSourceExcerpt(html: string): string | undefined {
  const document = parse(html) as unknown as HtmlNode;
  const main = findElement(document, 'main');
  if (!main) return undefined;
  const candidates: string[] = [];
  walk(main, (node) => {
    if (!['p', 'li'].includes(node.tagName ?? '')) return;
    const value = textContent(node).replace(/\s+/g, ' ').trim();
    if (value.length >= 40 && !candidates.includes(value)) candidates.push(value);
  });
  const selected = candidates[0];
  if (!selected) return undefined;
  if (selected.length <= 600) return selected;
  const shortened = selected.slice(0, 597);
  return `${shortened.slice(0, shortened.lastIndexOf(' ')) || shortened}…`;
}

function rehabilitateDuplicateInnerPages(
  pages: Map<string, string>,
  niche: string,
  issues: RepairIssue[],
  transformations: Transformation[],
): void {
  const groups = new Map<string, string[]>();
  for (const [page, html] of pages) {
    const hash = sha256(html);
    const group = groups.get(hash) ?? [];
    group.push(page);
    groups.set(hash, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const preservationOrder: Readonly<Record<LegacyRole, number>> = {
      services: 0, about: 1, resources: 2, blends: 3, events: 4, membership: 5, results: 6, shop: 7,
      pricing: 8, booking: 9, gallery: 10, location: 11, faq: 12, press: 13, accessibility: 14,
      privacy: 15, terms: 16, contact: 17, other: 18, home: 19,
    };
    const preserveOn = [...group]
      .filter((page) => detectPageRole(page) !== 'home')
      .sort((left, right) => {
        const roleDifference = preservationOrder[normalizedRole(detectPageRole(left))] - preservationOrder[normalizedRole(detectPageRole(right))];
        return roleDifference || left.localeCompare(right);
      })[0];
    const sourceExcerpt = extractRoleSourceExcerpt(pages.get(group[0]!)!);
    for (const page of group.sort()) {
      const role = detectPageRole(page);
      if (role === 'home') continue;
      pages.set(page, adaptLegacyPageShell(pages.get(page)!, role, niche, page === preserveOn ? sourceExcerpt : undefined));
      issues.push({
        code: 'duplicate-inner-page-role-adapted',
        severity: 'warning',
        file: page,
        message: `Replaced a byte-duplicate inner page with the vetted ${role} page adapter; the immutable source remains archived.`,
        resolved: true,
      });
      transformations.push({
        rule: 'adapt-duplicate-inner-page',
        file: page,
        count: 1,
        detail: `${role}${page === preserveOn && sourceExcerpt ? ':source-copy-preserved' : ''}`,
      });
    }
  }
}

function cssEscapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
}

function sourceHash(files: ReadonlyMap<string, string | Uint8Array>): string {
  return sha256([...files.entries()]
    .map(([path, value]) => `${normalizePath(path)}\0${sha256(value)}`)
    .sort()
    .join('\n'));
}

function artifactHash(files: ReadonlyMap<string, string | Uint8Array>): string {
  return sourceHash(files);
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function separatePageContent(pages: Readonly<Record<string, string>>): SeparatedContent {
  const designPages: Record<string, string> = {};
  const entries: ContentEntry[] = [];
  const images: ImageEntry[] = [];

  for (const page of Object.keys(pages).sort()) {
    const document = parse(pages[page]!) as unknown as HtmlNode;
    // Replace image sources first. A later text slot may own an ancestor's
    // inner HTML; capturing it after this pass preserves the nested image
    // placeholder so composition can apply both edits independently.
    walk(document, (node) => {
      const imageId = getAttr(node, 'data-dc-image-id');
      if (!imageId) return;
      const src = getAttr(node, 'src');
      const srcset = getAttr(node, 'srcset');
      if (src || srcset) {
        const attribute = src ? 'src' as const : 'srcset' as const;
        images.push({
          slotId: imageId,
          page,
          kind: 'image',
          source: src ?? srcset!,
          attribute,
          ...(src && srcset ? { srcset } : {}),
        });
      }
      if (src) {
        setAttr(node, 'src', `__DC_IMAGE_${imageId}__`);
      }
      if (srcset) {
        setAttr(node, 'srcset', `__DC_SRCSET_${imageId}__`);
      }
      const style = getAttr(node, 'style');
      if (style && /background(?:-image)?\s*:[^;]*url\(/i.test(style)) {
        let index = 0;
        const replaced = style.replace(BACKGROUND_URL_RE, (_full, _quote, url: string) => {
          const slotId = index === 0 ? imageId : `${imageId}_background_${index}`;
          index += 1;
          images.push({ slotId, page, kind: 'background', source: url.trim(), attribute: 'style' });
          return `url("__DC_IMAGE_${slotId}__")`;
        });
        setAttr(node, 'style', replaced);
      }
    });

    // Attribute slots do not remove descendants, so placeholder them before
    // capturing an ancestor's inner HTML. This makes nested alt/title edits
    // independently composable instead of baking them into the parent copy.
    walk(document, (node) => {
      const editId = getAttr(node, 'data-dc-edit-id');
      const attribute = getAttr(node, 'data-dc-edit-attribute') as ContentEntry['attribute'] | undefined;
      if (!editId || !attribute) return;
      const attributeValue = getAttr(node, attribute) ?? '';
      entries.push({ nodeId: editId, page, html: attributeValue, text: attributeValue, attribute });
      setAttr(node, attribute, `__DC_TEXT_${editId}__`);
    });

    const visibleSlots: Array<{ node: HtmlNode; nodeId: string }> = [];
    walk(document, (node) => {
      const editId = getAttr(node, 'data-dc-edit-id');
      if (!editId || getAttr(node, 'data-dc-edit-attribute')) return;
      entries.push({
        nodeId: editId,
        page,
        html: innerHtml(node),
        text: textContent(node).replace(/\s+/g, ' ').trim(),
      });
      visibleSlots.push({ node, nodeId: editId });
    });
    for (const slot of visibleSlots) replaceChildrenWithComment(slot.node, `dc-content:${slot.nodeId}`);
    designPages[page] = serialize(document as never);
  }
  return { pages: designPages, entries, images };
}

function separateTheme(
  styles: Readonly<Record<string, string>>,
  previousPreset?: ThemePreset,
  editableCssBackgroundPages: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>(),
): SeparatedTheme {
  const designStyles: Record<string, string> = {};
  const tokens: ThemeToken[] = [];
  const fontImports = new Set<string>();
  const images: ImageEntry[] = [];
  const corrections: Transformation[] = [];
  const previousTokens = new Map(previousPreset?.tokens.map((token) => [token.id, token]) ?? []);

  for (const file of Object.keys(styles).sort()) {
    let root;
    try {
      root = postcss.parse(styles[file]!, { from: file });
    } catch {
      // CSS boundary whitespace has no rendering semantics, but retaining it
      // makes a repaired artifact grow a leading newline each time its
      // generated theme header is extracted and reapplied. Canonicalize only
      // that inert boundary so repair stays byte-idempotent without rewriting
      // author formatting inside rules or values.
      designStyles[file] = styles[file]!.trim();
      continue;
    }
    const priorTheme = new Map<string, string>();
    root.walkDecls(/^--dc-theme-/, (declaration) => {
      priorTheme.set(declaration.prop, declaration.value);
      declaration.remove();
    });
    root.walkRules((rule) => {
      if (!rule.nodes?.length) rule.remove();
    });
    if (priorTheme.size) {
      root.walkDecls((declaration) => {
        declaration.value = declaration.value.replace(/var\((--dc-theme-[A-Za-z0-9_-]+)\)/g, (full, property: string) => priorTheme.get(property) ?? full);
      });
    }
    const textColorProperties = new Set<string>();
    root.walkDecls(/^color$/i, (declaration) => {
      for (const match of declaration.value.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
        textColorProperties.add(match[1]!);
      }
    });
    let correctedTextColors = 0;
    let declarationIndex = 0;
    let backgroundImageIndex = 0;
    root.walkAtRules('import', (rule) => {
      if (/fonts\.(?:googleapis|gstatic)\.com/i.test(rule.params)) {
        fontImports.add(`@import ${rule.params};`);
        rule.remove();
      }
    });
    root.walkDecls((declaration) => {
      const currentDeclaration = declarationIndex++;
      if (/^font(?:-.+)?$/i.test(declaration.prop)) {
        const id = `font_${sha256(`${file}:${currentDeclaration}:${declaration.prop.toLowerCase()}`).slice(0, 14)}`;
        tokens.push({ id, kind: 'font', value: declaration.value });
        declaration.value = `var(--dc-theme-${id})`;
        return;
      }

      let colorIndex = 0;
      declaration.value = declaration.value.replace(COLOR_RE, (value) => {
        const id = `color_${sha256(`${file}:${currentDeclaration}:color:${colorIndex++}`).slice(0, 14)}`;
        const previous = previousTokens.get(id);
        const safeValue = previous?.value ?? (
          /^color$/i.test(declaration.prop) || textColorProperties.has(declaration.prop)
            ? normalizeAccessibleTextColor(value)
            : value
        );
        if (safeValue !== value) correctedTextColors += 1;
        tokens.push({
          id,
          kind: 'color',
          value: safeValue,
          ...(previous?.original ? { original: previous.original } : safeValue !== value ? { original: value } : {}),
        });
        return `var(--dc-theme-${id})`;
      });

      if (/^background(?:-image)?$/i.test(declaration.prop)) {
        declaration.value = declaration.value.replace(BACKGROUND_URL_RE, (_full, _quote, url: string) => {
          const source = url.trim();
          if (!source || /^data:image/i.test(source)) return _full;
          const id = cssBackgroundSlotId(file, backgroundImageIndex++);
          const targetPages = editableCssBackgroundPages.get(id);
          if (!targetPages?.length) return _full;
          for (const page of targetPages) {
            images.push({
              slotId: id,
              page,
              kind: 'background',
              source,
              stylesheet: file,
              selector: declaration.parent?.type === 'rule' ? declaration.parent.selector : undefined,
              attribute: 'css-url',
            });
          }
          return `url("__DC_IMAGE_${id}__")`;
        });
      }
    });
    if (correctedTextColors > 0) {
      corrections.push({
        rule: 'normalize-text-color-contrast',
        file,
        count: correctedTextColors,
        detail: 'Moved mid-tone text colors toward an accessible luminance while preserving the original value in the theme preset.',
      });
    }
    designStyles[file] = root.toString().trim();
  }
  return { styles: designStyles, tokens, fontImports: [...fontImports].sort(), images, corrections };
}

export function applyContentPreset(
  designPages: Readonly<Record<string, string>>,
  preset: ContentPreset,
): Record<string, string> {
  const byPage = new Map<string, ContentEntry[]>();
  for (const entry of preset.entries) {
    const list = byPage.get(entry.page) ?? [];
    list.push(entry);
    byPage.set(entry.page, list);
  }
  const output: Record<string, string> = {};
  for (const page of Object.keys(designPages).sort()) {
    const document = parse(designPages[page]!) as unknown as HtmlNode;
    const entries = new Map((byPage.get(page) ?? []).map((entry) => [entry.nodeId, entry]));
    walk(document, (node) => {
      const id = getAttr(node, 'data-dc-edit-id');
      const entry = id ? entries.get(id) : undefined;
      if (entry?.attribute) setAttr(node, entry.attribute, entry.html);
      else if (entry) restoreChildren(node, entry.html);
      const imageId = getAttr(node, 'data-dc-image-id');
      if (!imageId) return;
      for (const image of preset.images.filter((item) => item.page === page && item.slotId === imageId)) {
        if (image.attribute === 'src') setAttr(node, 'src', image.source);
        else if (image.attribute === 'srcset') setAttr(node, 'srcset', image.source);
        else if (image.attribute === 'style') {
          const style = getAttr(node, 'style') ?? '';
          setAttr(node, 'style', style.replace(`__DC_IMAGE_${image.slotId}__`, image.source));
        }
        if (image.srcset !== undefined) setAttr(node, 'srcset', image.srcset);
      }
    });
    output[page] = serialize(document as never);
  }
  return output;
}

export function applyThemePreset(
  designStyles: Readonly<Record<string, string>>,
  preset: ThemePreset,
  images: readonly ImageEntry[] = [],
): Record<string, string> {
  assertSafeThemePresetValues(preset);
  const tokens = new Map(preset.tokens.map((token) => [token.id, token]));
  const output: Record<string, string> = {};
  for (const file of Object.keys(designStyles).sort()) {
    let css = designStyles[file]!;
    const stylesheetImages = new Map<string, string>();
    for (const image of images.filter((item) => (item.stylesheet ?? item.page) === file && item.attribute === 'css-url')) {
      const previous = stylesheetImages.get(image.slotId);
      if (previous !== undefined && previous !== image.source) {
        throw new Error(`Conflicting baseline sources for CSS background slot ${image.slotId} in ${file}`);
      }
      stylesheetImages.set(image.slotId, image.source);
    }
    for (const [slotId, source] of stylesheetImages) {
      css = css.split(`__DC_IMAGE_${slotId}__`).join(cssEscapeString(source));
    }
    // A template may externalize one stylesheet per legacy page. Prefix only
    // the variables referenced by this file instead of copying the complete
    // template-wide theme into every stylesheet (an otherwise quadratic size
    // expansion for large multi-page templates).
    const referencedTokenIds = [...css.matchAll(/var\(--dc-theme-([A-Za-z0-9_-]+)/g)]
      .map((match) => match[1]!);
    const declarations = [...new Set(referencedTokenIds)]
      .map((id) => tokens.get(id))
      .filter((token): token is ThemeToken => Boolean(token))
      .map((token) => `--dc-theme-${token.id}:${token.value};`)
      .join('');
    const themeHeader = `${preset.fontImports.join('\n')}\n${declarations ? `:root{${declarations}}\n` : ''}`;
    output[file] = `${themeHeader}${css}`;
  }
  return output;
}

function mergeFields(results: readonly CanonicalField[][]): CanonicalField[] {
  const fields = new Map<string, CanonicalField>();
  for (const result of results) {
    for (const field of result) {
      const current = fields.get(field.name);
      fields.set(field.name, current?.default && !field.default ? current : field);
    }
  }
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function removeAttr(node: HtmlNode, name: string): void {
  if (node.attrs) node.attrs = node.attrs.filter((attr) => attr.name.toLowerCase() !== name);
}

function localTarget(owner: string, reference: string): string | undefined {
  if (!reference || /^(?:https?:|data:|blob:|mailto:|tel:|#|\{\{)/i.test(reference)) return undefined;
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean) return undefined;
  let decoded: string;
  try { decoded = decodeURIComponent(clean); } catch { return '__invalid__'; }
  return reference.startsWith('/')
    ? posix.normalize(decoded.replace(/^\/+/, ''))
    : posix.normalize(posix.join(posix.dirname(owner), decoded));
}

function hasUnsafeEmbeddedReference(html: string): boolean {
  let unsafe = false;
  const document = parse(html) as unknown as HtmlNode;
  walk(document, (node) => {
    if (unsafe || !node.tagName) return;
    for (const attr of node.attrs ?? []) {
      const name = attr.name.toLowerCase();
      if (['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
        && isUnsafeStaticUrl(node.tagName, name, attr.value)) {
        unsafe = true;
        return;
      }
      if (name === 'srcset' && containsUnsafeSrcset(attr.value)) {
        unsafe = true;
        return;
      }
      if (name === 'style' && containsUnsafeCssReferences(attr.value)) {
        unsafe = true;
        return;
      }
    }
    if (node.tagName === 'style' && containsUnsafeCssReferences(textContent(node))) unsafe = true;
  });
  return unsafe;
}

function importedStylesheetReference(params: string): string | undefined {
  return params.match(/^(?:url\()?\s*(['"]?)(.*?)\1\s*\)?(?:\s+.*)?$/i)?.[2]?.trim() || undefined;
}

function linkedStylesheets(
  page: string,
  html: string,
  styles: Readonly<Record<string, string>>,
): Set<string> {
  const stylesByLowerPath = new Map(Object.keys(styles).map((path) => [normalizePath(path).toLowerCase(), path]));
  const linked = new Set<string>();
  const pending: string[] = [];
  const addReference = (owner: string, reference: string | undefined): void => {
    const target = reference ? localTarget(owner, reference) : undefined;
    const actual = target ? stylesByLowerPath.get(normalizePath(target).toLowerCase()) : undefined;
    if (!actual || linked.has(actual)) return;
    linked.add(actual);
    pending.push(actual);
  };

  const document = parse(html) as unknown as HtmlNode;
  walk(document, (node) => {
    if (node.tagName === 'link') {
      const rel = (getAttr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
      if (rel.includes('stylesheet')) addReference(page, getAttr(node, 'href'));
      return;
    }
    if (node.tagName !== 'style') return;
    try {
      const root = postcss.parse(textContent(node), { from: page });
      root.walkAtRules('import', (rule) => addReference(page, importedStylesheetReference(rule.params)));
    } catch {
      // A malformed inline stylesheet cannot safely establish applicability.
    }
  });

  while (pending.length > 0) {
    const stylesheet = pending.pop()!;
    try {
      const root = postcss.parse(styles[stylesheet]!, { from: stylesheet });
      root.walkAtRules('import', (rule) => addReference(stylesheet, importedStylesheetReference(rule.params)));
    } catch {
      // repairStylesheet already records malformed CSS; keep this resolver closed.
    }
  }
  return linked;
}

interface CssBackgroundBindingResult {
  boundSlotIds: Set<string>;
  pagesBySlot: Map<string, readonly string[]>;
  imageIds: string[];
  boundTargets: number;
  unsupportedSlots: number;
  multipleMatchSlots: number;
  conflictingSlots: number;
  unmatchedSlots: number;
}

/**
 * Bind a CSS image slot only when every applicable static selector resolves to
 * at most one real element per page and no element is claimed by two slots.
 * Unbound CSS keeps its literal URL in the design and is never advertised as
 * editable. A shared stylesheet may reuse one slot ID across pages because
 * persisted image swaps are page-scoped.
 */
function bindCssBackgroundTargets(
  pages: Record<string, string>,
  styles: Readonly<Record<string, string>>,
  backgrounds: readonly BackgroundSelector[],
): CssBackgroundBindingResult {
  const documents = new Map<string, HtmlNode>();
  const applicable = new Map<string, Set<string>>();
  for (const [page, html] of Object.entries(pages)) {
    const document = parse(html) as unknown as HtmlNode;
    // Remove IDs emitted by the former last-compound heuristic before proving
    // the target again. Native image and inline-background IDs are retained.
    walk(document, (node) => {
      const existing = getAttr(node, 'data-dc-image-id');
      const inlineBackground = /background(?:-image)?\s*:[^;]*url\(/i.test(getAttr(node, 'style') ?? '');
      if (
        existing && /^(?:css|img)_[a-f0-9]{18}$/.test(existing) &&
        !['img', 'source'].includes(node.tagName ?? '') && !inlineBackground
      ) removeAttr(node, 'data-dc-image-id');
    });
    documents.set(page, document);
    applicable.set(page, linkedStylesheets(page, serialize(document as never), styles));
  }

  const bySlot = new Map<string, BackgroundSelector[]>();
  for (const background of backgrounds) {
    const entries = bySlot.get(background.slotId) ?? [];
    entries.push(background);
    bySlot.set(background.slotId, entries);
  }

  const unsafe = new Set<string>();
  const unsupported = new Set<string>();
  const multiple = new Set<string>();
  const conflicts = new Set<string>();
  const targetsBySlot = new Map<string, Array<{ page: string; node: HtmlNode }>>();
  for (const [slotId, entries] of bySlot) {
    const stylesheet = entries[0]!.stylesheet;
    if (entries.some((entry) => entry.stylesheet !== stylesheet)) {
      unsafe.add(slotId);
      conflicts.add(slotId);
      continue;
    }
    const targets: Array<{ page: string; node: HtmlNode }> = [];
    for (const [page, document] of documents) {
      if (!applicable.get(page)?.has(stylesheet)) continue;
      const pageTargets = new Set<HtmlNode>();
      for (const entry of entries) {
        const matches = resolveStaticSelectorTargets(document, entry.selector);
        if (!matches) {
          unsafe.add(slotId);
          unsupported.add(slotId);
          break;
        }
        for (const match of matches) pageTargets.add(match);
      }
      if (unsafe.has(slotId)) break;
      if (pageTargets.size > 1) {
        unsafe.add(slotId);
        multiple.add(slotId);
        break;
      }
      const target = [...pageTargets][0];
      if (target) targets.push({ page, node: target });
    }
    targetsBySlot.set(slotId, targets);
  }

  const slotsByNode = new Map<HtmlNode, Set<string>>();
  for (const [slotId, targets] of targetsBySlot) {
    if (unsafe.has(slotId)) continue;
    for (const { node } of targets) {
      const existing = getAttr(node, 'data-dc-image-id');
      const inlineBackground = /background(?:-image)?\s*:[^;]*url\(/i.test(getAttr(node, 'style') ?? '');
      if (existing || ['img', 'source'].includes(node.tagName ?? '') || inlineBackground) {
        unsafe.add(slotId);
        conflicts.add(slotId);
        continue;
      }
      const slots = slotsByNode.get(node) ?? new Set<string>();
      slots.add(slotId);
      slotsByNode.set(node, slots);
    }
  }
  for (const slots of slotsByNode.values()) {
    const safe = [...slots].filter((slotId) => !unsafe.has(slotId));
    if (safe.length < 2) continue;
    for (const slotId of safe) {
      unsafe.add(slotId);
      conflicts.add(slotId);
    }
  }

  const boundSlotIds = new Set<string>();
  const pagesBySlot = new Map<string, readonly string[]>();
  const imageIds: string[] = [];
  let boundTargets = 0;
  const changedPages = new Set<string>();
  for (const [slotId, targets] of targetsBySlot) {
    if (unsafe.has(slotId) || targets.length === 0) continue;
    boundSlotIds.add(slotId);
    pagesBySlot.set(slotId, targets.map(({ page }) => page).sort());
    for (const { page, node } of targets) {
      setAttr(node, 'data-dc-image-id', slotId);
      imageIds.push(slotId);
      boundTargets += 1;
      changedPages.add(page);
    }
  }
  for (const page of changedPages) pages[page] = serialize(documents.get(page)! as never);

  return {
    boundSlotIds,
    pagesBySlot,
    imageIds,
    boundTargets,
    unsupportedSlots: unsupported.size,
    multipleMatchSlots: multiple.size,
    conflictingSlots: conflicts.size,
    unmatchedSlots: [...bySlot.keys()].filter((slotId) => !unsafe.has(slotId) && (targetsBySlot.get(slotId)?.length ?? 0) === 0).length,
  };
}

function relativeReference(owner: string, target: string): string {
  return posix.relative(posix.dirname(owner), target) || posix.basename(target);
}

function collectPageFragments(pages: Readonly<Record<string, string>>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [page, html] of Object.entries(pages)) {
    const fragments = new Set<string>();
    const document = parse(html) as unknown as HtmlNode;
    walk(document, (node) => {
      const id = getAttr(node, 'id');
      if (id) fragments.add(id);
      if (node.tagName === 'a') {
        const name = getAttr(node, 'name');
        if (name) fragments.add(name);
      }
    });
    result.set(normalizePath(page).toLowerCase(), fragments);
  }
  return result;
}

function repairLocalReferences(
  pages: Record<string, string>,
  styles: Record<string, string>,
  sourcePaths: readonly string[],
  issues: RepairIssue[],
  transformations: Transformation[],
): void {
  const known = new Map<string, string>();
  for (const path of [...sourcePaths, ...Object.keys(pages), ...Object.keys(styles), COMPATIBILITY_SCRIPT_PATH, REPAIR_STYLESHEET_PATH, REPAIR_IMAGE_PATH]) {
    known.set(normalizePath(path).toLowerCase(), normalizePath(path));
  }
  const pageFragments = collectPageFragments(pages);
  for (const page of Object.keys(pages).sort()) {
    const document = parse(pages[page]!) as unknown as HtmlNode;
    let repaired = 0;
    walk(document, (node) => {
      if (!node.tagName) return;
      const rel = (getAttr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
      // A bare `<img>` is valid enough for parse5 and the static reference
      // scanner to overlook, but browsers expose it as a completed image with
      // zero natural width. Give every meaningful image an offline fallback;
      // the existing stable image ID keeps it customer-replaceable.
      if (node.tagName === 'img' && getAttr(node, 'src') === undefined) {
        setAttr(node, 'src', relativeReference(page, REPAIR_IMAGE_PATH));
        repaired += 1;
        issues.push({
          code: 'empty-image-reference-repaired',
          severity: 'warning',
          file: page,
          message: 'Added the local editable placeholder to an image with no source.',
          resolved: true,
        });
      }
      for (const name of ['src', 'poster', 'href', 'action', 'formaction', 'xlink:href'] as const) {
        const value = getAttr(node, name);
        if (value === undefined) continue;
        const visualReference = (node.tagName === 'img' || node.tagName === 'source' || name === 'poster')
          && (name === 'src' || name === 'poster');
        if (isUnsafeStaticUrl(node.tagName, name, value)) {
          if (visualReference) setAttr(node, name, relativeReference(page, REPAIR_IMAGE_PATH));
          else if (node.tagName === 'link' && rel.includes('stylesheet')) setAttr(node, name, relativeReference(page, REPAIR_STYLESHEET_PATH));
          else if (node.tagName === 'a' && name === 'href') setAttr(node, name, '#');
          else removeAttr(node, name);
          repaired += 1;
          issues.push({ code: 'unsafe-embedded-reference-repaired', severity: 'warning', file: page, message: `Removed an unsafe embedded ${name} URL.`, resolved: true });
          continue;
        }
        if (visualReference && (!value.trim() || value.trim() === '#')) {
          setAttr(node, name, relativeReference(page, REPAIR_IMAGE_PATH));
          repaired += 1;
          issues.push({ code: 'empty-image-reference-repaired', severity: 'warning', file: page, message: 'Replaced an empty or fragment-only image reference with the local editable placeholder.', resolved: true });
          continue;
        }
        if (!value) continue;
        const target = localTarget(page, value);
        if (!target) continue;
        const actual = known.get(target.toLowerCase());
        if (actual) {
          const suffix = value.slice((value.split(/[?#]/, 1)[0] ?? '').length);
          const corrected = `${relativeReference(page, actual)}${suffix}`;
          if (corrected !== value) {
            setAttr(node, name, corrected);
            repaired += 1;
          }
          continue;
        }
        if (node.tagName === 'img' || node.tagName === 'source' || name === 'poster') {
          setAttr(node, name, relativeReference(page, REPAIR_IMAGE_PATH));
        } else if (node.tagName === 'link' && rel.includes('stylesheet')) {
          setAttr(node, name, relativeReference(page, REPAIR_STYLESHEET_PATH));
        } else if (node.tagName === 'a' && name === 'href') {
          setAttr(node, name, '#');
        } else if (name === 'action' || name === 'formaction') {
          // The audited compatibility runtime handles rehabilitated form
          // submissions. Remove only missing legacy endpoints; valid local
          // endpoints and personalization tokens remain intact.
          removeAttr(node, name);
        } else {
          removeAttr(node, name);
        }
        repaired += 1;
        issues.push({ code: 'missing-local-reference-repaired', severity: 'warning', file: page, message: `Replaced unresolved local reference ${value}.`, resolved: true });
      }
      const srcset = getAttr(node, 'srcset');
      if (srcset) {
        if (containsUnsafeSrcset(srcset)) {
          if (node.tagName === 'img' || node.tagName === 'source') setAttr(node, 'srcset', relativeReference(page, REPAIR_IMAGE_PATH));
          else removeAttr(node, 'srcset');
          repaired += 1;
          issues.push({ code: 'unsafe-srcset-repaired', severity: 'warning', file: page, message: 'Replaced an unsafe embedded image candidate set with the local editable placeholder.', resolved: true });
          return;
        }
        const candidates = srcset.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0]!).filter(Boolean);
        if (candidates.some((candidate) => candidate === '#' || !candidate || (() => {
          const target = localTarget(page, candidate);
          return target && !known.has(target.toLowerCase());
        })())) {
          if (node.tagName === 'img' || node.tagName === 'source') {
            setAttr(node, 'srcset', relativeReference(page, REPAIR_IMAGE_PATH));
          } else {
            removeAttr(node, 'srcset');
          }
          repaired += 1;
          issues.push({ code: 'invalid-srcset-repaired', severity: 'warning', file: page, message: 'Replaced an unresolved image candidate set with the local editable placeholder.', resolved: true });
        }
      }
    });
    walk(document, (node) => {
      if (node.tagName !== 'a') return;
      const href = getAttr(node, 'href');
      const hashIndex = href?.indexOf('#') ?? -1;
      if (!href || hashIndex < 0 || /^(?:https?:|mailto:|tel:|data:|blob:|\{\{)/i.test(href)) return;
      const encodedFragment = href.slice(hashIndex + 1);
      if (!encodedFragment) return;
      let fragment: string;
      try {
        fragment = decodeURIComponent(encodedFragment);
      } catch {
        fragment = '__invalid_fragment__';
      }
      const beforeHash = href.slice(0, hashIndex);
      const rawPath = beforeHash.split('?', 1)[0] ?? '';
      const query = beforeHash.slice(rawPath.length);
      const target = rawPath ? localTarget(page, rawPath) : normalizePath(page);
      const actual = target ? known.get(target.toLowerCase()) : undefined;
      const fragments = actual ? pageFragments.get(actual.toLowerCase()) : undefined;
      if (!fragments || fragments.has(fragment)) return;
      setAttr(node, 'href', rawPath && actual ? `${relativeReference(page, actual)}${query}` : '#');
      repaired += 1;
      issues.push({
        code: 'missing-fragment-reference-repaired',
        severity: 'warning',
        file: page,
        message: `Removed unresolved fragment #${encodedFragment} from ${href}.`,
        resolved: true,
      });
    });
    let hasRepairStylesheet = false;
    walk(document, (node) => {
      if (node.tagName !== 'link') return;
      const rel = (getAttr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
      const href = getAttr(node, 'href');
      if (!rel.includes('stylesheet') || !href) return;
      const target = localTarget(page, href);
      if (target?.toLowerCase() === REPAIR_STYLESHEET_PATH.toLowerCase()) hasRepairStylesheet = true;
    });
    // The audited guard stylesheet must load after the source stylesheet. It
    // provides responsive containment and form accessibility without
    // replacing the legacy visual design.
    if (!hasRepairStylesheet) {
      const head = (() => {
        let value: HtmlNode | undefined;
        walk(document, (node) => { if (!value && node.tagName === 'head') value = node; });
        return value;
      })();
      if (head) {
        const fragment = parseFragment(`<link rel="stylesheet" href="${relativeReference(page, REPAIR_STYLESHEET_PATH)}" data-dc-repair-style="true">`) as unknown as HtmlNode;
        head.childNodes ??= [];
        for (const child of fragment.childNodes ?? []) {
          child.parentNode = head;
          head.childNodes.push(child);
        }
        repaired += 1;
      }
    }
    if (repaired) {
      pages[page] = serialize(document as never);
      transformations.push({ rule: 'repair-local-references', file: page, count: repaired });
    }
  }

  for (const file of Object.keys(styles).sort()) {
    let root;
    try { root = postcss.parse(styles[file]!, { from: file }); } catch { continue; }
    let repaired = 0;
    root.walkDecls((declaration) => {
      declaration.value = declaration.value.replace(BACKGROUND_URL_RE, (full, _quote, value: string) => {
        const target = localTarget(file, value.trim());
        if (!target) return full;
        const actual = known.get(target.toLowerCase());
        if (actual) {
          const corrected = `url("${relativeReference(file, actual)}")`;
          if (corrected !== full) repaired += 1;
          return corrected;
        }
        repaired += 1;
        issues.push({ code: 'missing-css-asset-repaired', severity: 'warning', file, message: `Replaced unresolved CSS asset ${value.trim()}.`, resolved: true });
        return `url("${relativeReference(file, REPAIR_IMAGE_PATH)}")`;
      });
    });
    root.walkAtRules('import', (rule) => {
      const match = rule.params.match(/^(?:url\()?\s*(['"]?)(.*?)\1\s*\)?(?:\s+.*)?$/i);
      const value = match?.[2]?.trim();
      const target = value ? localTarget(file, value) : undefined;
      if (!target) return;
      const actual = known.get(target.toLowerCase());
      if (actual) {
        const corrected = `url("${relativeReference(file, actual)}")`;
        if (corrected !== rule.params) repaired += 1;
        rule.params = corrected;
      }
      else {
        rule.remove();
        repaired += 1;
        issues.push({ code: 'missing-css-import-removed', severity: 'warning', file, message: `Removed unresolved CSS import ${value}.`, resolved: true });
      }
    });
    if (repaired) {
      styles[file] = root.toString();
      transformations.push({ rule: 'repair-local-references', file, count: repaired });
    }
  }
}

function externalizeInlineStyles(
  pages: Record<string, string>,
  styles: Record<string, string>,
  transformations: Transformation[],
): void {
  for (const page of Object.keys(pages).sort()) {
    const document = parse(pages[page]!) as unknown as HtmlNode;
    let index = 0;
    let changed = 0;
    walk(document, (node) => {
      if (node.tagName !== 'style') return;
      const styleIndex = index++;
      const css = textContent(node);
      // Browser-derived safety rules must stay inline. Re-externalizing this
      // block on a resumed remediation pass can make its deterministic filename
      // import itself, silently discarding the earlier rules.
      if (getAttr(node, 'id') === 'dc-a11y-contrast-overrides') return;
      if (/^\s*@import\s+url\(["']?\.dc-inline-[a-f0-9]+\.css["']?\)\s*;?\s*$/i.test(css)) return;
      // Count already-externalized style nodes as occupied positions. Without
      // that, adding a later remediation style on a second compiler pass can
      // reuse :0 and overwrite the page's original stylesheet.
      const stylesheetPath = inlineStylesheetPath(page, styleIndex);
      const filename = stylesheetPath.slice(stylesheetPath.lastIndexOf('/') + 1);
      styles[stylesheetPath] = css;
      node.childNodes = [{ nodeName: '#text', value: `@import url("${filename}");`, parentNode: node }];
      changed += 1;
    });
    if (changed) {
      pages[page] = serialize(document as never);
      transformations.push({ rule: 'externalize-inline-theme', file: page, count: changed });
    }
  }
}

function countIssueSeverities(issues: readonly RepairIssue[]): QualityReceipt['issueCounts'] {
  const counts: QualityReceipt['issueCounts'] = { info: 0, warning: 0, error: 0, critical: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}

function buildReceipt(input: {
  slug: string;
  ruleVersion: string;
  pages: Readonly<Record<string, string>>;
  fields: readonly CanonicalField[];
  issues: readonly RepairIssue[];
  editIds: readonly string[];
  imageIds: readonly string[];
  sourceHash: string;
  artifactHash: string;
}): QualityReceipt {
  const pageMap = new Map(Object.entries(input.pages));
  const contract = validateTemplateContract(pageMap, input.fields, {
    requireStandardInquiryForms: true,
  });
  const unsafeMarkup = Object.entries(input.pages).flatMap(([page, html]) => {
    const withoutRuntime = html.replace(new RegExp(`<script\\b[^>]*src=["']${COMPATIBILITY_SCRIPT_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>\\s*<\\/script>`, 'gi'), '');
    return /<\/?(?:iframe|frame|frameset|object|embed)\b|<script\b|\son[a-z]+\s*=/i.test(withoutRuntime)
      || hasUnsafeEmbeddedReference(withoutRuntime)
      ? [page]
      : [];
  });
  const runtimePages = Object.entries(input.pages).filter(([, html]) => {
    const matches = html.match(new RegExp(`<script\\b[^>]*src=["']${COMPATIBILITY_SCRIPT_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi')) ?? [];
    return matches.length === 1;
  }).length;
  const uniqueEditIds = new Set(input.editIds);
  const reportedImageIds = new Set(input.imageIds);
  const imageIdsByPage = Object.entries(input.pages).map(([page, html]) => ({
    page,
    ids: [...html.matchAll(/\bdata-dc-image-id\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]!),
  }));
  const duplicateImageIdPages = imageIdsByPage
    .filter(({ ids }) => new Set(ids).size !== ids.length)
    .map(({ page }) => page);
  const actualImageIds = new Set(imageIdsByPage.flatMap(({ ids }) => ids));
  const unreportedImageIds = [...actualImageIds].filter((id) => !reportedImageIds.has(id));
  const blockingIssues = input.issues.filter((issue) => !issue.resolved && (issue.severity === 'error' || issue.severity === 'critical'));
  const checks: QualityCheck[] = [
    { code: 'publication-contract', pass: contract.pass, detail: contract.pass ? `${contract.tokens.length} supported personalization tokens` : contract.errors.join('; ') },
    { code: 'active-content-safety', pass: unsafeMarkup.length === 0, detail: unsafeMarkup.length ? `Unsafe active markup remains in ${unsafeMarkup.join(', ')}` : 'Only the audited local compatibility runtime remains' },
    { code: 'compatibility-runtime', pass: runtimePages === Object.keys(input.pages).length, detail: `${runtimePages}/${Object.keys(input.pages).length} pages install exactly one runtime` },
    { code: 'stable-edit-ids', pass: input.editIds.length > 0 && uniqueEditIds.size === input.editIds.length, detail: `${uniqueEditIds.size} unique editable text IDs` },
    {
      code: 'stable-image-ids',
      pass: duplicateImageIdPages.length === 0 && unreportedImageIds.length === 0,
      detail: duplicateImageIdPages.length
        ? `Duplicate image IDs within ${duplicateImageIdPages.join(', ')}`
        : unreportedImageIds.length
          ? `Unreported image IDs: ${unreportedImageIds.join(', ')}`
          : `${actualImageIds.size} stable page-scoped image IDs`,
    },
    { code: 'resolved-blockers', pass: blockingIssues.length === 0, detail: blockingIssues.length ? blockingIssues.map((issue) => issue.code).join(', ') : 'No unresolved deterministic blockers' },
  ];
  const failed = checks.some((check) => !check.pass);
  const review = !failed && input.issues.some((issue) => !issue.resolved && issue.severity === 'warning');
  const receiptBase = {
    legacySlug: input.slug,
    ruleVersion: input.ruleVersion,
    status: failed ? 'failed' as const : review ? 'review' as const : 'passed' as const,
    checks,
    issueCounts: countIssueSeverities(input.issues),
    sourceHash: input.sourceHash,
    artifactHash: input.artifactHash,
  };
  return { id: `receipt_${sha256(stableStringify(receiptBase)).slice(0, 24)}`, ...receiptBase };
}

/**
 * Deterministically repairs one immutable legacy source tree and emits a v3
 * design/content/theme composition. No filesystem reads or writes occur here.
 */
export function repairLegacyTemplate(input: LegacyTemplateInput & { homepageDonor?: HomepageDonor }): RepairResult {
  const files = new Map<string, string | Uint8Array>();
  for (const [path, value] of input.files) files.set(normalizePath(path), value);
  const rawManifest = input.manifest ?? parseJson(files.get('template.json')) ?? {};
  const rawFields = input.fields ?? parseJson(files.get('fields.json')) ?? {};
  const previousThemePreset = readPreviousThemePreset(files.get('.dailyclarity/theme-preset.json'), input.slug);
  const normalizedFields = normalizeFields(rawFields);
  const issues: RepairIssue[] = [];
  const transformations: Transformation[] = [];

  const htmlSources = new Map([...files.entries()]
    .filter(([path, value]) => /\.html?$/i.test(path) && (typeof value === 'string' || value instanceof Uint8Array))
    .map(([path, value]) => [path, decode(value)]));
  rehabilitateDuplicateInnerPages(htmlSources, input.niche, issues, transformations);
  if (!htmlSources.has('index.html') && htmlSources.size > 0) {
    const fallback = [...htmlSources.entries()].sort(([a], [b]) => a.localeCompare(b))[0]!;
    const donor = input.homepageDonor;
    if (donor && (donor.niche !== input.niche || donor.legacySlug === input.slug || sha256(donor.html) !== donor.contentHash)) {
      throw new Error(`Invalid homepage donor for ${input.niche}/${input.slug}`);
    }
    const shell = donor?.html ?? fallback[1];
    htmlSources.set('index.html', adaptLegacyPageShell(shell, 'home', input.niche, extractRoleSourceExcerpt(fallback[1])));
    const source = donor ? `${donor.niche}/${donor.legacySlug}/index.html` : fallback[0];
    const strategy = donor ? 'nearest safe same-niche design' : 'same-template page fallback';
    issues.push({ code: 'homepage-reconstructed', severity: 'warning', file: 'index.html', message: `Reconstructed the missing homepage from the ${strategy} (${source}) with the vetted home adapter; the immutable original remains archived.`, resolved: true });
    transformations.push({
      rule: 'reconstruct-missing-homepage',
      file: 'index.html',
      count: 1,
      detail: donor
        ? `${source}:home-role-adapter;donorTree=${donor.sourceTreeHash};donorPage=${donor.contentHash};score=${donor.selectionScore}`
        : `${source}:home-role-adapter`,
    });
  }
  if (htmlSources.size === 0) {
    const neutral = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Ask about current services and availability.</p><a href="mailto:{{EMAIL}}">Get in touch</a></main></body></html>';
    htmlSources.set('index.html', neutral);
    issues.push({ code: 'neutral-homepage-created', severity: 'warning', file: 'index.html', message: 'The source contained no HTML; emitted a vetted neutral homepage for mandatory human review.', resolved: true });
    transformations.push({ rule: 'create-neutral-homepage', file: 'index.html', count: 1 });
  }

  const pageNames = [...htmlSources.keys()].sort();
  const foundation = [...htmlSources.values()].map(detectFoundation).find(Boolean);
  const manifest = canonicalizeManifest(rawManifest, { slug: input.slug, niche: input.niche, pages: pageNames, ...(foundation ? { foundation } : {}) });

  const repairedStyles: Record<string, string> = {};
  const backgroundSelectors: BackgroundSelector[] = [];
  for (const [path, value] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // Third-party CSS has already been safety-checked, rewritten offline, and
    // content-addressed by the vendor. Keep those licensed bytes immutable;
    // only first-party template styles participate in theme extraction.
    if (!/\.css$/i.test(path) || isVendedStylesheet(path)) continue;
    const result = repairStylesheet(decode(value), path);
    repairedStyles[path] = result.css;
    backgroundSelectors.push(...result.backgrounds);
    issues.push(...result.issues);
    transformations.push(...result.transformations);
  }
  repairedStyles[REPAIR_STYLESHEET_PATH] = REPAIR_STYLESHEET;

  const repairedPages: Record<string, string> = {};
  const pageFields: CanonicalField[][] = [];
  const editIds: string[] = [];
  const imageIds: string[] = [];
  for (const [path, html] of [...htmlSources.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const result = repairPage(html, {
      file: path,
      slug: input.slug,
      niche: input.niche,
      fields: normalizedFields,
      pageNames,
      ...(foundation ? { foundation } : {}),
    });
    repairedPages[path] = result.html;
    pageFields.push(result.fields);
    editIds.push(...result.editIds);
    imageIds.push(...result.imageIds);
    backgroundSelectors.push(...result.backgroundSelectors);
    issues.push(...result.issues);
    transformations.push(...result.transformations);
  }
  externalizeInlineStyles(repairedPages, repairedStyles, transformations);
  repairLocalReferences(repairedPages, repairedStyles, [...files.keys()], issues, transformations);
  const cssBackgroundBindings = bindCssBackgroundTargets(repairedPages, repairedStyles, backgroundSelectors);
  imageIds.push(...cssBackgroundBindings.imageIds);
  if (backgroundSelectors.length > 0) {
    transformations.push({
      rule: 'bind-css-background-edit-slots',
      file: '*',
      count: cssBackgroundBindings.boundTargets,
      detail: [
        `editableSlots=${cssBackgroundBindings.boundSlotIds.size}`,
        `unsupported=${cssBackgroundBindings.unsupportedSlots}`,
        `multiple=${cssBackgroundBindings.multipleMatchSlots}`,
        `conflicts=${cssBackgroundBindings.conflictingSlots}`,
        `unmatched=${cssBackgroundBindings.unmatchedSlots}`,
      ].join(';'),
    });
  }
  const canonicalFields = mergeFields(pageFields);
  manifest.placeholders = canonicalFields.map((field) => `{{${field.name}}}`);

  const separatedContent = separatePageContent(repairedPages);
  const separatedTheme = separateTheme(repairedStyles, previousThemePreset, cssBackgroundBindings.pagesBySlot);
  transformations.push(...separatedTheme.corrections);
  const presetImages = [...separatedContent.images, ...separatedTheme.images]
    .sort((a, b) => `${a.page}:${a.slotId}`.localeCompare(`${b.page}:${b.slotId}`));
  const contentBase = { entries: separatedContent.entries, images: presetImages };
  const contentHash = sha256(stableStringify(contentBase));
  const contentPreset: ContentPreset = {
    id: `content_${contentHash.slice(0, 24)}`,
    legacySlug: input.slug,
    entries: separatedContent.entries,
    images: presetImages,
    hash: contentHash,
  };
  const themeBase = { tokens: separatedTheme.tokens, fontImports: separatedTheme.fontImports };
  const themeHash = sha256(stableStringify(themeBase));
  const themePreset: ThemePreset = {
    id: `theme_${themeHash.slice(0, 24)}`,
    legacySlug: input.slug,
    tokens: separatedTheme.tokens,
    fontImports: separatedTheme.fontImports,
    hash: themeHash,
  };

  const provisionalFingerprint = createDedupeFingerprint({
    legacySlug: input.slug,
    niche: input.niche,
    ...(foundation ? { foundation } : {}),
    pages: separatedContent.pages,
    styles: separatedTheme.styles,
    pageRoles: manifest.pageRoles,
    contentHash,
    themeHash,
  });
  const designSkeleton: Omit<CanonicalDesign, 'id'> = {
    niche: input.niche,
    ...(foundation ? { foundation } : {}),
    pages: separatedContent.pages,
    styles: separatedTheme.styles,
    pageRoles: manifest.pageRoles,
    structureHash: provisionalFingerprint.structureHash,
    domHash: provisionalFingerprint.domHash,
    cssHash: provisionalFingerprint.cssHash,
  };
  const designId = `design_${canonicalDesignHash(designSkeleton).slice(0, 24)}`;
  const design: CanonicalDesign = {
    id: designId,
    ...designSkeleton,
  };

  const emitted = new Map<string, string | Uint8Array>();
  for (const [path, value] of files) {
    if (
      /\.html?$/i.test(path)
      || (/\.css$/i.test(path) && !isVendedStylesheet(path))
      || /(?:^|\/)template\.json$/i.test(path)
      || /(?:^|\/)fields\.json$/i.test(path)
      || /\.m?js$/i.test(path)
    ) continue;
    emitted.set(path, value);
  }
  const composedPages = applyContentPreset(design.pages, contentPreset);
  const composedStyles = applyThemePreset(design.styles, themePreset, contentPreset.images);
  for (const [path, html] of Object.entries(composedPages)) emitted.set(path, html);
  for (const [path, css] of Object.entries(composedStyles)) emitted.set(path, css);
  emitted.set(COMPATIBILITY_SCRIPT_PATH, LEGACY_COMPATIBILITY_SCRIPT);
  emitted.set(REPAIR_IMAGE_PATH, REPAIR_IMAGE);
  emitted.set('fields.json', serializeJson({ contractVersion: 3, fields: canonicalFields }));

  const baseArtifactHash = artifactHash(emitted);
  const receipt = buildReceipt({
    slug: input.slug,
    ruleVersion: input.ruleVersion ?? LEGACY_REPAIR_RULE_VERSION,
    pages: composedPages,
    fields: canonicalFields,
    issues,
    editIds,
    imageIds,
    sourceHash: sourceHash(input.files),
    artifactHash: baseArtifactHash,
  });
  const catalogTemplate: CatalogTemplate = {
    legacySlug: input.slug,
    designId,
    contentPresetId: contentPreset.id,
    themePresetId: themePreset.id,
    niche: input.niche,
    qualityReceipt: receipt.id,
  };
  emitted.set('template.json', serializeJson({ ...manifest, designId, contentPresetId: contentPreset.id, themePresetId: themePreset.id, qualityReceipt: receipt.id }));
  emitted.set('.dailyclarity/catalog-v3.json', serializeJson(catalogTemplate));
  emitted.set('.dailyclarity/design.json', serializeJson(design));
  emitted.set('.dailyclarity/content-preset.json', serializeJson(contentPreset));
  emitted.set('.dailyclarity/theme-preset.json', serializeJson(themePreset));
  emitted.set('.dailyclarity/fingerprint.json', serializeJson(provisionalFingerprint));
  emitted.set('.dailyclarity/quality-receipt.json', serializeJson(receipt));

  return {
    files: emitted,
    manifest,
    fields: canonicalFields,
    design,
    contentPreset,
    themePreset,
    catalogTemplate,
    qualityReceipt: receipt,
    fingerprint: provisionalFingerprint,
    issues,
    transformations,
    editIds: [...new Set(editIds)].sort(),
    imageIds: [...new Set(imageIds)].sort(),
  };
}

export function textFileEntries(result: RepairResult): Map<string, string> {
  return new Map([...result.files.entries()]
    .filter(([path, value]) => TEXT_FILE_RE.test(path) && typeof value === 'string')
    .map(([path, value]) => [path, value as string]));
}

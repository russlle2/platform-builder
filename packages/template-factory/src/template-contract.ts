/**
 * Tokens that may intentionally survive factory assembly for customer
 * personalization. Generated editorial copy must be resolved before output.
 */
export const CORE_PERSONALIZATION_TOKENS = [
  'BUSINESS_NAME',
  'PRACTICE_NAME',
  'BRAND_NAME',
  'STUDIO_NAME',
  'PRACTITIONER_NAME',
  'OWNER_NAME',
  'COACH_NAME',
  'FACILITATOR_NAME',
  'EMAIL',
  'CONTACT_EMAIL',
  'PHONE',
  'PHONE_NUMBER',
  'CONTACT_PHONE',
  'ADDRESS',
  'STREET_ADDRESS',
  'CITY',
  'STATE',
  'TAGLINE',
  'DESCRIPTION',
  'SERVICES',
  'CTA_LABEL',
  'PRIMARY_CTA_LABEL',
  'PRIMARY_CTA_URL',
  'BOOKING_URL',
  'WEBSITE',
] as const;

export const PUBLICATION_CONTRACT_VERSION = 2;

const CORE_TOKEN_SET = new Set<string>(CORE_PERSONALIZATION_TOKENS);
const TOKEN_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const ANY_MUSTACHE_RE = /\{\{[^{}]*\}\}/g;

const IDENTITY_TOKENS = new Set([
  'BUSINESS_NAME',
  'PRACTICE_NAME',
  'BRAND_NAME',
  'STUDIO_NAME',
  'PRACTITIONER_NAME',
  'OWNER_NAME',
  'COACH_NAME',
  'FACILITATOR_NAME',
]);

const CONTACT_TOKENS = new Set([
  'EMAIL',
  'CONTACT_EMAIL',
  'PHONE',
  'PHONE_NUMBER',
  'CONTACT_PHONE',
  'PRIMARY_CTA_URL',
  'BOOKING_URL',
  'WEBSITE',
]);

const INTAKE_TOKENS = new Set([
  ...IDENTITY_TOKENS,
  ...CONTACT_TOKENS,
  'STREET_ADDRESS',
  'TAGLINE',
  'DESCRIPTION',
  'SERVICES',
  'CTA_LABEL',
  'PRIMARY_CTA_LABEL',
]);

export interface ContractField {
  name: string;
  default?: string;
}

export interface TemplateContractOptions {
  /**
   * Catalogue-v3 rehabilitation emits one audited four-field inquiry schema.
   * Keep this opt-in so the existing curated/foundation v2 assembler remains
   * backward compatible while legacy promotion fails closed.
   */
  requireStandardInquiryForms?: boolean;
}

export interface TemplateContractResult {
  pass: boolean;
  errors: string[];
  tokens: string[];
}

export function normalizeTokenName(token: string): string {
  return token.trim().toUpperCase();
}

export function isCorePersonalizationToken(token: string): boolean {
  return CORE_TOKEN_SET.has(normalizeTokenName(token));
}

export function extractTemplateTokens(html: string): string[] {
  const tokens = new Set<string>();
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(html)) !== null) {
    tokens.add(normalizeTokenName(match[1]!));
  }
  return [...tokens].sort();
}

const PERSONAL_DATA_PLACEHOLDERS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: 'placeholder email',
    pattern: /\b[A-Z0-9._%+-]+@(?:example\.(?:com|net|org)|example\.test)\b/i,
  },
  {
    label: 'placeholder practitioner name',
    pattern: /\b(?:Dr\.\s+Morgan\s+Ellis|Jane\s+Doe|John\s+Doe)\b/i,
  },
  { label: 'placeholder phone', pattern: /\(?\d{3}\)?[\s.-]*555[\s.-]*01\d{2}\b/i },
  { label: 'placeholder street address', pattern: /\b(?:Your Address|123 Main (?:St(?:reet)?|Road|Rd\.?))\b/i },
  { label: 'placeholder locality', pattern: /\bAnytown\b/i },
  { label: 'placeholder city', pattern: /\bYour City\b/i },
  { label: 'placeholder state', pattern: /\bYour State\b/i },
  {
    label: 'generated placeholder business name',
    pattern: /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/i,
  },
];

import { parse } from 'parse5';
import {
  containsUnsafeCssReferences,
  containsUnsafeSrcset,
  isUnsafeStaticUrl,
} from './legacy/url-safety.js';

/**
 * Shared semantic safety vocabulary. These expressions deliberately have no
 * global flag so they can be reused safely by both the repairer and the final
 * publication boundary without RegExp lastIndex state leaking between pages.
 */
export const SENSITIVE_FORM_TEXT_RE = /\b(?:allerg(?:y|ies|ic)|pregnan(?:t|cy)|medications?|diagnos(?:is|ed|tic)|medical history|mental[- ]health history|symptoms?|health conditions?|suicid(?:e|al)|trauma history)\b/i;
export const UNSAFE_INQUIRY_FORM_TEXT_RE = /\b(?:passwords?|passcodes?|date of birth|birth dates?|dob|social security|ssn|tax id|insurance|member id|policy number|payment|credit cards?|debit cards?|bank accounts?|routing numbers?|emergency contacts?|uploads?|medical records?|treatment history|therapy history)\b/i;
export const UNSUPPORTED_PROOF_TEXT_RE = /\b(?:proof\s*(?:(?:&|and)\s*(?:credibility|notes?|perspective)|gallery)|proof of progress|social[- ]proof|credibility\s*(?:badges?|bar|gallery|indicators?)|testimonials?|(?:client|patient) (?:success )?stor(?:y|ies)|(?:client|patient) reviews?|(?:(?:real )?client|anonymized) (?:case )?note|case note\s*\(\s*anonymized|(?:selected|short|illustrative) (?:case )?(?:vignettes?|examples?)\s*\(\s*(?:anonymized|de-identified)|what (?:our )?(?:clients?|patients?) (?:say|share)|(?:direct|rotating) voices?|voices? from (?:the )?(?:cohort|community|clients?)|trusted by|featured in|real results|success stories)\b/i;
export const UNSUPPORTED_PROOF_ATTRIBUTE_RE = /(?:^|[-_\s])(?:testimonials?|reviews?|quotes?|proof(?:[-_]?gallery)?|credibility|social[-_]?proof|success[-_]?stor(?:y|ies))(?:$|[-_\s])/i;
export const UNSUPPORTED_CREDENTIAL_PROOF_RE = /\b(?:accredit(?:ed|ation)|award(?:ed|s)?|case stud(?:y|ies)|certification|featured (?:by|in)|independently verified|member rated|partner(?:ed|ship)|peer[- ]reviewed|published|recognition|top[- ]rated|five[- ]star|verified|vetted)\b/i;
const REPORTED_CLIENT_OUTCOME = String.raw`\b(?:many\s+|some\s+|our\s+)?(?:clients?|patients?|participants?|attendees?)\s+(?:found|notice(?:d|s)?|report(?:ed|s|ing)?|experience(?:d|s)?)\b[^.!?\r\n]{0,120}\b(?:better|benefits?|calm(?:er)?|changes?|clarity|confidence|energy|enhanc\w*|focus|help\w*|improv\w*|noticeable|outcomes?|progress|recall|recovery|reduc\w*|relief|rest(?:ed)?|results?|routines?\s+that\s+stick|shifts?|sleep|wins?)\b`;
const ATTRIBUTED_INITIAL_QUOTE = String.raw`["“][^"”\r\n]{12,}["”]\s*[—-]\s*(?:[A-Z]\.){1,4}`;

/** High-confidence, generated performance/experience metrics requiring evidence. */
export const UNSUPPORTED_FABRICATED_METRIC_RE = new RegExp(
  [
    REPORTED_CLIENT_OUTCOME,
    ATTRIBUTED_INITIAL_QUOTE,
    String.raw`\b(?:client|customer|patient)\s+nps\s*:?\s*\d`,
    String.raw`\b(?:average\s+)?(?:habit|client|customer|member|patient)\s+retention\s*:?\s*\d+(?:\.\d+)?%`,
    String.raw`\brepeat\s+(?:clients?|customers?|members?|patients?)\s*:?\s*\d+(?:\.\d+)?%`,
    String.raw`\b(?:rating|rated|reviews?|nps|satisfaction)\b[^.!?\r\n]{0,40}\b\d(?:\.\d+)?\s*(?:out\s+of|\/)\s*5\b`,
    String.raw`\b\d(?:\.\d+)?\s*(?:out\s+of|\/)\s*5\b[^.!?\r\n]{0,40}\b(?:rating|rated|reviews?|nps|satisfaction)\b`,
    String.raw`\b\d[\d,.]*\+?\s+(?:coaching|clinical|facilitation|practice|teaching|training)\s+hours?\s+(?:completed|delivered|logged)\b`,
    String.raw`\b\d[\d,.]*\+?\s+(?:clients?|customers?|patients?|participants?|sessions?)\s+(?:helped|served|supported|treated|delivered)\b`,
    String.raw`\b(?:we\s+have|we[’']ve)\s+(?:helped|served|supported|treated)\s+\d[\d,.]*\+?\s+(?:clients?|customers?|patients?|participants?|people)\b`,
    String.raw`\b\d[\d,.]*\+\s+(?:clients?|consults?|customers?|patients?|participants?|sessions?|workshops?)\b`,
    String.raw`\b\d{1,3}\+\s+years?\s+(?:of\s+)?(?:experience|practice|specializing|working)\b`,
    String.raw`\b(?:many|most|the\s+majority\s+of)\s+clients?\s+(?:achiev\w*|experienc\w*|report\w*)\b[^.!?\r\n]{0,100}\b(?:measurable\s+)?(?:benefits?|improvements?|outcomes?|results?)\b[^.!?\r\n]{0,60}\b(?:after|in|within)\s+\d+\s+(?:days?|sessions?|weeks?|months?)\b`,
    String.raw`\bhelp(?:s|ed|ing)?\s+(?:a|the|our)\s+(?:client|patient)\b[^.!?\r\n]{0,120}\b(?:achieve|feel|improve|notice|reduce|recover|sleep)\w*\b`,
    String.raw`\b(?:after|across|over|within)\s+\d+\s+sessions?\b[^.!?\r\n]{0,120}\b(?:clients?|patients?|they)\s+(?:achiev\w*|experienc\w*|report\w*)\s+(?:better|improv\w*|reduc\w*|relief|recovery|results?)\b`,
    String.raw`\b(?:a|the)\s+(?:client|patient)\b[^.!?\r\n]{0,120}\b(?:after|across|over|within)\s+\d+\s+sessions?\b[^.!?\r\n]{0,120}\b(?:achiev\w*|improv\w*|reduc\w*|regain\w*|recover\w*)\b`,
  ].join('|'),
  'i',
);

const LEGACY_UNSUPPORTED_OUTCOME_CLAIM_RE = /\b(?:guarantee(?:d|s)?|promise[sd]?)\s+(?:results?|outcomes?|bookings?|revenue|growth|healing|relief)|\b(?:cure|heal|reverse|eliminate|prevent|treat)(?:s|ed|ing)?\s+(?:anxiety|depression|disease|illness|pain|symptoms?|trauma|insomnia|headaches?|stress|medical conditions?)\b/i;

/*
 * High-confidence physiological outcome claims found in the legacy corpus.
 * Keep this expression deliberately relational: a result verb must occur next
 * to a concrete health endpoint. Broad words such as "sleep", "focus",
 * "wellbeing", or "nervous system" alone are not publication failures.
 */
const HEALTH_RESULT_MODIFIERS = String.raw`(?:\s+(?:a|an|the|your|our|their|overall|healthy|normal|natural|measurable|reported|perceived|physical|mental|restorative)){0,3}`;
const CONDITION_ENDPOINT = String.raw`(?:anxiety|depression|post[- ]traumatic\s+stress(?:\s+disorder)?|ptsd|pain|headaches?|insomnia|disease|illness|symptoms?|trauma|medical\s+conditions?)`;
const PHYSIOLOGICAL_ENDPOINT = String.raw`(?:cortisol(?:\s+(?:levels?|regulation))?|(?:parasympathetic|sympathetic)\s+(?:activity|tone|response|function|nervous\s+system)|(?:autonomic\s+)?nervous\s+system(?:\s+(?:balance|regulation|function))?|neurotransmitter(?:s|\s+(?:release|levels?|activity))?|neurochemistry|(?:alpha|beta|theta|delta|gamma)\s+brain\s+waves?|neurological\s+pathways?|immune\s+(?:system|function|response|resilience|health)|immunity|sleep\s+(?:quality|efficiency|onset|latency|duration|architecture|patterns?)|cognitive\s+(?:function|performance|clarity)|memory|mental\s+sharpness|(?:muscle|tissue|cellular|nerve)\s+(?:repair|recovery|regeneration)|inflammation|inflammatory\s+responses?|nerve\s+impingement|proprioception)`;
const PHYSIOLOGICAL_ACTION = String.raw`(?:activat(?:e|es|ed|ing)|aid(?:s|ed|ing)?|balanc(?:e|es|ed|ing)|boost(?:s|ed|ing)?|calm(?:s|ed|ing)?|enhanc(?:e|es|ed|ing)|improv(?:e|es|ed|ing)|influenc(?:e|es|ed|ing)|lower(?:s|ed|ing)?|modulat(?:e|es|ed|ing)|promot(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|regulat(?:e|es|ed|ing)|reset(?:s|ting)?|restor(?:e|es|ed|ing)|stimulat(?:e|es|ed|ing)|strengthen(?:s|ed|ing)?|support(?:s|ed|ing)?|target(?:s|ed|ing)?)`;
const CONDITION_ACTION = String.raw`(?:alleviat(?:e|es|ed|ing)|cur(?:e|es|ed|ing)|eliminat(?:e|es|ed|ing)|heal(?:s|ed|ing)?|manag(?:e|es|ed|ing)|prevent(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|reliev(?:e|es|ed|ing)|revers(?:e|es|ed|ing)|treat(?:s|ed|ing)?)`;
const EMPIRICAL_HEALTH_PROOF = String.raw`(?:research\s+(?:shows?|demonstrates?|finds?|confirms?|proves?)|clinical(?:ly)?\s+(?:studied|validated|proven)|clinical\s+data|scientifically\s+(?:shown|proven)|validated\s+metrics?|saliva\s+tests?|actigraphy)`;

export const HIGH_CONFIDENCE_HEALTH_OUTCOME_CLAIM_RE = new RegExp(
  [
    String.raw`\b${PHYSIOLOGICAL_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b`,
    String.raw`\b${CONDITION_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${CONDITION_ENDPOINT}\b`,
    String.raw`\benhanc(?:e|es|ed|ing)\s+(?:the\s+)?(?:outcomes?|results?)\s+(?:for|in)\s+(?:${CONDITION_ENDPOINT}|${CONDITION_ENDPOINT}\s+(?:and|or)\s+${CONDITION_ENDPOINT})\s+(?:management|relief)\b`,
    String.raw`\b${EMPIRICAL_HEALTH_PROOF}\b[^.!?\r\n]{0,180}\b${PHYSIOLOGICAL_ENDPOINT}\b`,
    String.raw`\b${PHYSIOLOGICAL_ENDPOINT}\b[^.!?\r\n]{0,180}\b${EMPIRICAL_HEALTH_PROOF}\b`,
  ].join('|'),
  'i',
);

export const UNSUPPORTED_OUTCOME_CLAIM_RE = new RegExp(
  `${LEGACY_UNSUPPORTED_OUTCOME_CLAIM_RE.source}|${HIGH_CONFIDENCE_HEALTH_OUTCOME_CLAIM_RE.source}`,
  'i',
);
export const UNSUPPORTED_PERCENT_RESULT_RE = /\b\d{1,3}(?:\.\d+)?%\s+(?:improvement|better|reduction|relief|success|results?)\b/i;
export const UNSUPPORTED_ABSOLUTE_EFFICACY_RE = /\b(?:(?:clinically|scientifically) proven|(?:instant|permanent) (?:relief|results?)|(?:works?|effective) (?:every time|for everyone))\b/i;
export const UNSUPPORTED_CREDENTIAL_CLAIM_RE = /\b(?:independently verified|member[- ]rated|peer[- ]reviewed|featured (?:by|in)|award(?:ed|-winning)?|accredited|recognized by|certified by|top[- ]rated|five[- ]star|(?:community|clients?|patients?|attendees?|hosts?|studios?|practitioners?|providers?|trainings?|credentials?|sessions?|participants?|collaborations?|reviews?)\s+(?:(?:is|are)\s+)?verified|(?:(?:every|all)\s+)?(?:faculty|facilitators?|practitioners?|providers?|professionals?|experts?|hosts?|teams?|sources?)\s+(?:(?:is|are)\s+)?vetted|(?:expert|client|community|practitioner)[- ]vetted)\b/i;
export const HARD_CODED_OFFER_PRICE_RE = /(?:[$£€]\s*\d[\d,.]*(?:\s*(?:USD|EUR|GBP))?|\b\d[\d,.]*\s*(?:USD|EUR|GBP)\b)/i;

function splitClaimSentences(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .match(/[^.!?\n]+(?:[.!?]+["'’”)*\]]*|(?=\n)|$)/gu)
    ?.map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean) ?? [];
}

function isExcludedOutcomeMatch(sentence: string, matchIndex: number, matchText: string): boolean {
  // Questions, explicit non-treatment/disclaimer language, and clinician
  // referral language are informational safeguards rather than promises.
  if (/\?\s*["'’”)*\]]*$/.test(sentence)) return true;

  const before = sentence.slice(Math.max(0, matchIndex - 120), matchIndex);
  if (
    /(?:\b(?:do(?:es|did)?\s+not|cannot|can['’]t|will\s+not|won['’]t|never|not\s+intended\s+to|isn['’]t\s+intended\s+to|aren['’]t\s+intended\s+to)\b|\b(?:no|insufficient)\s+evidence\b)[^.;:!?]{0,64}$/i.test(before)
  ) return true;
  if (
    /\b(?:ask|consult|check\s+with|speak|talk)\b[^.;:!?]{0,90}\b(?:whether|if)\b[^.;:!?]{0,40}$/i.test(before)
  ) return true;

  // Do not classify explanatory copy merely because it discusses how to
  // understand or evaluate one of the protected endpoints.
  if (/\b(?:awareness|discussion|education|information|knowledge|understanding)\s+(?:about|of)\b/i.test(matchText)) {
    return true;
  }
  if (/\b(?:found|finds?|shows?|showed|demonstrates?)\s+(?:no|none|little)\b/i.test(matchText)) {
    return true;
  }
  return false;
}

/**
 * Return unsupported claims one sentence at a time so repair can replace only
 * the unsafe sentence while preserving adjacent safe editorial copy.
 */
export function findUnsupportedOutcomeClaims(text: string): string[] {
  const matches: string[] = [];
  const matcher = new RegExp(UNSUPPORTED_OUTCOME_CLAIM_RE.source, 'gi');
  for (const sentence of splitClaimSentences(text)) {
    matcher.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(sentence)) !== null) {
      if (!isExcludedOutcomeMatch(sentence, match.index, match[0])) {
        matches.push(sentence);
        break;
      }
      if (match[0].length === 0) matcher.lastIndex += 1;
    }
  }
  return [...new Set(matches)];
}

export function containsUnsupportedOutcomeClaim(text: string): boolean {
  return findUnsupportedOutcomeClaims(text).length > 0;
}

function markupAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  ));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : undefined;
}

function hasBooleanMarkupAttribute(tag: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/?>)`, 'i').test(tag);
}

type ContractHtmlNode = {
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ContractHtmlNode[];
  value?: string;
};

function contractAttribute(node: ContractHtmlNode, name: string): string | undefined {
  return node.attrs?.find((attribute) => attribute.name.toLowerCase() === name)?.value;
}

function contractAccessibleText(node: ContractHtmlNode): string {
  if (node.tagName && ['script', 'style', 'noscript', 'svg', 'template'].includes(node.tagName)) return '';
  return [
    node.value ?? '',
    ...(node.childNodes ?? []).map(contractAccessibleText),
  ].join(' ');
}

/** Validate the final IDREF graph used to name forms, not merely the form subtree. */
function validateFormAccessibleNameReferences(html: string): string[] {
  const document = parse(html) as unknown as ContractHtmlNode;
  const ids = new Map<string, ContractHtmlNode[]>();
  const forms: ContractHtmlNode[] = [];
  const visit = (node: ContractHtmlNode): void => {
    const id = contractAttribute(node, 'id');
    if (id) {
      const matches = ids.get(id) ?? [];
      matches.push(node);
      ids.set(id, matches);
    }
    if (node.tagName === 'form') forms.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);

  const errors: string[] = [];
  for (const form of forms) {
    const reference = contractAttribute(form, 'aria-labelledby');
    if (reference === undefined) continue;
    const names = reference.split(/\s+/).filter(Boolean);
    const targets = names.map((name) => ids.get(name) ?? []);
    if (names.length === 0 || targets.some((matches) => matches.length !== 1)) {
      errors.push('form aria-labelledby contains a dangling or ambiguous ID reference');
      continue;
    }
    const accessibleName = targets
      .flatMap((matches) => matches)
      .map((target) => [
        contractAccessibleText(target),
        contractAttribute(target, 'aria-label') ?? '',
        contractAttribute(target, 'title') ?? '',
      ].join(' '))
      .join(' ');
    if (SENSITIVE_FORM_TEXT_RE.test(accessibleName) || UNSAFE_INQUIRY_FORM_TEXT_RE.test(accessibleName)) {
      errors.push('form accessible name solicits sensitive or unsupported information');
    }
  }
  return errors;
}

/** Final publication boundary for contextual embedded URL policy. */
export function containsUnsafeEmbeddedMarkupUrl(html: string): boolean {
  const document = parse(html) as unknown as ContractHtmlNode;
  let unsafe = false;
  const visit = (node: ContractHtmlNode): void => {
    if (unsafe) return;
    if (node.tagName) {
      for (const attr of node.attrs ?? []) {
        const name = attr.name.toLowerCase();
        if (
          ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
          && isUnsafeStaticUrl(node.tagName, name, attr.value)
        ) {
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
      if (node.tagName === 'style') {
        const css = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
        if (containsUnsafeCssReferences(css)) {
          unsafe = true;
          return;
        }
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return unsafe;
}

/** Independent publication-boundary check for the only supported form schema. */
export function validateStandardInquiryFormMarkup(form: string): string[] {
  const errors: string[] = [];
  const opening = form.match(/<form\b[^>]*>/i)?.[0];
  if (!opening) return ['missing form opening tag'];
  if (markupAttribute(opening, 'data-dc-standard-form')?.toLowerCase() !== 'contact') {
    errors.push('missing contact form marker');
  }
  if (markupAttribute(opening, 'name')?.toLowerCase() !== 'contact') errors.push('form name must be contact');
  if (markupAttribute(opening, 'method')?.toLowerCase() !== 'post') errors.push('form method must be post');
  if ((markupAttribute(opening, 'data-netlify') ?? '').toLowerCase() !== 'true') errors.push('form must enable audited submission');
  if (markupAttribute(opening, 'action') !== undefined) errors.push('custom form action is not allowed');

  const expected = new Map<string, { tag: 'input' | 'textarea'; type?: string; required: boolean }>([
    ['name', { tag: 'input', type: 'text', required: true }],
    ['email', { tag: 'input', type: 'email', required: true }],
    ['phone', { tag: 'input', type: 'tel', required: false }],
    ['message', { tag: 'textarea', required: true }],
  ]);
  const seen = new Map<string, number>();
  for (const match of form.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = match[1]!.toLowerCase() as 'input' | 'select' | 'textarea';
    const markup = match[0];
    const name = (markupAttribute(markup, 'name') ?? '').trim().toLowerCase();
    const rule = expected.get(name);
    if (!rule || tag === 'select' || tag !== rule.tag) {
      errors.push(`unsupported inquiry control ${name || tag}`);
      continue;
    }
    const type = tag === 'input' ? (markupAttribute(markup, 'type') ?? 'text').toLowerCase() : undefined;
    if (rule.type && type !== rule.type) errors.push(`${name} control must use type ${rule.type}`);
    const required = hasBooleanMarkupAttribute(markup, 'required');
    if (required !== rule.required) errors.push(`${name} required state is invalid`);
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  for (const name of expected.keys()) {
    if (seen.get(name) !== 1) errors.push(`form must contain exactly one ${name} control`);
  }
  return errors;
}

const UNSUPPORTED_PROOF_MARKUP_RE = /\b(?:class|id|data-[\w-]+)\s*=\s*["'][^"']*(?:testimonials?|reviews?|quotes?|proof(?:[-_]?gallery)?|credibility|social[-_]?proof|success[-_]?stor(?:y|ies))[^"']*["']/i;

/**
 * Standalone proof labels are too ambiguous in prose, but are an explicit
 * fabricated-proof signal when used as a page title or section heading.
 */
export function isUnsupportedProofHeading(text: string): boolean {
  const normalized = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|#38|#x0*26);/gi, '&')
    .replace(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^(?:credibility|quick stats?|social[- ]proof|proof\s+of\s+progress|proof\s*(?:(?:&|and)\s*(?:notes?|perspective)|[—-]\s*)?|rotating voices?\s*(?:&|and)\s*credibility)$/i.test(normalized);
}

function containsUnsupportedProofHeadingMarkup(markup: string): boolean {
  for (const heading of markup.matchAll(/<(title|h[1-6]|legend)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
    if (isUnsupportedProofHeading(heading[2]!)) return true;
  }
  return false;
}

const PUBLICATION_RISK_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: 'unverified testimonial or review content',
    pattern: new RegExp(
      `${UNSUPPORTED_PROOF_TEXT_RE.source}|${UNSUPPORTED_PROOF_MARKUP_RE.source}|${UNSUPPORTED_FABRICATED_METRIC_RE.source}`,
      'i',
    ),
  },
  { label: 'hard-coded offer price', pattern: HARD_CODED_OFFER_PRICE_RE },
  {
    label: 'unverified percentage result',
    pattern: UNSUPPORTED_PERCENT_RESULT_RE,
  },
  { label: 'unsupported absolute efficacy claim', pattern: UNSUPPORTED_ABSOLUTE_EFFICACY_RE },
  { label: 'unverified credential or recognition claim', pattern: UNSUPPORTED_CREDENTIAL_CLAIM_RE },
];

const LITERAL_EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LITERAL_PHONE_RE = /(?:^|[^\w])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)\s*[\d]+)?(?:$|[^\w])/i;

export function findPersonalDataPlaceholders(html: string): string[] {
  return PERSONAL_DATA_PLACEHOLDERS
    .filter(({ pattern }) => pattern.test(html))
    .map(({ label }) => label);
}

/**
 * Validate the boundary between generated copy and runtime personalization.
 * This intentionally mirrors the uploader's v2 publication boundary. A valid
 * template retains supported identity/contact personalization, declares
 * exactly the tokens present in its HTML, supplies preview defaults for data
 * the intake does not collect, and contains no fabricated proof, fixed offer
 * pricing, sensitive intake prompts, or literal contact destinations.
 */
export function validateTemplateContract(
  pages: ReadonlyMap<string, string>,
  fields: readonly ContractField[],
  options: TemplateContractOptions = {},
): TemplateContractResult {
  const errors: string[] = [];
  const tokenSet = new Set<string>();

  for (const [page, html] of pages) {
    for (const mustache of html.match(ANY_MUSTACHE_RE) ?? []) {
      if (!/^\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}$/.test(mustache)) {
        errors.push(`${page}: contains unsupported template expression ${mustache.slice(0, 80)}`);
      }
    }

    const withoutValidTokens = html.replace(TOKEN_RE, '');
    TOKEN_RE.lastIndex = 0;
    if (withoutValidTokens.includes('{{') || withoutValidTokens.includes('}}')) {
      errors.push(`${page}: contains an unmatched or unsupported template expression`);
    }

    for (const token of extractTemplateTokens(html)) {
      tokenSet.add(token);
      if (!isCorePersonalizationToken(token)) {
        errors.push(`${page}: unexpected unresolved token {{${token}}}`);
      }
    }
    for (const label of findPersonalDataPlaceholders(html)) {
      errors.push(`${page}: contains ${label}`);
    }

    const visibleMarkup = withoutValidTokens
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(?:script|style|noscript|svg)\b[\s\S]*?<\/(?:script|style|noscript|svg)>/gi, ' ');
    const linkMarkup = html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/gi, ' ');
    for (const { label, pattern } of PUBLICATION_RISK_PATTERNS) {
      if (pattern.test(visibleMarkup)) errors.push(`${page}: contains ${label}`);
    }
    if (containsUnsupportedProofHeadingMarkup(visibleMarkup)) {
      errors.push(`${page}: contains unverified testimonial or review content`);
    }
    const descriptiveAttributes = [...visibleMarkup.matchAll(
      /\b(?:aria-label|alt|content|placeholder|title)\s*=\s*(["'])(.*?)\1/gi,
    )].map((match) => match[2]!);
    const outcomeClaimText = [
      visibleMarkup
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(?:nbsp|ensp|emsp|thinsp|#160|#x0*a0);/gi, ' '),
      ...descriptiveAttributes,
    ].join('\n');
    if (containsUnsupportedOutcomeClaim(outcomeClaimText)) {
      errors.push(`${page}: contains unsupported outcome claim`);
    }
    if (containsUnsafeEmbeddedMarkupUrl(html)) {
      errors.push(`${page}: contains unsafe embedded URL`);
    }
    if (LITERAL_EMAIL_RE.test(visibleMarkup)) {
      errors.push(`${page}: contains a hard-coded email address`);
    }
    if (LITERAL_PHONE_RE.test(visibleMarkup)) {
      errors.push(`${page}: contains a hard-coded phone number`);
    }

    for (const accessibleNameError of validateFormAccessibleNameReferences(html)) {
      errors.push(`${page}: ${accessibleNameError}`);
    }

    for (const form of visibleMarkup.match(/<form\b[\s\S]*?<\/form>/gi) ?? []) {
      if (SENSITIVE_FORM_TEXT_RE.test(form)) {
        errors.push(`${page}: form solicits sensitive health information`);
      }
      if (UNSAFE_INQUIRY_FORM_TEXT_RE.test(form)) errors.push(`${page}: form solicits unsupported sensitive information`);
      if (options.requireStandardInquiryForms) {
        const schemaErrors = validateStandardInquiryFormMarkup(form);
        if (schemaErrors.length > 0) {
          errors.push(`${page}: form is not the standard inquiry schema (${schemaErrors.join('; ')})`);
        }
      }
    }
    if (options.requireStandardInquiryForms && /<(?:input|select|textarea)\b[^>]*\bform\s*=/i.test(visibleMarkup)) {
      errors.push(`${page}: externally associated form controls are not allowed`);
    }
    const markupOutsideForms = visibleMarkup.replace(/<form\b[\s\S]*?<\/form>/gi, ' ');
    if (options.requireStandardInquiryForms && /<(?:input|select|textarea)\b/i.test(markupOutsideForms)) {
      errors.push(`${page}: form controls outside the standard inquiry form are not allowed`);
    }

    // Preserve approved tokens while examining destinations. Scanning the
    // token-stripped view would turn `mailto:{{EMAIL}}` into `mailto:` and
    // incorrectly classify the safe runtime destination as hard-coded.
    for (const anchor of linkMarkup.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
      const href = anchor[2]!.trim();
      if (
        /^(?:https?:|mailto:|tel:)/i.test(href) &&
        !/\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(href)
      ) {
        errors.push(`${page}: contains a hard-coded external contact or destination link`);
        break;
      }
    }
  }

  const tokens = [...tokenSet].sort();
  if (tokens.length === 0) {
    errors.push('Template contains no runtime personalization tokens');
  }
  if (!tokens.some((token) => IDENTITY_TOKENS.has(token))) {
    errors.push('Template is missing a supported business or practitioner identity token');
  }
  if (!tokens.some((token) => CONTACT_TOKENS.has(token))) {
    errors.push('Template is missing a supported contact or booking token');
  }

  const fieldsByName = new Map(
    fields.map((field) => [normalizeTokenName(field.name), field]),
  );
  const fieldNames = [...new Set(fieldsByName.keys())].sort();
  const missingFields = tokens.filter((token) => !fieldNames.includes(token));
  const unusedFields = fieldNames.filter((field) => !tokenSet.has(field));

  if (missingFields.length > 0) {
    errors.push(`fields.json is missing tokens: ${missingFields.join(', ')}`);
  }
  if (unusedFields.length > 0) {
    errors.push(`fields.json declares unused tokens: ${unusedFields.join(', ')}`);
  }

  const missingPreviewValues = tokens.filter((token) => {
    if (INTAKE_TOKENS.has(token)) return false;
    const defaultValue = fieldsByName.get(token)?.default;
    return (
      typeof defaultValue !== 'string' ||
      !defaultValue.trim() ||
      /\{\{/.test(defaultValue)
    );
  });
  if (missingPreviewValues.length > 0) {
    errors.push(
      `tokens are not supplied by intake and have no concrete default: ${missingPreviewValues.join(', ')}`,
    );
  }

  for (const field of fields) {
    if (typeof field.default === 'string' && TOKEN_RE.test(field.default)) {
      errors.push(`fields.json default for ${field.name} contains a token`);
    }
    TOKEN_RE.lastIndex = 0;
  }

  return { pass: errors.length === 0, errors, tokens };
}

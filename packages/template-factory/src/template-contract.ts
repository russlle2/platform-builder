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
  /** Emitted stylesheets whose generated text must meet the same copy gate. */
  styles?: ReadonlyMap<string, string>;
  /** Local SVG assets can expose text/accessibility content outside page DOM. */
  svgAssets?: ReadonlyMap<string, string>;
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
  { label: 'placeholder street address', pattern: /\b123 Main (?:St(?:reet)?|Road|Rd\.?)\b/i },
  { label: 'placeholder locality', pattern: /\bAnytown\b/i },
  { label: 'placeholder city', pattern: /\bYour City\b/i },
  { label: 'placeholder state', pattern: /\bYour State\b/i },
  {
    label: 'generated placeholder business name',
    pattern: /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/i,
  },
];

import { parse } from 'parse5';
import postcss from 'postcss';
import {
  containsNonLocalCssReferences,
  containsUnsafeCssReferences,
  containsUnsafeSrcset,
  decodeCssEscapes,
  isNonLocalSvgReference,
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
export const UNSUPPORTED_CREDENTIAL_PROOF_RE = /\b(?:accredit(?:ed|ation)|award(?:ed|s)?|case stud(?:y|ies)|certification|featured (?:by|in)|independently verified|member rated|partner(?:ed|ship)|(?:client|community|member|patient|peer)[- ]reviewed|reviewed by peers?|published|recognition|top[- ]rated|five[- ]star|verified|vetted)\b/i;
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
    String.raw`\b(?:(?:client|community|customer|member|patient)[- ]?)?rated\s+\d(?:\.\d+)?(?:\s*(?:\/\s*5|out\s+of\s+5|stars?|[★☆]{1,5}))?\b`,
    String.raw`\b\d(?:\.\d+)?\s*(?:\/\s*5|out\s+of\s+5|stars?|[★☆]{1,5})`,
    String.raw`\b\d(?:\.\d+)?\s*[- ]\s*stars?\b[^.!?\r\n]{0,40}\b(?:rating|rated|reviews?|clients?)\b`,
    String.raw`\b(?:one|two|three|four|five)(?:\s+point\s+(?:zero|one|two|three|four|five|six|seven|eight|nine))?\s+stars?\b[^.!?\r\n]{0,40}\b(?:clients?|members?|patients?|rating|rated|reviews?)\b`,
    String.raw`\brated\b[^.!?\r\n]{0,30}\b(?:one|two|three|four|five)(?:\s+point\s+(?:zero|one|two|three|four|five|six|seven|eight|nine))?(?:\s+stars?)?(?:\b|(?=\s*[★☆]))`,
    String.raw`\brated\s+(?:[★☆]\s*){3,}`,
    String.raw`(?:[★☆]\s*){3,}`,
    String.raw`\b(?:published\s+in|as\s+seen\s+in)\b[^.!?\r\n]{1,120}`,
    String.raw`\b(?:voted|named)\s+best\b[^.!?\r\n]{0,100}`,
    String.raw`\bcase\s+stud(?:y|ies)\b`,
    String.raw`\b(?:over\s+|more\s+than\s+|join\s+)?(?:\d[\d,.]*\+?|hundreds?|thousands?|millions?)(?:\s+of)?\s+(?:happy|satisfied)\s+(?:clients?|customers?|members?|patients?)\b`,
    String.raw`\b\d{1,3}(?:\.\d+)?%\s+satisfaction(?:\s+(?:rate|score))?\b`,
    String.raw`\b\d{1,3}(?:\.\d+)?%\s+(?:(?:of\s+)?(?:clients?|customers?|members?|patients?)\s+)?(?:feel|felt|report(?:ed)?|recommend|would\s+recommend)\b`,
    String.raw`\b(?:one|two|three|four|five|six|seven|eight|nine|\d+)\s+out\s+of\s+(?:five|ten|5|10)\s+(?:clients?|customers?|members?|patients?)\b[^.!?\r\n]{0,60}\brecommend\b`,
    String.raw`\bloved\s+by\s+\d[\d,.]*\+?\s+(?:clients?|customers?|members?|patients?)\b`,
    String.raw`\bserving\s+\d[\d,.]*\+?\s+(?:clients?|customers?|members?|patients?)\s+since\s+\d{4}\b`,
    String.raw`\b(?:i|we|my|our)\b[^.!?\r\n]{0,120}\b(?:highly\s+recommend|transformed\s+my\s+life|feel\s+like\s+myself|life[- ]changing)\b`,
    String.raw`\btransformed\s+(?:my|our)\s+life\b`,
    String.raw`\b(?:an?\s+)?amazing(?:\s+and)?\s+life[- ]changing\s+(?:experience|service|session)\b`,
    String.raw`\b(?:facilitator|practitioner|coach|therapist)\b[^.!?\r\n]{0,80}\bthoughtful\s+and\s+kind\b`,
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
const CONDITION_ENDPOINT = String.raw`(?:anxiety|depression|post[- ]traumatic\s+stress(?:\s+disorder)?|ptsd|pain|headaches?|migraines?|insomnia|disease|illness|infections?|chronic\s+fatigue(?:\s+syndrome)?|panic\s+attacks?|arthritis|symptoms?|trauma|medical\s+conditions?)`;
const PHYSIOLOGICAL_ENDPOINT = String.raw`(?:blood\s+pressure|hormones?|metabolism|digestion|endocrine\s+system|cortisol(?:\s+(?:levels?|regulation))?|(?:parasympathetic|sympathetic)\s+(?:activity|tone|response|function|nervous\s+system)|(?:autonomic\s+)?nervous\s+system(?:\s+(?:balance|regulation|function))?|neurotransmitter(?:s|\s+(?:release|levels?|activity))?|neurochemistry|(?:alpha|beta|theta|delta|gamma)\s+brain\s+waves?|neurological\s+pathways?|immune\s+(?:system|function|response|resilience|health)|immunity|sleep\s+(?:quality|efficiency|onset|latency|duration|architecture|patterns?)|cognitive\s+(?:function|performance|clarity)|memory|mental\s+sharpness|(?:muscle|tissue|cellular|nerve)\s+(?:repair|recovery|regeneration)|inflammation|inflammatory\s+responses?|nerve\s+impingement|proprioception)`;
const PHYSIOLOGICAL_ACTION = String.raw`(?:activat(?:e|es|ed|ing)|aid(?:s|ed|ing)?|balanc(?:es|ed|ing)|boost(?:s|ed|ing)?|calm(?:s|ed|ing)?|enhanc(?:e|es|ed|ing)|fight(?:s|ing)?|fought|improv(?:e|es|ed|ing)|influenc(?:e|es|ed|ing)|lower(?:s|ed|ing)?|modulat(?:e|es|ed|ing)|promot(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|regulat(?:e|es|ed|ing)|reset(?:s|ting)?|restor(?:e|es|ed|ing)|stimulat(?:e|es|ed|ing)|strengthen(?:s|ed|ing)?|support(?:s|ed|ing)?|target(?:s|ed|ing)?)`;
const CONDITION_ACTION = String.raw`(?:alleviat(?:e|es|ed|ing)|cur(?:e|es|ed|ing)|eliminat(?:e|es|ed|ing)|fight(?:s|ing)?|fought|heal(?:s|ed|ing)?|manag(?:e|es|ed|ing)|prevent(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|reliev(?:e|es|ed|ing)|revers(?:e|es|ed|ing)|treat(?:s|ed|ing)?)`;
const EMPIRICAL_HEALTH_PROOF = String.raw`(?:research\s+(?:shows?|demonstrates?|finds?|confirms?|proves?)|clinical(?:ly)?\s+(?:studied|validated|proven)|clinical\s+data|scientifically\s+(?:shown|proven)|validated\s+metrics?|saliva\s+tests?|actigraphy)`;

export const HIGH_CONFIDENCE_HEALTH_OUTCOME_CLAIM_RE = new RegExp(
  [
    String.raw`\b${PHYSIOLOGICAL_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b`,
    String.raw`(?:^|[.!?]\s+)(?:please\s+)?balance${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b|\b(?:can|could|may|might|will|would|helps?|helping|aims?\s+to|designed\s+to|used\s+to|to)\s+balance${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b`,
    String.raw`\b${CONDITION_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${CONDITION_ENDPOINT}\b`,
    String.raw`\benhanc(?:e|es|ed|ing)\s+(?:the\s+)?(?:outcomes?|results?)\s+(?:for|in)\s+(?:${CONDITION_ENDPOINT}|${CONDITION_ENDPOINT}\s+(?:and|or)\s+${CONDITION_ENDPOINT})\s+(?:management|relief)\b`,
    String.raw`\b${EMPIRICAL_HEALTH_PROOF}\b[^.!?\r\n]{0,180}\b${PHYSIOLOGICAL_ENDPOINT}\b`,
    String.raw`\b${PHYSIOLOGICAL_ENDPOINT}\b[^.!?\r\n]{0,180}\b${EMPIRICAL_HEALTH_PROOF}\b`,
    String.raw`\bdetoxif(?:y|ies|ied|ying)\s+(?:the\s+)?body\b`,
  ].join('|'),
  'i',
);

export const UNSUPPORTED_OUTCOME_CLAIM_RE = new RegExp(
  `${LEGACY_UNSUPPORTED_OUTCOME_CLAIM_RE.source}|${HIGH_CONFIDENCE_HEALTH_OUTCOME_CLAIM_RE.source}`,
  'i',
);
export const UNSUPPORTED_PERCENT_RESULT_RE = /\b\d{1,3}(?:\.\d+)?%\s+(?:improvement|better|reduction|relief|success|results?)\b/i;
export const UNSUPPORTED_ABSOLUTE_EFFICACY_RE = /\b(?:(?:clinically|scientifically) proven|(?:instant|permanent) (?:relief|results?)|(?:works?|effective) (?:every time|for everyone))\b/i;
export const UNSUPPORTED_CREDENTIAL_CLAIM_RE = /\b(?:independently verified|member[- ]rated|(?:client|community|member|patient|peer)[- ]reviewed|(?:faculty|facilitators?|practitioners?|providers?|professionals?|experts?|hosts?|teams?|sources?)\s+(?:(?:is|are)\s+)?reviewed by peers?|featured (?:by|in)|award(?:ed|-winning)?|accredited|recognized by|certified by|top[- ]rated|five[- ]star|(?:community|clients?|patients?|attendees?|hosts?|studios?|practitioners?|providers?|trainings?|credentials?|sessions?|participants?|collaborations?|reviews?)\s+(?:(?:is|are)\s+)?verified|(?:(?:every|all)\s+)?(?:faculty|facilitators?|practitioners?|providers?|professionals?|experts?|hosts?|teams?|sources?)\s+(?:(?:is|are)\s+)?vetted|(?:expert|client|community|practitioner)[- ]vetted)\b/i;
export const HARD_CODED_OFFER_PRICE_RE = /(?:(?:[$£€¥₹]\s*\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*(?:[$£€¥₹]\s*)?\d[\d,.]*(?:\s*k)?)?(?:\s*(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR))?)|(?:\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR)\s*\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*(?:(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR)\s*)?\d[\d,.]*(?:\s*k)?)?)|(?:\b\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*\d[\d,.]*(?:\s*k)?)?\s*(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR|dollars?|pounds?|euros?|yen|rupees?)\b))(?:\s*(?:\/\s*(?:mo(?:nth)?|yr|year|wk|week|day|session|pkg|package)|per\s+(?:month|year|week|day|session|package)))?/i;
export const PRICE_SEMANTIC_ATTRIBUTE_RE = /^(?:aria-description|aria-label|aria-placeholder|aria-valuetext|alt|content|label|placeholder|style|title|value|data-(?:(?:[\w-]+-)?(?:amount|cost|fee|price|rate)(?:-[\w-]+)?|annual|daily|monthly|val(?:ue)?|weekly))$/i;

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

type ContractHtmlNode = {
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ContractHtmlNode[];
  parentNode?: ContractHtmlNode;
  value?: string;
};

const CONTRACT_NON_SEMANTIC_ELEMENTS = new Set(['script', 'style', 'noscript', 'template']);
const CONTRACT_SVG_TEXT_ELEMENTS = new Set(['title', 'desc', 'text']);
const CONTRACT_SVG_SEMANTIC_ATTRIBUTES = new Set([
  'alt', 'aria-description', 'aria-label', 'data-tip', 'data-title', 'data-tooltip', 'title',
]);

function contractTag(node: ContractHtmlNode): string {
  return node.tagName?.toLowerCase() ?? '';
}

function contractAttribute(node: ContractHtmlNode, name: string): string | undefined {
  return node.attrs?.find((attribute) => attribute.name.toLowerCase() === name)?.value;
}

function contractAccessibleText(node: ContractHtmlNode): string {
  const tag = contractTag(node);
  if (CONTRACT_NON_SEMANTIC_ELEMENTS.has(tag) || tag === 'svg') return '';
  if (tag === 'br') return ' ';
  if (tag === 'wbr') return '';
  return [
    node.value ?? '',
    ...(node.childNodes ?? []).map(contractAccessibleText),
  ].join('');
}

const CONTRACT_TEXT_BOUNDARIES = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'dd', 'details', 'dialog', 'div', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'legend', 'li', 'main', 'nav', 'ol', 'option', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul',
]);

/**
 * Preserve semantic block boundaries while joining text split by inline
 * markup. Flattening an entire document can manufacture claims at adjacent
 * heading/paragraph boundaries (for example, "Immune Support" followed by
 * "Your immune system...").
 */
function contractOutcomeTextSegmentsFromDocument(
  document: ContractHtmlNode,
  excludeNonSemanticAncestors: boolean,
): string[] {
  const segments: string[] = [];
  const boundary = '\u0000';
  const inlineText = (node: ContractHtmlNode, root: ContractHtmlNode): string => {
    const tag = contractTag(node);
    if (node !== root && CONTRACT_TEXT_BOUNDARIES.has(tag)) return boundary;
    if (CONTRACT_NON_SEMANTIC_ELEMENTS.has(tag) || tag === 'svg') return '';
    if (tag === 'br') return ' ';
    if (tag === 'wbr') return '';
    return [node.value ?? '', ...(node.childNodes ?? []).map((child) => inlineText(child, root))].join('');
  };
  const svgText = (node: ContractHtmlNode): string => {
    const tag = contractTag(node);
    if (tag === 'br') return ' ';
    if (tag === 'wbr') return '';
    return [node.value ?? '', ...(node.childNodes ?? []).map(svgText)].join('');
  };
  const visit = (node: ContractHtmlNode, insideSvg = false): void => {
    const tag = contractTag(node);
    if (excludeNonSemanticAncestors && CONTRACT_NON_SEMANTIC_ELEMENTS.has(tag)) return;
    if (insideSvg) {
      if (CONTRACT_SVG_TEXT_ELEMENTS.has(tag)) {
        const text = svgText(node).replace(/\s+/g, ' ').trim();
        if (text) segments.push(text);
        return;
      }
      if (tag === 'foreignobject') {
        for (const child of node.childNodes ?? []) visit(child, false);
        return;
      }
      for (const child of node.childNodes ?? []) visit(child, true);
      return;
    }
    if (tag === 'svg') {
      for (const child of node.childNodes ?? []) visit(child, true);
      return;
    }
    if (CONTRACT_TEXT_BOUNDARIES.has(tag)) {
      for (const run of inlineText(node, node).split(boundary)) {
        const text = run.replace(/\s+/g, ' ').trim();
        if (text) segments.push(text);
      }
    }
    for (const child of node.childNodes ?? []) visit(child, false);
  };
  visit(document);
  return segments;
}

function contractOutcomeTextSegments(html: string): string[] {
  return contractOutcomeTextSegmentsFromDocument(
    parse(html) as unknown as ContractHtmlNode,
    false,
  );
}

/** Parse5 decodes character references, so semantic checks cannot be bypassed with encoded attribute values. */
function contractSemanticAttributesFromDocument(
  document: ContractHtmlNode,
  excludeNonSemanticAncestors: boolean,
): Array<{ name: string; value: string }> {
  const attributes: Array<{ name: string; value: string }> = [];
  const visit = (node: ContractHtmlNode, insideSvg = false): void => {
    const tag = contractTag(node);
    if (excludeNonSemanticAncestors && CONTRACT_NON_SEMANTIC_ELEMENTS.has(tag)) return;
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase();
      if (insideSvg && !CONTRACT_SVG_SEMANTIC_ATTRIBUTES.has(name)) continue;
      const value = attribute.value.replace(/\s+/g, ' ').trim();
      if (value) attributes.push({ name, value });
    }
    if (insideSvg && tag === 'foreignobject') {
      for (const child of node.childNodes ?? []) visit(child, false);
      return;
    }
    for (const child of node.childNodes ?? []) visit(child, insideSvg || tag === 'svg');
  };
  visit(document);
  return attributes;
}

function contractSemanticAttributes(html: string): Array<{ name: string; value: string }> {
  return contractSemanticAttributesFromDocument(
    parse(html) as unknown as ContractHtmlNode,
    false,
  );
}

function contractSemanticSegments(html: string): string[] {
  const document = parse(html) as unknown as ContractHtmlNode;
  return [
    ...contractOutcomeTextSegmentsFromDocument(document, true),
    ...contractSemanticAttributesFromDocument(document, true).map(({ value }) => value),
  ];
}

function contractInlineStyles(document: ContractHtmlNode): string[] {
  const styles: string[] = [];
  const visit = (node: ContractHtmlNode): void => {
    if (node.tagName === 'template') return;
    if (node.tagName === 'style') {
      styles.push((node.childNodes ?? []).map((child) => child.value ?? '').join(''));
      return;
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return styles;
}

function contractAnchorHrefs(html: string): string[] {
  const document = parse(html) as unknown as ContractHtmlNode;
  const hrefs: string[] = [];
  const visit = (node: ContractHtmlNode): void => {
    if (node.tagName === 'a') {
      const href = contractAttribute(node, 'href')?.trim();
      if (href) hrefs.push(href);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return hrefs;
}

function contractDuplicateIds(document: ContractHtmlNode): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const visit = (node: ContractHtmlNode): void => {
    const id = contractAttribute(node, 'id');
    if (id) {
      if (seen.has(id)) duplicates.add(id);
      else seen.add(id);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return [...duplicates];
}

function containsContextualStreetAddressPlaceholder(html: string): boolean {
  const document = parse(html) as unknown as ContractHtmlNode;
  const standalone = /^(?:(?:street )?address\s*:\s*)?(?:enter\s+)?your (?:street )?address\s*\.?$/i;
  let found = contractOutcomeTextSegmentsFromDocument(document, true).some((text) => standalone.test(text));
  const addressFieldSignal = /(?:^|[-_[\]])(?:(?:street[-_ ]?)?address|street)(?:$|[-_[\]])|^address-line[12]$/i;
  const isAddressField = (node: ContractHtmlNode): boolean => (
    ['address', 'input', 'select', 'textarea'].includes(node.tagName ?? '')
    || (node.attrs ?? []).some(({ name, value }) => (
      ['autocomplete', 'id', 'name'].includes(name.toLowerCase()) && addressFieldSignal.test(value)
    ))
  );
  const containsAddressField = (node: ContractHtmlNode): boolean => (
    isAddressField(node) || (node.childNodes ?? []).some(containsAddressField)
  );
  const visit = (node: ContractHtmlNode): void => {
    if (found) return;
    const tag = contractTag(node);
    if (CONTRACT_NON_SEMANTIC_ELEMENTS.has(tag)) return;
    if (node.tagName) {
      const addressField = isAddressField(node)
        || (['fieldset', 'form', 'label'].includes(node.tagName) || contractAttribute(node, 'role') === 'group')
          && containsAddressField(node);
      for (const attribute of node.attrs ?? []) {
        const name = attribute.name.toLowerCase();
        if (
          (name === 'placeholder' || name === 'value' || (addressField && (name === 'aria-label' || name === 'title')))
          && standalone.test(attribute.value.trim())
        ) {
          found = true;
          return;
        }
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return found;
}

/** Validate the final accessibility graph used by forms and their controls. */
function validateFormAccessibleNameReferences(html: string): string[] {
  const document = parse(html) as unknown as ContractHtmlNode;
  const topology = contractFormTopology(document);
  const ids = new Map<string, ContractHtmlNode[]>();
  const visit = (node: ContractHtmlNode): void => {
    const id = contractAttribute(node, 'id');
    if (id) {
      const matches = ids.get(id) ?? [];
      matches.push(node);
      ids.set(id, matches);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  const forms = topology.forms;
  const controls = topology.associated.filter((control) => topology.ownerByControl.get(control) !== undefined);

  const errors: string[] = [];
  const unavailableTarget = (target: ContractHtmlNode): boolean => {
    let cursor: ContractHtmlNode | undefined = target;
    while (cursor) {
      if (
        contractAttribute(cursor, 'hidden') !== undefined
        || contractAttribute(cursor, 'inert') !== undefined
        || contractAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
      ) return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  const targetSignal = (target: ContractHtmlNode): string => [
    contractOutcomeTextSegmentsFromDocument(target, true).join(' '),
    ...['alt', 'aria-description', 'aria-label', 'title', 'value']
      .map((attribute) => contractAttribute(target, attribute) ?? ''),
  ].join(' ');
  for (const form of forms) {
    const signals = [
      contractAttribute(form, 'aria-label') ?? '',
      contractAttribute(form, 'aria-description') ?? '',
      contractAttribute(form, 'title') ?? '',
    ];
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-details', 'aria-errormessage']) {
      const reference = contractAttribute(form, attribute);
      if (reference === undefined) continue;
      const names = reference.split(/\s+/).filter(Boolean);
      const targets = names.map((name) => ids.get(name) ?? []);
      if (names.length === 0 || targets.some((matches) => matches.length !== 1 || unavailableTarget(matches[0]!))) {
        errors.push(`form ${attribute} contains a dangling or ambiguous ID reference`);
        continue;
      }
      signals.push(...targets.flatMap((matches) => matches).map(targetSignal));
    }
    if (SENSITIVE_FORM_TEXT_RE.test(signals.join(' ')) || UNSAFE_INQUIRY_FORM_TEXT_RE.test(signals.join(' '))) {
      errors.push('form accessible name or description solicits sensitive or unsupported information');
    }
  }
  for (const control of controls) {
    const graph = contractControlAccessibleName(document, control);
    const hasReferences = ['aria-labelledby', 'aria-describedby', 'aria-details', 'aria-errormessage']
      .some((attribute) => contractAttribute(control, attribute) !== undefined);
    if (hasReferences && graph.invalidReference) errors.push('form control contains a dangling or ambiguous accessible-name reference');
    if (SENSITIVE_FORM_TEXT_RE.test(`${graph.text} ${graph.description}`) || UNSAFE_INQUIRY_FORM_TEXT_RE.test(`${graph.text} ${graph.description}`)) {
      errors.push('form control accessible prompt solicits sensitive or unsupported information');
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
      let insideSvg = node.tagName === 'svg';
      for (let ancestor = node.parentNode; !insideSvg && ancestor; ancestor = ancestor.parentNode) {
        insideSvg = ancestor.tagName === 'svg';
      }
      for (const attr of node.attrs ?? []) {
        const name = attr.name.toLowerCase();
        if (
          ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
          && (isUnsafeStaticUrl(node.tagName, name, attr.value)
            || (insideSvg && ['src', 'href', 'xlink:href'].includes(name) && isNonLocalSvgReference(attr.value)))
        ) {
          unsafe = true;
          return;
        }
        if (name === 'srcset' && containsUnsafeSrcset(attr.value)) {
          unsafe = true;
          return;
        }
        if (name === 'style' && (containsUnsafeCssReferences(attr.value)
          || (insideSvg && containsNonLocalCssReferences(attr.value)))) {
          unsafe = true;
          return;
        }
      }
      if (
        insideSvg
        && node.tagName === 'style'
        && containsNonLocalCssReferences((node.childNodes ?? []).map((child) => child.value ?? '').join(''))
      ) {
        unsafe = true;
        return;
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

type ContractFormTopology = {
  forms: ContractHtmlNode[];
  controls: ContractHtmlNode[];
  buttons: ContractHtmlNode[];
  associated: ContractHtmlNode[];
  ownerByControl: Map<ContractHtmlNode, ContractHtmlNode | undefined>;
};

function contractButtonIsSubmit(button: ContractHtmlNode): boolean {
  const type = contractAttribute(button, 'type')?.trim().toLowerCase();
  return type === undefined || type === '' || !['button', 'reset'].includes(type);
}

function contractFormTopology(document: ContractHtmlNode): ContractFormTopology {
  const forms: ContractHtmlNode[] = [];
  const controls: ContractHtmlNode[] = [];
  const buttons: ContractHtmlNode[] = [];
  const associated: ContractHtmlNode[] = [];
  const visit = (node: ContractHtmlNode): void => {
    if (node.tagName === 'form') forms.push(node);
    if (['button', 'input', 'select', 'textarea'].includes(node.tagName ?? '')) associated.push(node);
    if (['input', 'select', 'textarea'].includes(node.tagName ?? '')) controls.push(node);
    if (node.tagName === 'button') buttons.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  const formsById = new Map<string, ContractHtmlNode[]>();
  for (const form of forms) {
    const id = contractAttribute(form, 'id');
    if (!id) continue;
    const matches = formsById.get(id) ?? [];
    matches.push(form);
    formsById.set(id, matches);
  }
  const ownerByControl = new Map<ContractHtmlNode, ContractHtmlNode | undefined>();
  for (const control of associated) {
    const explicitOwner = contractAttribute(control, 'form');
    if (explicitOwner !== undefined) {
      const matches = formsById.get(explicitOwner) ?? [];
      ownerByControl.set(control, matches.length === 1 ? matches[0] : undefined);
      continue;
    }
    let ancestor = control.parentNode;
    while (ancestor && ancestor.tagName !== 'form') ancestor = ancestor.parentNode;
    ownerByControl.set(control, ancestor?.tagName === 'form' ? ancestor : undefined);
  }
  return { forms, controls, buttons, associated, ownerByControl };
}

function contractSubtreeAttributeValues(root: ContractHtmlNode): string[] {
  const values: string[] = [];
  const visit = (node: ContractHtmlNode): void => {
    if (node.tagName && ['script', 'style', 'noscript', 'svg', 'template'].includes(node.tagName)) return;
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase();
      if (
        ['alt', 'aria-description', 'aria-label', 'aria-placeholder', 'autocomplete', 'label', 'name', 'placeholder', 'title', 'value'].includes(name)
        || name.startsWith('data-tip')
        || name.startsWith('data-tooltip')
      ) values.push(attribute.value);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return values;
}

function contractControlAccessibleName(
  document: ContractHtmlNode,
  control: ContractHtmlNode,
): { text: string; description: string; invalidReference: boolean } {
  const ids = new Map<string, ContractHtmlNode[]>();
  const labels: ContractHtmlNode[] = [];
  const visit = (node: ContractHtmlNode): void => {
    const id = contractAttribute(node, 'id');
    if (id) {
      const matches = ids.get(id) ?? [];
      matches.push(node);
      ids.set(id, matches);
    }
    if (node.tagName === 'label') labels.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);

  const isHiddenLabel = (node: ContractHtmlNode): boolean => {
    let cursor: ContractHtmlNode | undefined = node;
    while (cursor) {
      if (
        contractAttribute(cursor, 'hidden') !== undefined
        || contractAttribute(cursor, 'inert') !== undefined
        || contractAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
      ) return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  const labelSources = new Set<ContractHtmlNode>();
  let ancestor = control.parentNode;
  while (ancestor) {
    if (ancestor.tagName === 'label' && !isHiddenLabel(ancestor)) labelSources.add(ancestor);
    ancestor = ancestor.parentNode;
  }
  const controlId = contractAttribute(control, 'id');
  if (controlId) {
    for (const label of labels) {
      if (contractAttribute(label, 'for') === controlId && !isHiddenLabel(label)) labelSources.add(label);
    }
  }

  let invalidReference = Boolean(controlId && (ids.get(controlId)?.length ?? 0) !== 1);
  const labelledBy = contractAttribute(control, 'aria-labelledby');
  const labelledBySources: ContractHtmlNode[] = [];
  if (labelledBy !== undefined) {
    const names = labelledBy.split(/\s+/).filter(Boolean);
    if (names.length === 0) invalidReference = true;
    for (const name of names) {
      const matches = ids.get(name) ?? [];
      if (matches.length !== 1 || isHiddenLabel(matches[0]!)) invalidReference = true;
      else labelledBySources.push(matches[0]!);
    }
  }

  const descriptionSources = new Set<ContractHtmlNode>();
  for (const attribute of ['aria-describedby', 'aria-details', 'aria-errormessage']) {
    const reference = contractAttribute(control, attribute);
    if (reference === undefined) continue;
    const names = reference.split(/\s+/).filter(Boolean);
    if (names.length === 0) invalidReference = true;
    for (const name of names) {
      const matches = ids.get(name) ?? [];
      if (matches.length !== 1 || isHiddenLabel(matches[0]!)) invalidReference = true;
      else descriptionSources.add(matches[0]!);
    }
  }

  const sourceText = (source: ContractHtmlNode): string => [
    contractOutcomeTextSegmentsFromDocument(source, true).join(' ') || contractAccessibleText(source),
    contractAttribute(source, 'alt') ?? '',
    contractAttribute(source, 'aria-description') ?? '',
    contractAttribute(source, 'aria-label') ?? '',
    contractAttribute(source, 'title') ?? '',
    contractAttribute(source, 'value') ?? '',
  ].join(' ');
  const ariaLabel = contractAttribute(control, 'aria-label')?.trim() ?? '';
  const nativeName = (() => {
    const tag = contractTag(control);
    if (tag === 'button') {
      return contractOutcomeTextSegmentsFromDocument(control, true).join(' ') || contractAccessibleText(control);
    }
    if (tag === 'input') {
      const type = (contractAttribute(control, 'type') ?? 'text').trim().toLowerCase();
      if (type === 'image') return contractAttribute(control, 'alt') ?? contractAttribute(control, 'value') ?? '';
      if (['button', 'reset', 'submit'].includes(type)) return contractAttribute(control, 'value') ?? '';
    }
    return contractAttribute(control, 'title') ?? '';
  })();
  const text = (
    labelledBy !== undefined
      ? labelledBySources.map(sourceText).join(' ')
      : ariaLabel
        ? ariaLabel
        : labelSources.size > 0
          ? [...labelSources].map(sourceText).join(' ')
          : nativeName
  ).replace(/\s+/g, ' ').trim();
  const description = [
    contractAttribute(control, 'aria-description') ?? '',
    contractAttribute(control, 'aria-placeholder') ?? '',
    contractAttribute(control, 'placeholder') ?? '',
    ...[...descriptionSources].map((source) => [
      contractOutcomeTextSegmentsFromDocument(source, true).join(' ') || contractAccessibleText(source),
      contractAttribute(source, 'alt') ?? '',
      contractAttribute(source, 'aria-description') ?? '',
      contractAttribute(source, 'aria-label') ?? '',
      contractAttribute(source, 'title') ?? '',
      contractAttribute(source, 'value') ?? '',
    ].join(' ')),
  ].join(' ').replace(/\s+/g, ' ').trim();
  return { text, description, invalidReference };
}

function validateStandardInquiryFormNode(
  form: ContractHtmlNode,
  controls: readonly ContractHtmlNode[],
  buttons: readonly ContractHtmlNode[],
  document: ContractHtmlNode,
): string[] {
  const errors: string[] = [];
  const styleSuppresses = (node: ContractHtmlNode): boolean => {
    const style = contractAttribute(node, 'style') ?? '';
    return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0*)?)\s*(?:!important\s*)?(?:;|$)/i.test(style);
  };
  const isEffectivelyUnavailable = (node: ContractHtmlNode, readonly = false): boolean => {
    let cursor: ContractHtmlNode | undefined = node;
    while (cursor) {
      if (
        contractAttribute(cursor, 'hidden') !== undefined
        || contractAttribute(cursor, 'inert') !== undefined
        || contractAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
        || contractAttribute(cursor, 'aria-disabled')?.toLowerCase() === 'true'
        || styleSuppresses(cursor)
        || (cursor.tagName === 'fieldset' && contractAttribute(cursor, 'disabled') !== undefined)
      ) return true;
      if (cursor === node && (
        contractAttribute(cursor, 'disabled') !== undefined
        || (readonly && contractAttribute(cursor, 'readonly') !== undefined)
      )) return true;
      cursor = cursor.parentNode;
    }
    return false;
  };
  if (contractAttribute(form, 'data-dc-standard-form') !== 'contact') {
    errors.push('missing contact form marker');
  }
  if (contractAttribute(form, 'name') !== 'contact') errors.push('form name must be contact');
  if (contractAttribute(form, 'method')?.toLowerCase() !== 'post') errors.push('form method must be post');
  if (contractAttribute(form, 'data-netlify') !== 'true') errors.push('form must enable audited submission');
  if (contractAttribute(form, 'action') !== undefined) errors.push('custom form action is not allowed');
  if (contractAttribute(form, 'novalidate') !== undefined) errors.push('form validation may not be disabled');
  if (contractAttribute(form, 'target') !== undefined || contractAttribute(form, 'enctype') !== undefined) {
    errors.push('custom form submission mode is not allowed');
  }
  if (['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'role', 'title']
    .some((attribute) => contractAttribute(form, attribute) !== undefined)) {
    errors.push('form must use the canonical native accessibility semantics');
  }
  if (isEffectivelyUnavailable(form)) errors.push('form and its ancestors must be available to visitors');

  const visitActions = (node: ContractHtmlNode): void => {
    if (node !== form && node.tagName === 'form') return;
    if (['formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget'].some((name) => contractAttribute(node, name) !== undefined)) {
      errors.push('custom control submission override is not allowed');
    }
    for (const child of node.childNodes ?? []) visitActions(child);
  };
  visitActions(form);

  const expected = new Map<string, { tag: 'input' | 'textarea'; type?: string; required: boolean; autocomplete?: string; label: string; rows?: string }>([
    ['name', { tag: 'input', type: 'text', required: true, autocomplete: 'name', label: 'Your name' }],
    ['email', { tag: 'input', type: 'email', required: true, autocomplete: 'email', label: 'Email' }],
    ['phone', { tag: 'input', type: 'tel', required: false, autocomplete: 'tel', label: 'Phone (optional)' }],
    ['message', { tag: 'textarea', required: true, label: 'Message', rows: '5' }],
  ]);
  const seen = new Map<string, number>();
  const labels: ContractHtmlNode[] = [];
  const collectLabels = (node: ContractHtmlNode): void => {
    if (node.tagName === 'label') labels.push(node);
    for (const child of node.childNodes ?? []) collectLabels(child);
  };
  collectLabels(document);
  const labelTextWithoutControls = (label: ContractHtmlNode): string => {
    const visit = (node: ContractHtmlNode): string => {
      if (['button', 'input', 'select', 'textarea'].includes(contractTag(node))) return '';
      return [node.value ?? '', ...(node.childNodes ?? []).map(visit)].join('');
    };
    return visit(label).replace(/\s+/g, ' ').trim();
  };
  for (const control of controls) {
    const tag = control.tagName as 'input' | 'select' | 'textarea';
    const name = contractAttribute(control, 'name') ?? '';
    const rule = expected.get(name);
    if (!rule || tag === 'select' || tag !== rule.tag) {
      errors.push(`unsupported inquiry control ${name || tag}`);
      continue;
    }
    const type = tag === 'input' ? (contractAttribute(control, 'type') ?? 'text').toLowerCase() : undefined;
    if (rule.type && type !== rule.type) errors.push(`${name} control must use type ${rule.type}`);
    const required = contractAttribute(control, 'required') !== undefined;
    if (required !== rule.required) errors.push(`${name} required state is invalid`);
    const autocomplete = contractAttribute(control, 'autocomplete');
    if (autocomplete !== rule.autocomplete) errors.push(`${name} control autocomplete is not canonical`);
    if (rule.rows !== undefined && contractAttribute(control, 'rows') !== rule.rows) {
      errors.push(`${name} control rows are not canonical`);
    }
    if (['accept', 'capture', 'list', 'max', 'maxlength', 'min', 'minlength', 'multiple', 'pattern', 'step'].some((attribute) => contractAttribute(control, attribute) !== undefined)) {
      errors.push(`${name} control has a noncanonical submission constraint`);
    }
    if (contractAttribute(control, 'aria-disabled')?.toLowerCase() === 'true') {
      errors.push(`${name} control must be editable and available`);
    }
    if (isEffectivelyUnavailable(control, true)) errors.push(`${name} control must be editable and available`);
    const forbiddenPromptAttributes = [
      'aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label',
      'aria-labelledby', 'aria-placeholder', 'form', 'id', 'placeholder', 'title',
    ];
    if (forbiddenPromptAttributes.some((attribute) => contractAttribute(control, attribute) !== undefined)) {
      errors.push(`${name} control must use only its canonical nested label`);
    }
    let labelAncestor = control.parentNode;
    while (labelAncestor && labelAncestor.tagName !== 'label' && labelAncestor !== form) {
      labelAncestor = labelAncestor.parentNode;
    }
    const associatedLabels = labels.filter((label) => (
      label === labelAncestor
      || Boolean(contractAttribute(control, 'id') && contractAttribute(label, 'for') === contractAttribute(control, 'id'))
    ));
    if (labelAncestor?.tagName !== 'label' || associatedLabels.length !== 1) {
      errors.push(`${name} control must have exactly one canonical nested label`);
    } else if (
      ['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'for', 'hidden', 'id', 'inert', 'role', 'title']
        .some((attribute) => contractAttribute(labelAncestor, attribute) !== undefined)
      || labelTextWithoutControls(labelAncestor) !== rule.label
      || isEffectivelyUnavailable(labelAncestor)
    ) {
      errors.push(`${name} control label must be ${rule.label}`);
    }
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  for (const name of expected.keys()) {
    if (seen.get(name) !== 1) errors.push(`form must contain exactly one ${name} control`);
  }
  if (buttons.length !== 1) {
    errors.push('form must contain exactly one submit button');
  } else {
    const button = buttons[0]!;
    if ((contractAttribute(button, 'type') ?? 'submit').toLowerCase() !== 'submit') {
      errors.push('form submit button must use type submit');
    }
    if (contractAttribute(button, 'name') !== undefined || contractAttribute(button, 'value') !== undefined) {
      errors.push('form submit button may not submit alternate data');
    }
    if ((contractAttribute(button, 'aria-label') ?? contractAccessibleText(button)).replace(/\s+/g, ' ').trim() !== 'Send inquiry') {
      errors.push('form submit button label must be Send inquiry');
    }
    if (['aria-description', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'role', 'title'].some((attribute) => contractAttribute(button, attribute) !== undefined)) {
      errors.push('form submit button must use the canonical submission behavior');
    }
    if (contractAttribute(button, 'aria-disabled')?.toLowerCase() === 'true') {
      errors.push('form submit button must be enabled and available');
    }
    if (isEffectivelyUnavailable(button)) errors.push('form submit button must be enabled and available');
  }
  return errors;
}

/** Independent DOM publication-boundary check for the only supported form schema. */
export function validateStandardInquiryFormMarkup(markup: string): string[] {
  const document = parse(markup) as unknown as ContractHtmlNode;
  const topology = contractFormTopology(document);
  if (topology.forms.length === 0) return ['missing form opening tag'];
  const errors: string[] = [];
  if (topology.forms.length !== 1) errors.push('markup must contain exactly one form');
  for (const form of topology.forms) {
    const owned = topology.controls.filter((control) => topology.ownerByControl.get(control) === form);
    const buttons = topology.buttons.filter((button) => topology.ownerByControl.get(button) === form);
    errors.push(...validateStandardInquiryFormNode(form, owned, buttons, document));
  }
  if (topology.associated.some((control) => contractAttribute(control, 'form') !== undefined)) {
    errors.push('externally associated form controls are not allowed');
  }
  if (topology.controls.some((control) => topology.ownerByControl.get(control) === undefined)) {
    errors.push('form controls outside the standard inquiry form are not allowed');
  }
  if (topology.buttons.some((button) => topology.ownerByControl.get(button) === undefined && contractButtonIsSubmit(button))) {
    errors.push('unowned submit buttons are not allowed');
  }
  return errors;
}

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

function containsUnsupportedProofHeadingMarkup(document: ContractHtmlNode): boolean {
  let found = false;
  const visit = (node: ContractHtmlNode): void => {
    if (found) return;
    if (node.tagName && ['script', 'style', 'noscript', 'svg', 'template'].includes(node.tagName)) return;
    if (
      /^(?:title|h[1-6]|legend)$/.test(node.tagName ?? '')
      && isUnsupportedProofHeading(contractAccessibleText(node))
    ) {
      found = true;
      return;
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return found;
}

/** Structural proof markers are meaningful only in naming/role attributes. */
function containsUnsupportedProofMarkup(document: ContractHtmlNode): boolean {
  const structuralAttributes = new Set([
    'class', 'id', 'data-block', 'data-component', 'data-kind', 'data-role', 'data-section', 'data-type',
  ]);
  let found = false;
  const visit = (node: ContractHtmlNode): void => {
    if (found) return;
    if (node.tagName && ['script', 'style', 'noscript', 'svg', 'template'].includes(node.tagName)) return;
    for (const attribute of node.attrs ?? []) {
      if (structuralAttributes.has(attribute.name.toLowerCase()) && UNSUPPORTED_PROOF_ATTRIBUTE_RE.test(attribute.value)) {
        found = true;
        return;
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return found;
}

const PUBLICATION_RISK_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: 'unverified testimonial or review content',
    pattern: new RegExp(
      `${UNSUPPORTED_PROOF_TEXT_RE.source}|${UNSUPPORTED_FABRICATED_METRIC_RE.source}`,
      'i',
    ),
  },
  {
    label: 'unverified percentage result',
    pattern: UNSUPPORTED_PERCENT_RESULT_RE,
  },
  { label: 'unsupported absolute efficacy claim', pattern: UNSUPPORTED_ABSOLUTE_EFFICACY_RE },
  { label: 'unverified credential or recognition claim', pattern: UNSUPPORTED_CREDENTIAL_CLAIM_RE },
];

const LITERAL_EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LITERAL_PHONE_RE = /(?:^|[^\w])(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]*|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)\s*[\d]+)?(?:$|[^\w])/i;
const CONTEXTUAL_LITERAL_PHONE_RE = /\b(?:call|phone|telephone|tel|fax|text)(?:\s+(?:us|me))?\s*(?::|at)?\s*(?:\+\s*)?\(?\d[\d().\s-]{7,}\d\b/i;

function containsLiteralPhone(value: string): boolean {
  return LITERAL_PHONE_RE.test(value) || CONTEXTUAL_LITERAL_PHONE_RE.test(value);
}

/** Decode and concatenate CSS string tokens exactly as generated content renders. */
function cssGeneratedTextCandidates(value: string): string[] {
  const strings: string[] = [];
  for (let index = 0; index < value.length;) {
    const quote = value[index];
    if (quote !== '"' && quote !== "'") {
      index += 1;
      continue;
    }
    index += 1;
    let raw = '';
    while (index < value.length) {
      const character = value[index]!;
      if (character === '\\') {
        raw += character;
        index += 1;
        if (index < value.length) raw += value[index++]!;
        continue;
      }
      if (character === quote) {
        index += 1;
        break;
      }
      raw += character;
      index += 1;
    }
    strings.push(decodeCssEscapes(raw));
  }
  if (strings.length === 0) return [];
  return [...new Set([...strings, strings.join('')])]
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Safety labels for text that CSS can expose through `content`. */
export function findUnsafeCssGeneratedText(value: string): string[] {
  const labels = new Set<string>();
  for (const text of cssGeneratedTextCandidates(value)) {
    if (/[\p{L}\p{N}]/u.test(text)) labels.add('non-editable CSS generated prose');
    for (const { label, pattern } of PERSONAL_DATA_PLACEHOLDERS) {
      if (pattern.test(text)) labels.add(label);
    }
    if (/^(?:(?:street )?address\s*:\s*)?(?:enter\s+)?your (?:street )?address\s*\.?$/i.test(text)) {
      labels.add('placeholder street address');
    }
    for (const { label, pattern } of PUBLICATION_RISK_PATTERNS) {
      if (pattern.test(text)) labels.add(label);
    }
    if (containsUnsupportedOutcomeClaim(text)) labels.add('unsupported outcome claim');
    if (HARD_CODED_OFFER_PRICE_RE.test(text)) labels.add('hard-coded offer price');
    if (LITERAL_EMAIL_RE.test(text)) labels.add('hard-coded email address');
    if (containsLiteralPhone(text)) labels.add('hard-coded phone number');
  }
  const decoded = decodeCssEscapes(value);
  if (/\battr\s*\(/i.test(decoded)) labels.add('non-editable CSS attr() generated content');
  const counters = [...decoded.matchAll(/\bcounters?\(\s*([-_A-Za-z][-_A-Za-z0-9]*)\b/gi)]
    .map((match) => match[1]!.toLowerCase());
  if (counters.some((name) => name !== 'step' && name !== 'steps')) {
    labels.add('non-audited CSS counter content');
  }
  if (
    counters.length > 0
    && cssGeneratedTextCandidates(value).some((text) => /[A-Za-z0-9$£€%]/.test(text))
  ) labels.add('non-audited CSS counter label');
  return [...labels];
}

export type CssGeneratedExpansion = { values: string[]; unresolved: boolean; references: Set<string> };

export function expandCssGeneratedValue(
  value: string,
  customValues: ReadonlyMap<string, readonly string[]>,
  stack = new Set<string>(),
  depth = 0,
): CssGeneratedExpansion {
  if (depth > 32) return { values: [], unresolved: true, references: new Set() };
  const decoded = decodeCssEscapes(value);
  const match = /\bvar\s*\(/iu.exec(decoded);
  if (!match) return { values: [decoded], unresolved: false, references: new Set() };
  const open = match.index + match[0].lastIndexOf('(');
  let quote = '';
  let nested = 1;
  let close = -1;
  for (let index = open + 1; index < decoded.length; index += 1) {
    const character = decoded[index]!;
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') nested += 1;
    else if (character === ')' && --nested === 0) {
      close = index;
      break;
    }
  }
  if (close < 0) return { values: [], unresolved: true, references: new Set() };
  const inside = decoded.slice(open + 1, close);
  let comma = -1;
  quote = '';
  nested = 0;
  for (let index = 0; index < inside.length; index += 1) {
    const character = inside[index]!;
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') nested += 1;
    else if (character === ')') nested -= 1;
    else if (character === ',' && nested === 0) {
      comma = index;
      break;
    }
  }
  const name = inside.slice(0, comma < 0 ? undefined : comma).trim();
  const fallback = comma < 0 ? undefined : inside.slice(comma + 1).trim();
  const references = new Set<string>();
  if (!/^--[^\s,()]+$/u.test(name) || stack.has(name)) {
    return { values: [], unresolved: true, references };
  }
  references.add(name);
  const definitions = customValues.get(name);
  const substitutions = definitions?.length ? definitions : fallback ? [fallback] : [];
  if (substitutions.length === 0) return { values: [], unresolved: true, references };
  const values: string[] = [];
  let unresolved = false;
  for (const substitution of substitutions) {
    const expanded = expandCssGeneratedValue(substitution, customValues, new Set(stack).add(name), depth + 1);
    unresolved ||= expanded.unresolved;
    for (const reference of expanded.references) references.add(reference);
    for (const resolved of expanded.values) {
      const tail = expandCssGeneratedValue(`${decoded.slice(0, match.index)}${resolved}${decoded.slice(close + 1)}`, customValues, stack, depth + 1);
      unresolved ||= tail.unresolved;
      for (const reference of tail.references) references.add(reference);
      values.push(...tail.values);
      if (values.length > 128) return { values: values.slice(0, 128), unresolved: true, references };
    }
  }
  return { values: [...new Set(values)], unresolved, references };
}

function cssGeneratedContentClosure(css: string): { values: string[]; attributes: string[]; unresolvedVariable: boolean; error?: string } {
  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch (error) {
    return {
      values: [],
      attributes: [],
      unresolvedVariable: false,
      error: `unparseable stylesheet: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const customValues = new Map<string, string[]>();
  const contentValues: string[] = [];
  const quoteValues: string[] = [];
  root.walkDecls((declaration) => {
    const property = decodeCssEscapes(declaration.prop);
    if (property.toLowerCase() === 'content') contentValues.push(declaration.value);
    if (property.toLowerCase() === 'quotes') quoteValues.push(declaration.value);
    if (property.startsWith('--')) {
      const values = customValues.get(property) ?? [];
      values.push(declaration.value);
      customValues.set(property, values);
    }
  });
  let unresolvedVariable = false;
  const resolvedContent: string[] = [];
  for (const value of contentValues) {
    const expanded = expandCssGeneratedValue(value, customValues);
    resolvedContent.push(...expanded.values);
    unresolvedVariable ||= expanded.unresolved;
  }
  const resolvedQuotes: string[] = [];
  for (const value of quoteValues) {
    const expanded = expandCssGeneratedValue(value, customValues);
    resolvedQuotes.push(...expanded.values);
    unresolvedVariable ||= expanded.unresolved;
  }
  // Audit quote strings even when the matching open-quote lives in another
  // stylesheet; CSS custom properties and quote state cross file boundaries.
  const values = [...resolvedContent, ...resolvedQuotes];
  const attributes = new Set<string>();
  for (const value of values) {
    for (const match of decodeCssEscapes(value).matchAll(/\battr\(\s*([-_A-Za-z][-_A-Za-z0-9]*)\b/gi)) {
      attributes.add(match[1]!.toLowerCase());
    }
  }
  return { values, attributes: [...attributes], unresolvedVariable };
}

/** Parse a complete stylesheet and follow custom properties used by `content`. */
export function findUnsafeCssGeneratedContent(css: string): string[] {
  const closure = cssGeneratedContentClosure(css);
  if (closure.error) return [closure.error];
  const labels = new Set<string>();
  try {
    const root = postcss.parse(css);
    const expression = /\{\{\s*[A-Za-z_][^{}]*(?:\}\}|$)/u;
    let hasExpression = false;
    root.walkDecls((declaration) => { hasExpression ||= expression.test(`${declaration.prop}:${declaration.value}`); });
    root.walkRules((rule) => { hasExpression ||= expression.test(rule.selector); });
    root.walkAtRules((rule) => { hasExpression ||= expression.test(`${rule.name} ${rule.params}`); });
    if (hasExpression) labels.add('unsupported CSS template expression');
  } catch {
    // cssGeneratedContentClosure already reports the authoritative parse error.
  }
  if (closure.unresolvedVariable) labels.add('unresolved CSS generated-content variable');
  for (const value of closure.values) {
    for (const label of findUnsafeCssGeneratedText(value)) labels.add(label);
  }
  return [...labels];
}

/** HTML attributes promoted to visible text by CSS `content: attr(...)`. */
export function cssGeneratedContentAttributeNames(css: string): string[] {
  return cssGeneratedContentClosure(css).attributes;
}

/** Independent safety boundary for local SVG image documents. */
export function findUnsafeSvgAsset(svg: string): string[] {
  const errors = new Set<string>();
  const document = parse(svg) as unknown as ContractHtmlNode;
  const semanticText = contractOutcomeTextSegmentsFromDocument(document, true);
  const semanticAttributes = contractSemanticAttributesFromDocument(document, true);
  const semanticSegments = [...semanticText, ...semanticAttributes.map(({ value }) => value)];
  for (const { label, pattern } of PERSONAL_DATA_PLACEHOLDERS) {
    if (semanticSegments.some((segment) => pattern.test(segment))) errors.add(label);
  }
  if (containsContextualStreetAddressPlaceholder(svg)) errors.add('placeholder street address');
  for (const { label, pattern } of PUBLICATION_RISK_PATTERNS) {
    if (semanticSegments.some((segment) => pattern.test(segment))) errors.add(label);
  }
  if (semanticSegments.some(containsUnsupportedOutcomeClaim)) errors.add('unsupported outcome claim');
  if (semanticSegments.some((segment) => HARD_CODED_OFFER_PRICE_RE.test(segment))) errors.add('hard-coded offer price');
  if (semanticSegments.some((segment) => LITERAL_EMAIL_RE.test(segment))) errors.add('hard-coded email address');
  if (semanticSegments.some(containsLiteralPhone)) errors.add('hard-coded phone number');
  if (semanticSegments.some((segment) => /\{\{[^{}]*\}\}|\{\{|\}\}/u.test(segment))) {
    errors.add('unsupported SVG template expression');
  }
  for (const css of contractInlineStyles(document)) {
    for (const label of findUnsafeCssGeneratedContent(css)) errors.add(`unsafe generated CSS content (${label})`);
    if (containsNonLocalCssReferences(css)) errors.add('non-local SVG stylesheet reference');
  }
  const visit = (node: ContractHtmlNode): void => {
    const tag = contractTag(node);
    if (['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'select', 'textarea', 'button'].includes(tag)) {
      errors.add('active embedded content');
    }
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') errors.add('active event content');
      if (
        ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
        && (isUnsafeStaticUrl(tag, name, attribute.value)
          || (['src', 'href', 'xlink:href'].includes(name) && isNonLocalSvgReference(attribute.value)))
      ) errors.add('unsafe embedded URL');
      if (tag === 'a' && name === 'href' && /^(?:https?:|mailto:|tel:)/i.test(attribute.value)) {
        errors.add('hard-coded external contact or destination link');
      }
      if (name === 'style' && containsUnsafeCssReferences(attribute.value)) errors.add('unsafe embedded URL');
      if (tag === 'template' && name.startsWith('shadowroot')) errors.add('unsupported declarative shadow DOM');
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  return [...errors];
}

export function findPersonalDataPlaceholders(html: string): string[] {
  const semanticSegments = contractSemanticSegments(html);
  const matches = PERSONAL_DATA_PLACEHOLDERS
    .filter(({ pattern }) => semanticSegments.some((segment) => pattern.test(segment)))
    .map(({ label }) => label);
  if (containsContextualStreetAddressPlaceholder(html) && !matches.includes('placeholder street address')) {
    matches.push('placeholder street address');
  }
  return matches;
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
  const cssContentAttributes = new Set<string>();

  for (const [asset, svg] of options.svgAssets ?? []) {
    for (const label of findUnsafeSvgAsset(svg)) errors.push(`${asset}: contains ${label}`);
  }

  for (const [stylesheet, css] of options.styles ?? []) {
    for (const label of findUnsafeCssGeneratedContent(css)) {
      errors.push(`${stylesheet}: contains unsafe generated CSS content (${label})`);
    }
    for (const name of cssGeneratedContentAttributeNames(css)) cssContentAttributes.add(name);
  }

  for (const [page, html] of pages) {
    const sourceDocument = parse(html) as unknown as ContractHtmlNode;
    const duplicateIds = contractDuplicateIds(sourceDocument);
    if (duplicateIds.length > 0) errors.push(`${page}: contains duplicate DOM IDs (${duplicateIds.join(', ')})`);
    const pageCssContentAttributes = new Set(cssContentAttributes);
    for (const [index, css] of contractInlineStyles(sourceDocument).entries()) {
      for (const label of findUnsafeCssGeneratedContent(css)) {
        errors.push(`${page} <style ${index + 1}>: contains unsafe generated CSS content (${label})`);
      }
      for (const name of cssGeneratedContentAttributeNames(css)) pageCssContentAttributes.add(name);
    }
    let hasDeclarativeShadowDom = false;
    const findDeclarativeShadowDom = (node: ContractHtmlNode): void => {
      if (node.tagName === 'template' && contractAttribute(node, 'shadowrootmode') !== undefined) {
        hasDeclarativeShadowDom = true;
        return;
      }
      for (const child of node.childNodes ?? []) findDeclarativeShadowDom(child);
    };
    findDeclarativeShadowDom(sourceDocument);
    if (hasDeclarativeShadowDom) errors.push(`${page}: contains unsupported declarative shadow DOM`);
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

    const stripTokens = (value: string): string => value.replace(TOKEN_RE, ' ');
    const semanticTextSegments = contractOutcomeTextSegmentsFromDocument(sourceDocument, true).map(stripTokens);
    const semanticAttributes = contractSemanticAttributesFromDocument(sourceDocument, true)
      .map(({ name, value }) => ({ name, value: stripTokens(value) }));
    const semanticSegments = [...semanticTextSegments, ...semanticAttributes.map(({ value }) => value)];
    for (const { label, pattern } of PUBLICATION_RISK_PATTERNS) {
      if (semanticSegments.some((segment) => pattern.test(segment))) {
        errors.push(`${page}: contains ${label}`);
      }
    }
    const semanticPriceAttributes = semanticAttributes
      .filter(({ name }) => PRICE_SEMANTIC_ATTRIBUTE_RE.test(name) || pageCssContentAttributes.has(name))
      .map(({ value }) => value);
    if ([...semanticTextSegments, ...semanticPriceAttributes].some((segment) => HARD_CODED_OFFER_PRICE_RE.test(segment))) {
      errors.push(`${page}: contains hard-coded offer price`);
    }
    const proofError = `${page}: contains unverified testimonial or review content`;
    if (
      (containsUnsupportedProofHeadingMarkup(sourceDocument) || containsUnsupportedProofMarkup(sourceDocument))
      && !errors.includes(proofError)
    ) {
      errors.push(proofError);
    }
    if (semanticSegments.some((segment) => containsUnsupportedOutcomeClaim(segment))) {
      errors.push(`${page}: contains unsupported outcome claim`);
    }
    if (containsUnsafeEmbeddedMarkupUrl(html)) {
      errors.push(`${page}: contains unsafe embedded URL`);
    }
    if (semanticSegments.some((segment) => LITERAL_EMAIL_RE.test(segment))) {
      errors.push(`${page}: contains a hard-coded email address`);
    }
    if (semanticSegments.some(containsLiteralPhone)) {
      errors.push(`${page}: contains a hard-coded phone number`);
    }

    for (const accessibleNameError of validateFormAccessibleNameReferences(html)) {
      errors.push(`${page}: ${accessibleNameError}`);
    }

    const formTopology = contractFormTopology(sourceDocument);
    for (const form of formTopology.forms) {
      const ownedControls = formTopology.associated.filter((control) => formTopology.ownerByControl.get(control) === form);
      const formSignal = [form, ...ownedControls].flatMap((node) => [
        ...contractOutcomeTextSegmentsFromDocument(node, true),
        ...contractSubtreeAttributeValues(node),
      ]).join('\n').replace(/[-_]+/g, ' ');
      if (SENSITIVE_FORM_TEXT_RE.test(formSignal)) {
        errors.push(`${page}: form solicits sensitive health information`);
      }
      if (UNSAFE_INQUIRY_FORM_TEXT_RE.test(formSignal)) errors.push(`${page}: form solicits unsupported sensitive information`);
      if (options.requireStandardInquiryForms) {
        const controls = formTopology.controls.filter((control) => formTopology.ownerByControl.get(control) === form);
        const buttons = formTopology.buttons.filter((button) => formTopology.ownerByControl.get(button) === form);
        const schemaErrors = validateStandardInquiryFormNode(form, controls, buttons, sourceDocument);
        if (schemaErrors.length > 0) {
          errors.push(`${page}: form is not the standard inquiry schema (${schemaErrors.join('; ')})`);
        }
      }
    }
    if (
      options.requireStandardInquiryForms
      && formTopology.associated.some((control) => contractAttribute(control, 'form') !== undefined)
    ) {
      errors.push(`${page}: externally associated form controls are not allowed`);
    }
    if (
      options.requireStandardInquiryForms
      && formTopology.controls.some((control) => formTopology.ownerByControl.get(control) === undefined)
    ) {
      errors.push(`${page}: form controls outside the standard inquiry form are not allowed`);
    }
    if (
      options.requireStandardInquiryForms
      && formTopology.buttons.some((button) => formTopology.ownerByControl.get(button) === undefined && contractButtonIsSubmit(button))
    ) {
      errors.push(`${page}: unowned submit buttons are not allowed`);
    }

    // Preserve approved tokens while examining destinations. Scanning the
    // token-stripped view would turn `mailto:{{EMAIL}}` into `mailto:` and
    // incorrectly classify the safe runtime destination as hard-coded.
    for (const href of contractAnchorHrefs(html)) {
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

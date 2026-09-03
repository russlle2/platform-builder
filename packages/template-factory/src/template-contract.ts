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
  { label: 'placeholder email', pattern: /\bhello@example\.com\b/i },
  { label: 'placeholder practitioner name', pattern: /\bDr\.\s+Morgan\s+Ellis\b/i },
  { label: 'placeholder phone', pattern: /\(?555\)?[\s.-]*555[\s.-]*0100\b/i },
  { label: 'placeholder city', pattern: /\bYour City\b/i },
  { label: 'placeholder state', pattern: /\bYour State\b/i },
  {
    label: 'generated placeholder business name',
    pattern: /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/i,
  },
];

const PUBLICATION_RISK_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: 'unverified testimonial or review content',
    pattern: /\btestimonials?\b|\bclient (?:success )?stor(?:y|ies)\b|\bwhat (?:our )?(?:clients?|patients?) (?:say|share)\b|\bvoices? from (?:the )?(?:cohort|community|clients?)\b|class\s*=\s*["'][^"']*\b(?:testimonial|review|quote)\b/i,
  },
  { label: 'hard-coded offer price', pattern: />\s*[^<]{0,120}\$\s*\d/i },
  {
    label: 'unverified percentage result',
    pattern: />\s*[^<]{0,120}\b\d{1,3}(?:\.\d+)?%\b/i,
  },
  {
    label: 'guaranteed outcome claim',
    pattern: /\bguaranteed?\s+(?:results?|outcomes?|bookings?|revenue|growth|healing)\b/i,
  },
];

const SENSITIVE_FORM_RE = /\b(?:allerg(?:y|ies|ic)|pregnan(?:t|cy)|medications?|diagnos(?:is|ed|tic)|medical history|mental[- ]health history|symptoms?|health conditions?)\b/i;
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
      .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/gi, ' ');
    const linkMarkup = html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/gi, ' ');
    for (const { label, pattern } of PUBLICATION_RISK_PATTERNS) {
      if (pattern.test(visibleMarkup)) errors.push(`${page}: contains ${label}`);
    }
    if (LITERAL_EMAIL_RE.test(visibleMarkup)) {
      errors.push(`${page}: contains a hard-coded email address`);
    }
    if (LITERAL_PHONE_RE.test(visibleMarkup)) {
      errors.push(`${page}: contains a hard-coded phone number`);
    }

    for (const form of visibleMarkup.match(/<form\b[\s\S]*?<\/form>/gi) ?? []) {
      if (SENSITIVE_FORM_RE.test(form)) {
        errors.push(`${page}: form solicits sensitive health information`);
        break;
      }
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

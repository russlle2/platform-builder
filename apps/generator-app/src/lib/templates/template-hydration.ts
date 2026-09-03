export interface HydrationField {
  name: string
  type?: string
  default?: string
}

const TOKEN_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g
const EMBEDDED_TOKEN_RE = /\{\{\s*[A-Za-z0-9_]+\s*\}\}/
const MAX_VALUE_LENGTH = 5_000

const TOKEN_ALIAS_GROUPS: readonly (readonly string[])[] = [
  ['PRACTITIONER_NAME', 'OWNER_NAME', 'COACH_NAME', 'FACILITATOR_NAME'],
  ['PHONE', 'PHONE_NUMBER', 'CONTACT_PHONE'],
  ['EMAIL', 'CONTACT_EMAIL'],
  ['CTA_LABEL', 'PRIMARY_CTA_LABEL'],
  ['ADDRESS', 'STREET_ADDRESS'],
]

const aliasGroupByToken = new Map<string, readonly string[]>()
for (const group of TOKEN_ALIAS_GROUPS) {
  for (const token of group) aliasGroupByToken.set(token, group)
}

function normalizeTokenName(value: string): string {
  return value.trim().toUpperCase()
}

function tokenCandidates(token: string): string[] {
  const group = aliasGroupByToken.get(token) || []
  return [token, ...group.filter((candidate) => candidate !== token)]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeUrl(value: string): string | null {
  if (/^(?:\/[^/]|\.\/|#)/.test(value)) return value

  const candidate = /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value)
    ? `https://${value}`
    : value

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function sanitizeValue(
  token: string,
  fieldType: string | undefined,
  rawValue: string,
): string | null {
  const value = String(rawValue).replace(/\0/g, '').trim().slice(0, MAX_VALUE_LENGTH)
  if (!value || EMBEDDED_TOKEN_RE.test(value)) return null

  const lowerType = fieldType?.toLowerCase()
  if (lowerType === 'email' || token.includes('EMAIL')) {
    return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value : null
  }

  if (lowerType === 'tel' || token.includes('PHONE')) {
    return value.length <= 64 && /^[+0-9().\-\s/#xext]+$/i.test(value)
      ? value
      : null
  }

  if (
    lowerType === 'url' ||
    token === 'WEBSITE' ||
    token.endsWith('_URL') ||
    token.endsWith('_LINK')
  ) {
    return normalizeUrl(value)
  }

  return value
}

function normalizeValues(values: Record<string, string>): Map<string, string> {
  const normalized = new Map<string, string>()
  for (const [key, value] of Object.entries(values)) {
    const token = normalizeTokenName(key)
    if (token && typeof value === 'string' && !normalized.has(token)) {
      normalized.set(token, value)
    }
  }
  return normalized
}

/**
 * Hydrate a template in one token pass. Concrete field defaults provide a safe
 * gallery fallback; non-empty customer values win. Every inserted value is
 * validated for its field type and HTML-escaped, and aliases are bidirectional.
 */
export function hydrateTemplate(
  html: string,
  values: Record<string, string>,
  fields: readonly HydrationField[] = [],
): string {
  const customerValues = normalizeValues(values)
  const defaults = new Map<string, string>()
  const fieldTypes = new Map<string, string>()

  for (const field of fields) {
    const name = normalizeTokenName(field.name)
    if (!name) continue
    if (field.type) fieldTypes.set(name, field.type)
    if (typeof field.default === 'string' && !defaults.has(name)) {
      defaults.set(name, field.default)
    }
  }

  return html.replace(TOKEN_RE, (_full, rawToken: string) => {
    const token = normalizeTokenName(rawToken)
    const candidates = tokenCandidates(token)
    const fieldType = candidates
      .map((candidate) => fieldTypes.get(candidate))
      .find(Boolean)

    for (const source of [customerValues, defaults]) {
      for (const candidate of candidates) {
        const rawValue = source.get(candidate)
        if (rawValue === undefined) continue
        const safeValue = sanitizeValue(token, fieldType, rawValue)
        if (safeValue !== null) return escapeHtml(safeValue)
      }
    }

    return ''
  })
}

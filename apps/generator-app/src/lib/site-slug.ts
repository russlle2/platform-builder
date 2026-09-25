export const MIN_SITE_SLUG_LENGTH = 3
export const MAX_SITE_SLUG_LENGTH = 30

const RESERVED_SITE_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'billing',
  'blog',
  'dashboard',
  'help',
  'login',
  'portal',
  'pricing',
  'settings',
  'signup',
  'support',
  'www',
])

export function normalizeSiteSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SITE_SLUG_LENGTH)
}

export function validateSiteSlug(value: string): string | null {
  if (!value) return 'Site address is required.'
  if (value.length < MIN_SITE_SLUG_LENGTH) {
    return `Site address must be at least ${MIN_SITE_SLUG_LENGTH} characters.`
  }
  if (value.length > MAX_SITE_SLUG_LENGTH) {
    return `Site address must be ${MAX_SITE_SLUG_LENGTH} characters or fewer.`
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return 'Use only lowercase letters, numbers, and single hyphens.'
  }
  if (RESERVED_SITE_SLUGS.has(value)) {
    return 'This site address is reserved. Please choose another.'
  }
  if (value.startsWith('draft-')) {
    return 'This site address prefix is reserved. Please choose another.'
  }
  return null
}

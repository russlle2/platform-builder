export const CUSTOM_BUILD_AMOUNT_CENTS = 50_000
export const CUSTOM_BUILD_CURRENCY = 'usd'
export const CUSTOM_BUILD_LOOKUP_KEY = 'dailyclarity_custom_website_build_500_usd'
// Public, non-secret Stripe price ID for the verified live $500 one-time product.
// Deployments can override it with STRIPE_PRICE_CUSTOM_BUILD.
export const DEFAULT_CUSTOM_BUILD_PRICE_ID = 'price_1TsXd19AeloaKLwtRriEcNuA'

export type CustomBuildInput = {
  businessName: string
  contactName: string | null
  email: string
  phone: string | null
  siteVision: string
  requiredFunctionality: string
  inspirationLinks: string | null
  existingWebsite: string | null
}

type ValidationResult =
  | { ok: true; data: CustomBuildInput }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requiredString(
  value: unknown,
  label: string,
  min: number,
  max: number,
): { value?: string; error?: string } {
  if (typeof value !== 'string') return { error: `${label} is required.` }
  const trimmed = value.trim()
  if (trimmed.length < min) return { error: `${label} must be at least ${min} characters.` }
  if (trimmed.length > max) return { error: `${label} must be ${max} characters or fewer.` }
  return { value: trimmed }
}

function optionalString(value: unknown, label: string, max: number): { value?: string | null; error?: string } {
  if (value == null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} is invalid.` }
  const trimmed = value.trim()
  if (!trimmed) return { value: null }
  if (trimmed.length > max) return { error: `${label} must be ${max} characters or fewer.` }
  return { value: trimmed }
}

export function validateCustomBuildInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request.' }
  const data = body as Record<string, unknown>

  const businessName = requiredString(data.businessName, 'Business name', 2, 120)
  if (businessName.error) return { ok: false, error: businessName.error }

  const email = requiredString(data.email, 'Email', 5, 254)
  if (email.error) return { ok: false, error: email.error }
  if (!EMAIL_RE.test(email.value!)) return { ok: false, error: 'Enter a valid email address.' }

  const siteVision = requiredString(data.siteVision, 'Website description', 100, 5_000)
  if (siteVision.error) return { ok: false, error: siteVision.error }

  const requiredFunctionality = requiredString(data.requiredFunctionality, 'Required functionality', 50, 4_000)
  if (requiredFunctionality.error) return { ok: false, error: requiredFunctionality.error }

  const contactName = optionalString(data.contactName, 'Contact name', 120)
  if (contactName.error) return { ok: false, error: contactName.error }
  const phone = optionalString(data.phone, 'Phone', 40)
  if (phone.error) return { ok: false, error: phone.error }
  const inspirationLinks = optionalString(data.inspirationLinks, 'Inspiration links', 2_000)
  if (inspirationLinks.error) return { ok: false, error: inspirationLinks.error }
  const existingWebsite = optionalString(data.existingWebsite, 'Existing website', 500)
  if (existingWebsite.error) return { ok: false, error: existingWebsite.error }

  if (data.acceptedTerms !== true) {
    return { ok: false, error: 'You must accept the service terms before checkout.' }
  }

  return {
    ok: true,
    data: {
      businessName: businessName.value!,
      contactName: contactName.value ?? null,
      email: email.value!.toLowerCase(),
      phone: phone.value ?? null,
      siteVision: siteVision.value!,
      requiredFunctionality: requiredFunctionality.value!,
      inspirationLinks: inspirationLinks.value ?? null,
      existingWebsite: existingWebsite.value ?? null,
    },
  }
}

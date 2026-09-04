/**
 * Single source of truth for subscription plans.
 *
 * Consumed by the pricing page, profile-review page, the support chatbot prompt,
 * the Stripe checkout route, and the Stripe webhook. Keep this file free of
 * server-only imports so it can be used from both client and server components.
 *
 * Two tiers:
 *  - basic         ($20/mo): the fully automated, self-serve website platform.
 *  - security_ads  ($80/mo): everything in Basic PLUS one done-for-you premium
 *                            bundle we run by hand — ad/promo campaigns and
 *                            security + uptime hardening.
 *
 * Note on Stripe env vars: the $80 price still lives in STRIPE_PRICE_GROWTH for
 * backwards compatibility, and the legacy `growth` planKey is accepted as an
 * alias for `security_ads`.
 */

export type PlanKey = 'basic' | 'security_ads'

export interface Plan {
  key: PlanKey
  /** Stripe price env var name that holds this plan's recurring price ID. */
  stripePriceEnv: 'STRIPE_PRICE_BASIC' | 'STRIPE_PRICE_GROWTH'
  name: string
  price: number
  period: 'monthly'
  description: string
  badge?: string
  highlight?: boolean
  /** Marketing bullet list shown on the pricing card. */
  features: string[]
  /** True when this tier includes the hands-on, manually delivered premium bundle. */
  managedService: boolean
}

export const PLANS: Record<PlanKey, Plan> = {
  basic: {
    key: 'basic',
    stripePriceEnv: 'STRIPE_PRICE_BASIC',
    name: 'Basic',
    price: 20,
    period: 'monthly',
    description: 'Your professional website, launched and fully automated — edit it yourself anytime.',
    badge: 'Self-serve',
    highlight: false,
    managedService: false,
    features: [
      'Professional website, built and launched for you',
      'Hosted subdomain + SSL included',
      'Live preview and self-serve portal editing',
      'Switch templates and styles anytime',
      'Contact forms with email notifications',
      'Secure cloud storage and database',
      'Online-payment ready',
      '7-day free trial',
    ],
  },
  security_ads: {
    key: 'security_ads',
    stripePriceEnv: 'STRIPE_PRICE_GROWTH',
    name: 'Security + Ads',
    price: 80,
    period: 'monthly',
    description: 'Everything in Basic, plus a done-for-you ads and security service we run for you by hand.',
    badge: 'Done for you',
    highlight: true,
    managedService: true,
    features: [
      'Everything in Basic',
      'Done-for-you ad & promo campaigns, managed by us',
      'Security hardening & uptime monitoring, managed by us',
      'Hands-on optimization a few times each week',
      'Priority support',
      '7-day free trial',
    ],
  },
}

/** Ordered list for rendering pricing cards (Basic first, premium second). */
export const PLAN_LIST: Plan[] = [PLANS.basic, PLANS.security_ads]

/**
 * Features that are fully automated and included in BOTH tiers — used to render
 * the "everything is automated" comparison column.
 */
export const AUTOMATED_FEATURES: string[] = [
  'Professional website + hosted subdomain',
  'SSL, hosting, and uptime',
  'Contact forms + email notifications',
  'Secure storage, database & payments',
  'Self-serve portal edits',
  'Template & style switching',
  '7-day free trial',
]

/** The single manually delivered premium bundle, gated to the $80 tier. */
export const MANAGED_FEATURES: string[] = [
  'Done-for-you ad & promo campaigns',
  'Security hardening & uptime monitoring',
]

/**
 * Normalize any incoming planKey (including the legacy `growth` alias) to a
 * canonical PlanKey. Returns null for unknown values.
 */
export function normalizePlanKey(input: string | null | undefined): PlanKey | null {
  if (!input) return null
  const key = input.toLowerCase().trim()
  if (key === 'basic') return 'basic'
  if (key === 'security_ads' || key === 'growth' || key === 'pro') return 'security_ads'
  return null
}

/** True when the plan includes the manually delivered premium bundle. */
export function isManagedPlan(input: string | null | undefined): boolean {
  return normalizePlanKey(input) === 'security_ads'
}

/** Resolve a plan definition from any planKey/alias. */
export function getPlan(input: string | null | undefined): Plan | null {
  const key = normalizePlanKey(input)
  return key ? PLANS[key] : null
}

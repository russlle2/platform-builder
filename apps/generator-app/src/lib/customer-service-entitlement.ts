import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlan } from './plans'
import { configuredStripeLivemode, isStripeModeAllowed, TEMPLATE_CHECKOUT_TYPE } from './stripe-runtime'

export type ServiceTier = 'paid' | 'trial'
export interface CustomerServiceEntitlement {
  allowed: boolean
  tier: ServiceTier | null
  reason: string
  validThrough: string | null
}
export interface HostingBinding {
  slug: string
  subscriptionId: string
  customerId: string
  plan: string
  priceId: string
  livemode: boolean
}
export interface HostingObservation {
  kind: ServiceTier | 'none' | 'unknown'
  subscriptionStatus: string
  validFrom?: string
  validThrough?: string
  subscriptionItemId?: string
  priceId?: string
  invoiceId?: string
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
const id = (value: unknown): string | null => typeof value === 'string' && value
  ? value : typeof object(value)?.id === 'string' ? object(value)!.id as string : null
const seconds = (value: unknown): value is number => typeof value === 'number'
  && Number.isSafeInteger(value) && value > 0
const date = (value: number) => new Date(value * 1000).toISOString()
const unknown = (): HostingObservation => ({ kind: 'unknown', subscriptionStatus: 'unknown' })

/** Derive coverage only from the exact live subscription and settled invoice. */
export function inspectHostingEvidence(
  subscriptionValue: unknown,
  invoiceValue: unknown,
  binding: HostingBinding,
  now = Date.now(),
): HostingObservation {
  const subscription = object(subscriptionValue)
  const metadata = object(subscription?.metadata)
  const plan = getPlan(binding.plan)
  if (!subscription || !plan || !binding.priceId
    || subscription.id !== binding.subscriptionId || id(subscription.customer) !== binding.customerId
    || subscription.livemode !== binding.livemode || metadata?.checkoutType !== TEMPLATE_CHECKOUT_TYPE
    || metadata.slug !== binding.slug || metadata.planKey !== plan.key) return unknown()
  const status = typeof subscription.status === 'string' ? subscription.status : 'unknown'
  // A terminal/current delinquent observation cannot be reversed by a late
  // paid invoice. Existing positive coverage remains separately available for
  // conservative hosting decisions, but no new paid action is authorized.
  if (['canceled', 'unpaid', 'past_due', 'incomplete_expired', 'paused', 'incomplete'].includes(status)) {
    return { kind: 'none', subscriptionStatus: status }
  }
  if (!['active', 'trialing'].includes(status) || subscription.collection_method !== 'charge_automatically'
    || subscription.pause_collection != null || subscription.pending_update != null) return unknown()
  const items = object(subscription.items)
  const data = items?.data
  if (items?.has_more !== false || !Array.isArray(data) || data.length !== 1) return unknown()
  const item = object(data[0])
  const price = object(item?.price)
  const recurring = object(price?.recurring)
  if (!item || typeof item.id !== 'string' || item.quantity !== 1 || price?.id !== binding.priceId
    || price.currency !== 'usd' || price.unit_amount !== plan.price * 100
    || recurring?.interval !== 'month' || recurring.interval_count !== 1) return unknown()
  const base = { subscriptionStatus: status, subscriptionItemId: item.id, priceId: binding.priceId }
  if (status === 'trialing') {
    if (!seconds(subscription.trial_start) || !seconds(subscription.trial_end)
      || subscription.trial_end <= subscription.trial_start || now < subscription.trial_start * 1000) return unknown()
    return { ...base, kind: 'trial', validFrom: date(subscription.trial_start), validThrough: date(subscription.trial_end) }
  }
  const invoice = object(invoiceValue)
  const parent = object(invoice?.parent)
  const details = object(parent?.subscription_details)
  const lines = object(invoice?.lines)
  if (!invoice || id(subscription.latest_invoice) !== invoice.id
    || id(invoice.customer) !== binding.customerId || invoice.livemode !== binding.livemode
    || invoice.status !== 'paid' || invoice.amount_remaining !== 0 || invoice.currency !== 'usd'
    || invoice.collection_method !== 'charge_automatically'
    || id(details?.subscription) !== binding.subscriptionId
    || lines?.has_more !== false || !Array.isArray(lines.data) || lines.data.length !== 1) return unknown()
  const line = object(lines.data[0])
  const lineParent = object(line?.parent)
  const lineDetails = object(lineParent?.subscription_item_details)
  const pricing = object(object(line?.pricing)?.price_details)
  const period = object(line?.period)
  if (!line || lineParent?.type !== 'subscription_item_details' || lineDetails?.proration !== false
    || id(lineDetails.subscription) !== binding.subscriptionId || lineDetails.subscription_item !== item.id
    || id(pricing?.price) !== binding.priceId || line.quantity !== 1 || line.currency !== 'usd'
    || typeof line.amount !== 'number' || line.amount < 0
    || !seconds(period?.start) || !seconds(period?.end) || period.end <= period.start
    || item.current_period_start !== period.start || item.current_period_end !== period.end
    || now < period.start * 1000 || typeof invoice.id !== 'string') return unknown()
  // A fully discounted or credit-covered settled invoice is legitimate access.
  // Accounting/launch proof of positive cash receipts remains a separate gate.
  return { ...base, kind: 'paid', validFrom: date(period.start), validThrough: date(period.end), invoiceId: invoice.id }
}

export async function getCustomerServiceEntitlement(
  supabase: SupabaseClient, slug: string,
): Promise<CustomerServiceEntitlement> {
  const { data, error } = await supabase.rpc('customer_service_entitlement', { p_slug: slug })
  const value = object(data)
  if (error || !value || typeof value.allowed !== 'boolean') {
    return { allowed: false, tier: null, reason: 'unavailable', validThrough: null }
  }
  return {
    allowed: value.allowed === true && ['paid', 'trial'].includes(String(value.tier)),
    tier: value.tier === 'paid' || value.tier === 'trial' ? value.tier : null,
    reason: typeof value.reason === 'string' ? value.reason : 'unavailable',
    validThrough: typeof value.validThrough === 'string' ? value.validThrough : null,
  }
}

/** Serialize live reconciliation and preserve previous coverage on uncertainty. */
export async function reconcileHostingEntitlement(
  supabase: SupabaseClient,
  stripe: Stripe,
  slug: string,
): Promise<'updated' | 'unknown' | 'busy' | 'identity_changed'> {
  const { data: portal, error: portalError } = await supabase.from('portal_sites')
    .select('data').eq('slug', slug).maybeSingle()
  if (portalError) throw new Error('hosting_portal_lookup_failed')
  const values = object(portal?.data)
  const plan = getPlan(typeof values?.plan === 'string' ? values.plan : null)
  const secretKey = process.env.STRIPE_SECRET_KEY || ''
  const expectedLivemode = isStripeModeAllowed(secretKey) ? configuredStripeLivemode(secretKey) : null
  const priceId = plan ? process.env[plan.stripePriceEnv] : undefined
  if (!values || !plan || !priceId || expectedLivemode === null
    || typeof values.stripe_subscription_id !== 'string' || typeof values.stripe_customer_id !== 'string') {
    return 'identity_changed'
  }
  const binding: HostingBinding = {
    slug, subscriptionId: values.stripe_subscription_id, customerId: values.stripe_customer_id,
    plan: plan.key, priceId, livemode: expectedLivemode,
  }
  const { data: claimValue, error: claimError } = await supabase.rpc('claim_hosting_reconciliation', {
    p_slug: slug, p_subscription_id: binding.subscriptionId, p_customer_id: binding.customerId,
    p_plan: binding.plan, p_livemode: binding.livemode,
  })
  if (claimError) throw new Error('hosting_reconciliation_claim_failed')
  const claim = object(claimValue)
  if (claim?.claimed !== true) return claim?.reason === 'busy' ? 'busy' : 'identity_changed'
  if (typeof claim.token !== 'string' || !Number.isSafeInteger(claim.generation)) {
    throw new Error('hosting_reconciliation_claim_invalid')
  }
  let observation = unknown()
  try {
    const subscription = await stripe.subscriptions.retrieve(binding.subscriptionId, {}, { timeout: 20_000, maxNetworkRetries: 1 })
    const invoiceId = id(subscription.latest_invoice)
    const invoice = subscription.status === 'active' && invoiceId
      ? await stripe.invoices.retrieve(invoiceId, {}, { timeout: 20_000, maxNetworkRetries: 1 }) : null
    observation = inspectHostingEvidence(subscription, invoice, binding)
  } catch {
    // Do not leak provider objects or customer details into application logs.
  }
  const { data: committed, error: commitError } = await supabase.rpc('finish_hosting_reconciliation', {
    p_slug: slug, p_token: claim.token, p_generation: claim.generation, p_observation: observation,
  })
  if (commitError) throw new Error('hosting_reconciliation_commit_failed')
  if (committed !== true) return 'busy'
  return observation.kind === 'unknown' ? 'unknown' : 'updated'
}

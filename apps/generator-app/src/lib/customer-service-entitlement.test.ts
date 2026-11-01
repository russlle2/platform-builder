import { afterEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { inspectHostingEvidence, reconcileHostingEntitlement, type HostingBinding } from './customer-service-entitlement'

const start = 1_800_000_000
const end = start + 30 * 86400
const now = (start + 86400) * 1000
const binding: HostingBinding = { slug: 'calm-co', subscriptionId: 'sub_site', customerId: 'cus_owner', plan: 'basic', priceId: 'price_basic', livemode: false }
function fixture() {
  return {
    subscription: {
      id: binding.subscriptionId, customer: binding.customerId, livemode: false, status: 'active',
      metadata: { checkoutType: 'template_subscription', slug: binding.slug, planKey: binding.plan },
      collection_method: 'charge_automatically', pause_collection: null, pending_update: null,
      latest_invoice: 'in_paid',
      items: { has_more: false, data: [{ id: 'si_site', quantity: 1, current_period_start: start, current_period_end: end,
        price: { id: binding.priceId, currency: 'usd', unit_amount: 2000, recurring: { interval: 'month', interval_count: 1 } } }] },
      trial_start: start, trial_end: end,
    },
    invoice: {
      id: 'in_paid', customer: binding.customerId, livemode: false, status: 'paid', amount_remaining: 0,
      currency: 'usd', collection_method: 'charge_automatically', amount_paid: 2000,
      parent: { subscription_details: { subscription: binding.subscriptionId } },
      lines: { has_more: false, data: [{ amount: 2000, quantity: 1, currency: 'usd',
        parent: { type: 'subscription_item_details', subscription_item_details: { subscription: binding.subscriptionId, subscription_item: 'si_site', proration: false } },
        pricing: { price_details: { price: binding.priceId } }, period: { start, end } }] },
    },
  }
}

afterEach(() => vi.unstubAllEnvs())
describe('authoritative hosting coverage', () => {
  it.each([0, 2000])('accepts a settled matching invoice including legitimate zero-payment credits (%s cents)', (amount) => {
    const { subscription, invoice } = fixture()
    invoice.amount_paid = amount
    expect(inspectHostingEvidence(subscription, invoice, binding, now)).toMatchObject({
      kind: 'paid', validFrom: new Date(start * 1000).toISOString(), validThrough: new Date(end * 1000).toISOString(), invoiceId: 'in_paid',
    })
  })
  it('does not use an active subscription period as payment proof', () => {
    const { subscription, invoice } = fixture()
    invoice.status = 'open'
    expect(inspectHostingEvidence(subscription, invoice, binding, now).kind).toBe('unknown')
    expect(inspectHostingEvidence(subscription, null, binding, now).kind).toBe('unknown')
  })
  it('requires exact subscription, customer, environment, item, price and complete lines', () => {
    const alterations: Array<(f: ReturnType<typeof fixture>) => void> = [
      f => { f.subscription.customer = 'cus_other' }, f => { f.subscription.livemode = true },
      f => { f.subscription.metadata.slug = 'other-site' }, f => { f.subscription.items.data[0].price.id = 'price_other' },
      f => { f.invoice.parent.subscription_details.subscription = 'sub_other' },
      f => { f.invoice.lines.data[0].parent.subscription_item_details.subscription_item = 'si_other' },
      f => { f.invoice.lines.data[0].parent.subscription_item_details.proration = true },
      f => { f.invoice.lines.has_more = true }, f => { f.subscription.items.has_more = true },
      f => { f.invoice.lines.data.push(f.invoice.lines.data[0]) },
      f => { f.invoice.lines.data[0].period.end += 1 }, f => { f.invoice.amount_remaining = 1 },
    ]
    for (const alter of alterations) {
      const f = fixture(); alter(f)
      expect(inspectHostingEvidence(f.subscription, f.invoice, binding, now).kind).toBe('unknown')
    }
  })
  it('does not authorize a future coverage interval', () => {
    const { subscription, invoice } = fixture()
    expect(inspectHostingEvidence(subscription, invoice, binding, start * 1000 - 1).kind).toBe('unknown')
  })
  it('honors current cancellation even if the latest invoice was paid', () => {
    const { subscription, invoice } = fixture()
    subscription.status = 'canceled'
    expect(inspectHostingEvidence(subscription, invoice, binding, now)).toEqual({ kind: 'none', subscriptionStatus: 'canceled' })
  })
  it('keeps a provider-backed trial separate from paid coverage', () => {
    const { subscription } = fixture()
    subscription.status = 'trialing'
    expect(inspectHostingEvidence(subscription, null, binding, now)).toMatchObject({ kind: 'trial', subscriptionStatus: 'trialing' })
    subscription.trial_end = subscription.trial_start
    expect(inspectHostingEvidence(subscription, null, binding, now).kind).toBe('unknown')
  })
  it('commits provider outages as unknown under the acquired generation', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture')
    vi.stubEnv('STRIPE_PRICE_BASIC', binding.priceId)
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { data: {
      plan: 'basic', stripe_customer_id: binding.customerId, stripe_subscription_id: binding.subscriptionId,
    } }, error: null }) }
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
    const rpc = vi.fn(async (name: string) => ({ data: name === 'claim_hosting_reconciliation' ? { claimed: true, token: 'lease-token', generation: 42 } : true, error: null }))
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient
    const stripe = { subscriptions: { retrieve: vi.fn().mockRejectedValue(new Error('provider unavailable')) } } as unknown as Stripe
    expect(await reconcileHostingEntitlement(supabase, stripe, binding.slug)).toBe('unknown')
    expect(rpc).toHaveBeenLastCalledWith('finish_hosting_reconciliation', { p_slug: binding.slug, p_token: 'lease-token', p_generation: 42, p_observation: { kind: 'unknown', subscriptionStatus: 'unknown' } })
  })
})

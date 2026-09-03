import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { processStripeEvent } from './stripe-fulfillment-worker'
import { TEMPLATE_CHECKOUT_TYPE } from './stripe-runtime'

function createSupabase(portalApplied: boolean) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { slug: 'calm-co' }, error: null })
  const ordersQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle,
  }
  ordersQuery.select.mockReturnValue(ordersQuery)
  ordersQuery.eq.mockReturnValue(ordersQuery)
  ordersQuery.order.mockReturnValue(ordersQuery)
  ordersQuery.limit.mockReturnValue(ordersQuery)

  const rpc = vi.fn(async (name: string) => ({
    data: name === 'merge_portal_billing_state' ? portalApplied : true,
    error: null,
  }))
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`)
      return ordersQuery
    }),
    rpc,
  } as unknown as SupabaseClient
  return { supabase, rpc }
}

function stripeWithCurrentSubscription(status: Stripe.Subscription.Status) {
  const retrieve = vi.fn().mockResolvedValue({
    id: 'sub_template',
    status,
    metadata: { checkoutType: TEMPLATE_CHECKOUT_TYPE },
    cancel_at_period_end: status === 'canceled',
    items: { data: [] },
  })
  return {
    stripe: { subscriptions: { retrieve } } as unknown as Stripe,
    retrieve,
  }
}

describe('Stripe billing-state convergence', () => {
  it('uses current subscription entitlement instead of reactivating from a late paid invoice', async () => {
    const { supabase, rpc } = createSupabase(false)
    const { stripe, retrieve } = stripeWithCurrentSubscription('canceled')
    const event = {
      id: 'evt_invoice_paid_late',
      type: 'invoice.paid',
      created: 1_788_465_600,
      data: {
        object: {
          id: 'in_late',
          parent: {
            subscription_details: {
              subscription: 'sub_template',
              metadata: { checkoutType: TEMPLATE_CHECKOUT_TYPE },
            },
          },
        },
      },
    } as unknown as Stripe.Event

    await processStripeEvent(supabase, stripe, event)

    expect(retrieve).toHaveBeenCalledWith('sub_template')
    expect(rpc).toHaveBeenNthCalledWith(1, 'merge_portal_billing_state', expect.objectContaining({
      p_billing_status: 'canceled',
      p_data_patch: expect.objectContaining({ latest_invoice_id: 'in_late', latest_invoice_paid: true }),
    }))
    // A portal RPC that already committed must not prevent order repair.
    expect(rpc).toHaveBeenNthCalledWith(2, 'merge_order_billing_state', expect.objectContaining({
      p_status: 'canceled',
    }))
  })

  it('reconciles a stale subscription update against Stripe before changing access', async () => {
    const { supabase, rpc } = createSupabase(true)
    const { stripe } = stripeWithCurrentSubscription('canceled')
    const event = {
      id: 'evt_stale_subscription',
      type: 'customer.subscription.updated',
      created: 1_788_465_600,
      data: {
        object: {
          id: 'sub_template',
          status: 'active',
          metadata: { checkoutType: TEMPLATE_CHECKOUT_TYPE },
          cancel_at_period_end: false,
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event

    await processStripeEvent(supabase, stripe, event)

    expect(rpc).toHaveBeenNthCalledWith(1, 'merge_portal_billing_state', expect.objectContaining({
      p_billing_status: 'canceled',
    }))
    expect(rpc).toHaveBeenNthCalledWith(2, 'merge_order_billing_state', expect.objectContaining({
      p_status: 'canceled',
    }))
  })
})

import type Stripe from 'stripe'
import { getPlan } from './plans'
import { isCheckoutPaymentReady } from './stripe-runtime'
import { validateSiteSlug } from './site-slug'

export interface CheckoutConfirmation {
  ok: boolean
  awaitingPayment?: boolean
  slug?: string
  planName?: string
  managed?: boolean
  customBuild?: boolean
  requestId?: string
  trialStarted?: boolean
  noPaymentRequired?: boolean
  testMode?: boolean
}

/** Confirmation describes Stripe's checkout result, never site or email delivery. */
export function describeCheckoutConfirmation(
  session: Pick<Stripe.Checkout.Session, 'status' | 'payment_status' | 'subscription' | 'metadata' | 'livemode' | 'mode'>,
  expectedLivemode: boolean,
): CheckoutConfirmation {
  if (session.status !== 'complete' || session.livemode !== expectedLivemode) return { ok: false }
  const meta = session.metadata || {}
  // A completed Checkout can still be awaiting an asynchronous payment result.
  // Keep this separate from confirmation: it grants no fulfillment or access.
  const knownCheckout = (meta.checkoutType === 'custom_build' && session.mode === 'payment') ||
    (meta.checkoutType === 'template_subscription' && session.mode === 'subscription' && Boolean(
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    ))
  if (knownCheckout && session.payment_status === 'unpaid') {
    return { ok: false, awaitingPayment: true }
  }
  if (meta.checkoutType === 'custom_build') {
    return session.mode === 'payment' && session.payment_status === 'paid'
      ? { ok: true, customBuild: true, requestId: meta.customBuildRequestId || undefined, testMode: !session.livemode }
      : { ok: false }
  }
  if (meta.checkoutType !== 'template_subscription' || session.mode !== 'subscription' || !isCheckoutPaymentReady(session)) {
    return { ok: false }
  }
  const plan = getPlan(meta.planKey)
  const subscription = session.subscription
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id
  if (!subscriptionId) return { ok: false }
  return {
    ok: true,
    slug: typeof meta.slug === 'string' && !validateSiteSlug(meta.slug) ? meta.slug : undefined,
    planName: plan?.name,
    managed: plan?.managedService ?? false,
    trialStarted: session.payment_status === 'no_payment_required' && typeof subscription === 'object' && subscription !== null && subscription.status === 'trialing',
    noPaymentRequired: session.payment_status === 'no_payment_required',
    testMode: !session.livemode,
  }
}

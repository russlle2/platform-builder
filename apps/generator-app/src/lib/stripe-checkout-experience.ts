import type Stripe from 'stripe'

/**
 * Keep digital-product checkout to the fields the payment provider needs.
 * Automatic 3DS preserves Stripe/issuer-required authentication without asking
 * every cardholder to complete a challenge. Link's optional enrollment can be
 * preselected and require a phone number, so hide it for this guest checkout.
 * Other eligible wallets remain dynamic.
 */
export function stripeCheckoutExperience(): Pick<Stripe.Checkout.SessionCreateParams,
  'billing_address_collection' | 'phone_number_collection' | 'payment_method_options' | 'wallet_options'
> {
  return {
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: false },
    payment_method_options: { card: { request_three_d_secure: 'automatic' } },
    wallet_options: { link: { display: 'never' } },
  }
}

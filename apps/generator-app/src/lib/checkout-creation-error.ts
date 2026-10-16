import Stripe from 'stripe'

/**
 * An attempted create may have succeeded even when its response is lost.
 * Only explicit request/auth/payment rejections prove it is safe to abandon.
 * Connection, API/5xx, idempotency conflicts and unknown errors need review.
 */
export function isDefinitiveCheckoutRejection(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) return false
  if (typeof error.statusCode !== 'number' || error.statusCode >= 500) return false
  return (
    (error instanceof Stripe.errors.StripeInvalidRequestError && [400, 404].includes(error.statusCode)) ||
    (error instanceof Stripe.errors.StripeAuthenticationError && error.statusCode === 401) ||
    (error instanceof Stripe.errors.StripePermissionError && error.statusCode === 403) ||
    (error instanceof Stripe.errors.StripeCardError && error.statusCode === 402)
  )
}

export function uncertainCheckoutResponse(reference: string | null) {
  return {
    code: 'checkout_creation_uncertain',
    error: "We couldn't confirm this checkout attempt. Please don't start another payment yet. Contact support with this reference so we can check it.",
    reference,
    supportUrl: '/contact',
  }
}

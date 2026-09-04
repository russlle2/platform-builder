import {
  redispatchDueStripeEvents,
} from '../../apps/generator-app/src/lib/stripe-fulfillment-dispatch'
import { hasStripeFulfillmentRecoveryConfig } from '../../apps/generator-app/src/lib/stripe-runtime'

/** Recover queued, failed, or lease-expired events beyond platform retries. */
export default async function handler(): Promise<void> {
  if (!hasStripeFulfillmentRecoveryConfig()) {
    if (process.env.DAILYCLARITY_ENVIRONMENT?.trim().toLowerCase() === 'staging') {
      console.warn('[stripe-fulfillment-sweeper] skipped: staging recovery runtime is not fully configured')
      return
    }
    throw new Error('Stripe fulfillment recovery runtime is not fully configured.')
  }
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!origin) throw new Error('No trusted application origin is configured for fulfillment recovery.')

  const result = await redispatchDueStripeEvents(origin, 20)
  console.info('[stripe-fulfillment-sweeper] recovery pass complete', result)
}

export const config = {
  schedule: '*/5 * * * *',
}

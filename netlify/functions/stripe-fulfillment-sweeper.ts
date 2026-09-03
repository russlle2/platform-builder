import {
  redispatchDueStripeEvents,
} from '../../apps/generator-app/src/lib/stripe-fulfillment-dispatch'

/** Recover queued, failed, or lease-expired events beyond platform retries. */
export default async function handler(): Promise<void> {
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!origin) throw new Error('No trusted application origin is configured for fulfillment recovery.')

  const result = await redispatchDueStripeEvents(origin, 20)
  console.info('[stripe-fulfillment-sweeper] recovery pass complete', result)
}

export const config = {
  schedule: '*/5 * * * *',
}

import { hasStripeFulfillmentRecoveryConfig, isDedicatedSupabaseProjectConfigured, isStripeModeAllowed } from './stripe-runtime'
import { stripeFulfillmentWorkerUrl } from './stripe-fulfillment-queue'

export const HOSTING_RECONCILIATION_PATH = '/.netlify/functions/hosting-reconciliation'

export function hasHostingReconciliationConfig(): boolean {
  return hasStripeFulfillmentRecoveryConfig() && isDedicatedSupabaseProjectConfigured()
    && isStripeModeAllowed(process.env.STRIPE_SECRET_KEY || '')
}

/** No customer identifiers or secrets enter the scheduled invocation payload. */
export async function dispatchHostingReconciliation(origin: string): Promise<void> {
  if (!hasHostingReconciliationConfig()) throw new Error('hosting_reconciliation_configuration_incomplete')
  const trusted = new URL(stripeFulfillmentWorkerUrl(origin))
  const target = new URL(HOSTING_RECONCILIATION_PATH, trusted.origin)
  const response = await fetch(target, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.STRIPE_FULFILLMENT_WORKER_SECRET}`, 'content-type': 'application/json' },
    body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10_000),
  })
  if (response.status !== 202) throw new Error(`hosting_reconciliation_dispatch:${response.status}`)
}

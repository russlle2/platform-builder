import { dispatchHostingReconciliation, hasHostingReconciliationConfig } from '../../apps/generator-app/src/lib/hosting-reconciliation-dispatch'

export default async function handler(): Promise<void> {
  if (!hasHostingReconciliationConfig()) {
    if (process.env.DAILYCLARITY_ENVIRONMENT === 'staging') {
      console.warn('[hosting-reconciliation-sweeper] staging runtime incomplete')
      return
    }
    throw new Error('hosting_reconciliation_configuration_incomplete')
  }
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!origin) throw new Error('hosting_reconciliation_origin_missing')
  await dispatchHostingReconciliation(origin)
}

export const config = { schedule: '*/5 * * * *' }

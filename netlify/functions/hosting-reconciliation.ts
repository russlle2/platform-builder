import { createClient } from '@supabase/supabase-js'
import { reconcileHostingEntitlement } from '../../apps/generator-app/src/lib/customer-service-entitlement'
import { createStripeClient } from '../../apps/generator-app/src/lib/stripe-client'
import { isWorkerAuthorized } from '../../apps/generator-app/src/lib/stripe-fulfillment-queue'
import { hasHostingReconciliationConfig } from '../../apps/generator-app/src/lib/hosting-reconciliation-dispatch'

/** Fresh Stripe reads recover missed webhooks without treating local dates as payment evidence. */
export default async function handler(request: Request): Promise<void> {
  if (!isWorkerAuthorized(request.headers.get('authorization'), process.env.STRIPE_FULFILLMENT_WORKER_SECRET)) {
    console.warn('[hosting-reconciliation] unauthorized invocation')
    return
  }
  if (!hasHostingReconciliationConfig()) throw new Error('hosting_reconciliation_configuration_incomplete')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY!)
  const { data, error } = await supabase.rpc('due_hosting_reconciliations', { p_limit: 20 })
  if (error || !Array.isArray(data)) throw new Error('hosting_reconciliation_due_query_failed')
  let updated = 0
  let uncertain = 0
  let failed = 0
  // Four bounded workers; each record also has a database lease and generation.
  for (let offset = 0; offset < data.length; offset += 4) {
    const results = await Promise.allSettled(data.slice(offset, offset + 4).map(async (row: { slug?: unknown }) => {
      if (typeof row.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(row.slug)) throw new Error('invalid_hosting_slug')
      return reconcileHostingEntitlement(supabase, stripe, row.slug)
    }))
    for (const result of results) {
      if (result.status === 'rejected') failed += 1
      else if (result.value === 'updated') updated += 1
      else uncertain += 1
    }
  }
  console.info('[hosting-reconciliation] pass complete', { discovered: data.length, updated, uncertain, failed })
  if (failed) throw new Error('hosting_reconciliation_partial_failure')
}

export const config = {
  background: true,
  path: '/.netlify/functions/hosting-reconciliation',
  method: 'POST',
  rateLimit: { action: 'rate_limit', windowLimit: 12, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}

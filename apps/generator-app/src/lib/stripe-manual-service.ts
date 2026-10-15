import type { SupabaseClient } from '@supabase/supabase-js'
import { sendManualServiceAlert } from './email'

interface ManualServiceTask {
  id: string
  details: Record<string, unknown>
}

interface ManualServicePurchase {
  sessionId: string
  slug: string
  plan: string
  customerEmail: string
  businessName: string
  siteUrl?: string
}

/** Preserve the original task and its completion/notification state on retries. */
export async function ensureManualServiceTask(
  supabase: SupabaseClient,
  purchase: ManualServicePurchase,
): Promise<ManualServiceTask> {
  const { error } = await supabase.from('manual_service_tasks').upsert({
    slug: purchase.slug,
    plan: purchase.plan,
    email: purchase.customerEmail,
    business_name: purchase.businessName,
    task_type: 'security_ads',
    status: 'open',
    stripe_session_id: purchase.sessionId,
    details: { stripe_session: purchase.sessionId, site_url: purchase.siteUrl },
  }, { onConflict: 'stripe_session_id,task_type', ignoreDuplicates: true })
  if (error) throw new Error(`manual_service_task:${error.message}`)
  const { data: task, error: lookupError } = await supabase.from('manual_service_tasks')
    .select('id, details').eq('stripe_session_id', purchase.sessionId)
    .eq('task_type', 'security_ads').single()
  if (lookupError || !task?.id) {
    throw new Error(`manual_service_task_lookup:${lookupError?.message || 'not_found'}`)
  }
  return { id: task.id, details: task.details || {} }
}

/** At-least-once delivery: never mark an operations alert sent before acceptance. */
export async function notifyManualServiceOwner(
  supabase: SupabaseClient,
  task: ManualServiceTask,
  purchase: Pick<ManualServicePurchase, 'slug' | 'plan' | 'customerEmail' | 'businessName'>,
): Promise<void> {
  if (task.details.owner_alert_sent_at) return
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim()
  if (!ownerEmail) throw new Error('manual_service_owner_email_not_configured')
  await sendManualServiceAlert({ ownerEmail, ...purchase })
  const sentAt = new Date().toISOString()
  const { data, error } = await supabase.from('manual_service_tasks').update({
    details: { ...task.details, owner_alert_sent_at: sentAt },
    updated_at: sentAt,
  }).eq('id', task.id)
    // Preserve operator edits made while the email transport was in flight.
    // A concurrent change leaves the marker pending for a fresh worker retry.
    .eq('details', JSON.stringify(task.details)).select('id').maybeSingle()
  if (error || !data) throw new Error(`manual_service_alert_marker:${error?.message || 'task_not_found'}`)
}

import { createHash, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SiteUsageStatus } from './usage-allowances'

export type UsageMetric = 'publish' | 'contact'
export interface UsageOperation {
  slug: string
  metric: UsageMetric
  id: string
  fingerprint: string
}
type UsageClaim =
  | { state: 'reserved'; limit: number; used: number; resetAt: string }
  | { state: 'completed'; status: number; body: Record<string, unknown> }

export class UsageGuardError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly resetAt?: string) {
    super(message)
    this.name = 'UsageGuardError'
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]),
  )
  return value
}

export function usageFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

export function usageOperation(slug: string, metric: UsageMetric, value: unknown, requestedId?: unknown): UsageOperation {
  const fingerprint = usageFingerprint(value)
  const id = typeof requestedId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestedId)
    ? requestedId : randomUUID()
  return { slug, metric, id, fingerprint }
}

/** Old generated forms have no request ID. Coalesce identical rapid retries. */
export function contactUsageOperation(slug: string, value: unknown, requestedId?: unknown, now = Date.now()): UsageOperation {
  const operation = usageOperation(slug, 'contact', value, requestedId)
  if (typeof requestedId !== 'string' || operation.id !== requestedId) {
    operation.id = usageFingerprint({ slug, fingerprint: operation.fingerprint, window: Math.floor(now / 300_000) })
  }
  return operation
}

function args(operation: UsageOperation) {
  return { p_slug: operation.slug, p_metric: operation.metric, p_operation_id: operation.id, p_fingerprint: operation.fingerprint }
}

export async function reserveSiteUsage(client: SupabaseClient, operation: UsageOperation): Promise<UsageClaim> {
  const { data, error } = await client.rpc('reserve_site_usage', args(operation))
  if (error || !data || typeof data !== 'object') throw new UsageGuardError('Usage verification is temporarily unavailable. Your action has not started.', 'usage_unavailable', 503)
  if (data.state === 'reserved' && Number.isInteger(data.limit) && data.limit > 0 && Number.isInteger(data.used)
    && data.used > 0 && data.used <= data.limit && typeof data.resetAt === 'string' && Number.isFinite(Date.parse(data.resetAt))) return data as UsageClaim
  if (data.state === 'completed' && Number.isInteger(data.status) && data.status >= 200 && data.status <= 599 && data.body && typeof data.body === 'object' && !Array.isArray(data.body)) return data as UsageClaim
  if (data.state === 'ineligible') throw new UsageGuardError('This service is paused while your subscription needs attention. You can still open your account and billing settings.', 'billing_suspended', 402)
  if (data.state === 'pending') throw new UsageGuardError('This request is already being processed. Check its result before starting another attempt, or contact support if it remains unresolved.', 'usage_operation_pending', 409)
  if (data.state === 'conflict') throw new UsageGuardError('The request reference belongs to different details. Reload the page before trying again.', 'usage_operation_conflict', 409)
  if (data.state === 'limited') {
    const when = typeof data.resetAt === 'string' && Number.isFinite(Date.parse(data.resetAt)) ? data.resetAt : undefined
    const date = when ? new Date(when).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }) : 'the first of next month'
    const action = operation.metric === 'publish' ? 'published updates' : 'contact submissions'
    throw new UsageGuardError(`Your included ${action} allowance has been used. It resets on ${date} at 00:00 UTC. No extra charge was made.`, 'usage_limit_reached', 429, when)
  }
  throw new UsageGuardError('Usage verification is temporarily unavailable. Your action has not started.', 'usage_unavailable', 503)
}

export async function finishSiteUsage(client: SupabaseClient, operation: UsageOperation, status: number, body: Record<string, unknown>): Promise<void> {
  const { data, error } = await client.rpc('finish_site_usage', { ...args(operation), p_status: status, p_body: body })
  if (error || data !== true) {
    // Never re-run an external action merely because storing its receipt failed.
    console.error('[site-usage] operation receipt could not be stored')
  }
}

export async function releaseSiteUsage(client: SupabaseClient, operation: UsageOperation): Promise<void> {
  const { error } = await client.rpc('release_site_usage', args(operation))
  if (error) console.error('[site-usage] unused reservation could not be released')
}

export async function readSiteUsage(client: SupabaseClient, slug: string): Promise<SiteUsageStatus | null> {
  const { data, error } = await client.rpc('site_usage_status', { p_slug: slug })
  if (error || !data || typeof data !== 'object' || typeof data.resetAt !== 'string'
    || !Number.isFinite(Date.parse(data.resetAt)) || !data.entitlement || typeof data.entitlement.allowed !== 'boolean'
    || !data.publish || !Number.isInteger(data.publish.used) || !Number.isInteger(data.publish.limit)
    || !data.contact || !Number.isInteger(data.contact.used) || !Number.isInteger(data.contact.limit)
    || !data.storage || !Number.isFinite(data.storage.bytes) || !Number.isInteger(data.storage.objects)
    || !Number.isFinite(data.storage.byteLimit) || !Number.isInteger(data.storage.objectLimit)
    || data.publish.used < 0 || data.publish.limit < 1 || data.contact.used < 0 || data.contact.limit < 1
    || data.storage.bytes < 0 || data.storage.objects < 0 || data.storage.byteLimit < 1 || data.storage.objectLimit < 1) return null
  return data as SiteUsageStatus
}

export async function assertCustomerServiceEntitled(client: SupabaseClient, slug: string): Promise<void> {
  const { data, error } = await client.rpc('customer_service_entitlement', { p_slug: slug })
  if (error || !data || typeof data !== 'object') throw new UsageGuardError('Your subscription could not be verified. Please try again later.', 'usage_unavailable', 503)
  if (data.allowed !== true || !['paid', 'trial'].includes(data.tier)) {
    throw new UsageGuardError('This service is paused while your subscription needs attention. You can still open your account and billing settings.', 'billing_suspended', 402)
  }
}

export async function reserveCustomerImage(client: SupabaseClient, owner: string, storagePath: string, bytes: number): Promise<void> {
  const { data, error } = await client.rpc('reserve_customer_image', { p_owner: owner, p_path: storagePath, p_bytes: bytes })
  if (error || !data || typeof data !== 'object') throw new UsageGuardError('Image storage usage could not be verified. Please try again later.', 'usage_unavailable', 503)
  if (data.state === 'reserved') return
  if (data.state === 'limited') throw new UsageGuardError('Your included image storage is full. Remove an unused image before uploading another. No extra charge was made.', 'image_storage_limit', 409)
  if (data.state === 'ineligible') throw new UsageGuardError('Image uploads are paused while your subscription needs attention.', 'billing_suspended', 402)
  if (data.state === 'platform_capacity') throw new UsageGuardError('Preview image storage is currently at capacity. Please try again later or contact support.', 'preview_storage_capacity', 503)
  throw new UsageGuardError('This image upload could not be safely started. Please try again.', 'usage_unavailable', 503)
}

export async function confirmCustomerImage(client: SupabaseClient, owner: string, storagePath: string): Promise<void> {
  const { error } = await client.rpc('confirm_customer_image', { p_owner: owner, p_path: storagePath })
  if (error) console.error('[site-usage] image reservation could not be reconciled')
}

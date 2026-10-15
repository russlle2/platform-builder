import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

const STAGING_ORIGIN = 'https://dailyclarity-staging.netlify.app'
const STAGING_PROJECT = 'yuviqftugmasjypkhrpo'
const SUPABASE_ORIGIN = `https://${STAGING_PROJECT}.supabase.co`
const PRODUCTION_ORIGIN = 'https://dailyclarity.org'
const PRODUCTION_PROJECT = 'psxmvaushwsboogfnyqi'
export const AUTH_EMAIL_BODY_LIMIT = 64 * 1024

export class AuthEmailHookError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

export interface AuthEmailHookConfig {
  secrets: Buffer[]
  appOrigin: string
  supabaseOrigin: string
  allowProductionCallbacks?: boolean
}

function decodeBase64(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null
  const bytes = Buffer.from(value, 'base64')
  return bytes.toString('base64') === value ? bytes : null
}

/** Production additionally requires explicit review of this project's shared Auth consumers. */
export function authEmailHookConfig(env: Record<string, string | undefined> = process.env): AuthEmailHookConfig | null {
  if (env.SUPABASE_AUTH_EMAIL_HOOK_ENABLED !== 'true'
    || !env.POSTMARK_SERVER_TOKEN || !env.EMAIL_FROM_ADDRESS) return null
  const production = env.DAILYCLARITY_ENVIRONMENT === 'production'
  if (!production && env.DAILYCLARITY_ENVIRONMENT !== 'staging') return null
  if (production && env.SUPABASE_AUTH_EMAIL_HOOK_SHARED_PROJECT_REVIEWED !== 'true') return null
  const project = production ? PRODUCTION_PROJECT : STAGING_PROJECT
  const appOrigin = production ? PRODUCTION_ORIGIN : STAGING_ORIGIN
  const supabaseOrigin = production ? `https://${project}.supabase.co` : SUPABASE_ORIGIN
  if (env.DAILYCLARITY_SUPABASE_PROJECT_REF !== project
    || env.NEXT_PUBLIC_SUPABASE_URL !== supabaseOrigin
    || env.NEXT_PUBLIC_SITE_URL !== appOrigin) return null
  const encoded = (env.SUPABASE_AUTH_EMAIL_HOOK_SECRET || '').split('|')
  if (encoded.length < 1 || encoded.length > 2) return null
  const secrets: Buffer[] = []
  for (const value of encoded) {
    if (!value.startsWith('v1,whsec_')) return null
    const bytes = decodeBase64(value.slice('v1,whsec_'.length))
    if (!bytes || bytes.length !== 32) return null
    secrets.push(bytes)
  }
  return { secrets, appOrigin, supabaseOrigin, allowProductionCallbacks: production }
}

/** Standard Webhooks v1: authenticate the exact bytes before parsing any JSON.
 * The five-minute freshness window limits replay; provider retries may resend the
 * same email. This does not claim distributed, exactly-once delivery.
 */
export function verifyAuthEmailSignature(
  body: Uint8Array, headers: Headers, secrets: readonly Uint8Array[], now = Date.now(),
): boolean {
  const id = headers.get('webhook-id') || ''
  const timestamp = headers.get('webhook-timestamp') || ''
  const signatures = headers.get('webhook-signature') || ''
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id) || !/^\d{1,12}$/.test(timestamp)
    || !signatures || signatures.length > 2048) return false
  const seconds = Number(timestamp)
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > 300) return false
  const candidates = signatures.split(' ').flatMap((entry) => {
    const parts = entry.split(',')
    if (parts.length !== 2 || parts[0] !== 'v1') return []
    const bytes = decodeBase64(parts[1])
    return bytes?.length === 32 ? [bytes] : []
  })
  let valid = false
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(`${id}.${timestamp}.`).update(body).digest()
    for (const candidate of candidates) valid = timingSafeEqual(expected, candidate) || valid
  }
  return valid
}

export async function readAuthEmailBody(request: Request): Promise<Uint8Array> {
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > AUTH_EMAIL_BODY_LIMIT)) {
    throw new AuthEmailHookError(413, 'Authentication email request is too large.')
  }
  const reader = request.body?.getReader()
  if (!reader) throw new AuthEmailHookError(400, 'Invalid authentication email request.')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > AUTH_EMAIL_BODY_LIMIT) {
        await reader.cancel()
        throw new AuthEmailHookError(413, 'Authentication email request is too large.')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, length)
}

type JsonObject = Record<string, unknown>
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
  return value as JsonObject
}
function invalid() { return new AuthEmailHookError(400, 'Invalid authentication email request.') }
function email(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254
    || !/^[^\s<>(),;:"\\]+@[^\s<>(),;:"\\]+\.[^\s<>(),;:"\\]+$/.test(value)) throw invalid()
  return value
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,512}$/.test(value)) throw invalid()
  return value
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
}

function callback(value: unknown, config: AuthEmailHookConfig): string {
  if (typeof value !== 'string' || value.length > 2048) throw invalid()
  let parsed: URL
  try { parsed = new URL(value) } catch { throw invalid() }
  // Supabase may supply its exact configured Site URL when no redirect was requested.
  if ((value === config.appOrigin || value === `${config.appOrigin}/`)) {
    return `${config.appOrigin}/auth/callback`
  }
  const productionOrigin = config.allowProductionCallbacks && parsed.protocol === 'https:' && !parsed.port && (
    ['dailyclarity.org', 'hvac.dailyclarity.org', 'legal.dailyclarity.org', 'dental.dailyclarity.org'].includes(parsed.hostname)
    || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.netlify\.app$/.test(parsed.hostname)
  )
  if ((parsed.origin !== config.appOrigin && !productionOrigin) || parsed.username || parsed.password || parsed.hash
    || parsed.pathname !== '/auth/callback'
    || [...parsed.searchParams.keys()].some((key) => key !== 'next')
    || parsed.searchParams.getAll('next').length > 1) throw invalid()
  const next = parsed.searchParams.get('next')
  if (next !== null) parsed.searchParams.set('next', getSafeRedirectPath(next))
  return parsed.toString()
}

export interface AuthEmailMessage {
  to: string
  subject: string
  htmlBody: string
  textBody: string
  disableTracking: true
}

/** Never use user_metadata, payload site_url, or a caller-supplied verify origin. */
export function buildAuthEmails(body: Uint8Array, config: AuthEmailHookConfig): AuthEmailMessage[] {
  let payload: JsonObject
  try { payload = object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body))) }
  catch { throw invalid() }
  const user = object(payload.user)
  const data = object(payload.email_data)
  const action = data.email_action_type
  const currentEmail = email(user.email)
  const message = (to: string, subject: string, instruction: string, url?: string, code?: string, notification = false): AuthEmailMessage => ({
    to, subject, disableTracking: true,
    htmlBody: `<!doctype html><html lang="en"><body><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(instruction)}</p>${url ? `<p><a href="${escapeHtml(url)}">Continue securely</a></p>` : code ? `<p><strong>${escapeHtml(code)}</strong></p>` : ''}<p>${notification ? 'If you did not make this change, contact support immediately.' : 'If you did not request this email, you can ignore it.'}</p></body></html>`,
    textBody: `${subject}\n\n${instruction}${url || code ? `\n\n${url || code}` : ''}\n\n${notification ? 'If you did not make this change, contact support immediately.' : 'If you did not request this email, you can ignore it.'}`,
  })
  const notifications: Record<string, string> = {
    password_changed_notification: 'Your account password was changed.',
    email_changed_notification: 'Your account email address was changed.',
    phone_changed_notification: 'Your account phone number was changed.',
    identity_linked_notification: 'A sign-in method was added to your account.',
    identity_unlinked_notification: 'A sign-in method was removed from your account.',
    mfa_factor_enrolled_notification: 'A verification method was added to your account.',
    mfa_factor_unenrolled_notification: 'A verification method was removed from your account.',
  }
  if (typeof action === 'string' && Object.prototype.hasOwnProperty.call(notifications, action)) {
    // Match Supabase's own mailer: notify the old address after an email change.
    const recipient = action === 'email_changed_notification' ? email(data.old_email) : currentEmail
    return [message(recipient, 'Your account security settings changed', notifications[action], undefined, undefined, true)]
  }
  if (action === 'reauthentication') {
    if (typeof data.token !== 'string' || !/^\d{4,12}$/.test(data.token)) throw invalid()
    return [message(currentEmail, 'Confirm your DailyClarity request', 'Enter this verification code in the page where you requested it.', undefined, data.token)]
  }
  const subjects: Record<string, string> = {
    signup: 'Confirm your DailyClarity account', invite: 'Accept your DailyClarity invitation',
    magiclink: 'Sign in to DailyClarity', recovery: 'Reset your DailyClarity password',
    email: 'Confirm your DailyClarity email', email_change: 'Confirm your DailyClarity email change',
  }
  if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(subjects, action)) {
    throw new AuthEmailHookError(400, 'This authentication email type is not supported.')
  }
  const redirect = callback(data.redirect_to, config)
  const link = (tokenHash: unknown) => {
    const url = new URL('/auth/v1/verify', config.supabaseOrigin)
    url.searchParams.set('token', hash(tokenHash))
    url.searchParams.set('type', action)
    url.searchParams.set('redirect_to', redirect)
    return url.toString()
  }
  if (action === 'email_change') {
    const newEmail = email(user.new_email)
    // Supabase's secure-change mapping is deliberately asymmetric:
    // current address gets token_hash_new; new address gets token_hash.
    const messages = [message(newEmail, subjects[action], 'Confirm that you want to use this email address for DailyClarity.', link(data.token_hash))]
    if (data.token_hash_new) messages.unshift(message(currentEmail, subjects[action], 'Confirm your request to change your DailyClarity email address.', link(data.token_hash_new)))
    return messages
  }
  return [message(currentEmail, subjects[action], 'Use this secure link to continue your DailyClarity request.', link(data.token_hash))]
}

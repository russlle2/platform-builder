import crypto from 'crypto'
import { isDraftImageOwner } from './image-owner'

export const UPLOAD_SESSION_COOKIE = 'dc_upload_session'
export const UPLOAD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90
const UPLOAD_SESSION_VERSION = 'v1'
const MAX_CLOCK_SKEW_SECONDS = 5 * 60

function getSecret(): string | null {
  return process.env.UPLOAD_TOKEN_SECRET || process.env.PORTAL_TOKEN_SECRET || null
}

function signPayload(payload: string): string | null {
  const secret = getSecret()
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createUploadSessionValue(owner: string): string | null {
  if (!isDraftImageOwner(owner)) return null
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = `${UPLOAD_SESSION_VERSION}.${owner}.${issuedAt}`
  const signature = signPayload(payload)
  return signature ? `${payload}.${signature}` : null
}

export function verifyUploadSessionValue(value: string | null | undefined): string | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [version, owner, issuedAtRaw, provided] = parts
  if (version !== UPLOAD_SESSION_VERSION || !/^\d{10}$/.test(issuedAtRaw)) return null
  if (!isDraftImageOwner(owner)) return null
  const issuedAt = Number(issuedAtRaw)
  const now = Math.floor(Date.now() / 1000)
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
    now - issuedAt >= UPLOAD_SESSION_MAX_AGE_SECONDS
  ) return null
  const expected = signPayload(`${version}.${owner}.${issuedAtRaw}`)
  if (!expected) return null
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? owner : null
}

export function createDraftImageOwner(): string {
  return `draft-${crypto.randomUUID()}`
}

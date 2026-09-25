import crypto from 'crypto'

export const DRAFT_PROFILE_COOKIE = 'dc_draft_profile'

function getSecret(): string | null {
  return process.env.DRAFT_PROFILE_SECRET || process.env.PORTAL_TOKEN_SECRET || null
}

function sign(encodedDraftId: string): string | null {
  const secret = getSecret()
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(encodedDraftId).digest('base64url')
}

export function createDraftProfileSession(draftId: string): string | null {
  const normalized = draftId.trim().toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    return null
  }
  const encoded = Buffer.from(normalized, 'utf8').toString('base64url')
  const signature = sign(encoded)
  return signature ? `${encoded}.${signature}` : null
}

export function verifyDraftProfileSession(value: string | null | undefined): string | null {
  if (!value) return null
  const separator = value.lastIndexOf('.')
  if (separator < 1) return null
  const encoded = value.slice(0, separator)
  const provided = value.slice(separator + 1)
  const expected = sign(encoded)
  if (!expected) return null
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const draftId = Buffer.from(encoded, 'base64url').toString('utf8')
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(draftId)
      ? draftId
      : null
  } catch {
    return null
  }
}

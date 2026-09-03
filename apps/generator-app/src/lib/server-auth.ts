/**
 * Server-side authentication and rate-limiting utilities.
 *
 * Internal admin auth uses INTERNAL_ADMIN_TOKEN env var.
 * Rate limiting is in-memory (resets on cold start) — suitable for serverless
 * as a first-line defense; complement with edge-level rate limiting for strict enforcement.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { isIP } from 'node:net'

// ─── Rate Limiting ────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  windowStart: number
  expiresAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const MAX_RATE_LIMIT_KEYS = 10_000

function normalizeIp(value: string | null): string | null {
  if (!value) return null
  const candidate = value.trim()
  return candidate.length <= 64 && isIP(candidate) ? candidate : null
}

function getClientIp(req: NextRequest | Request): string {
  const r = req as NextRequest
  // Netlify strips and supplies this header at its trusted edge. Prefer it over
  // X-Forwarded-For, whose left-most value can be supplied by the caller.
  const netlifyIp = normalizeIp(r.headers?.get('x-nf-client-connection-ip'))
  if (netlifyIp) return netlifyIp
  if (process.env.NETLIFY === 'true') return 'unknown'

  // Local development and non-Netlify reverse proxies may not supply the
  // platform header. Keep a validated fallback without accepting arbitrary
  // strings as unbounded map keys.
  return (
    normalizeIp(r.headers?.get('x-forwarded-for')?.split(',')[0] || null) ||
    normalizeIp(r.headers?.get('x-real-ip')) ||
    'unknown'
  )
}

function pruneExpiredRateLimits(now: number): void {
  for (const [key, entry] of rateLimitStore) {
    if (entry.expiresAt <= now) rateLimitStore.delete(key)
  }
}

/**
 * Simple in-memory rate limiter keyed by IP + key.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function rateLimitByIp(
  req: NextRequest | Request,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const ip = getClientIp(req)
  const storeKey = `${key}:${ip}`
  const now = Date.now()
  const entry = rateLimitStore.get(storeKey)

  if (!entry || now - entry.windowStart > windowMs) {
    if (!entry && rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
      pruneExpiredRateLimits(now)
      // Bound memory during a distributed/spoofed-IP flood. Established keys
      // continue to work, while new keys fail closed until capacity expires.
      if (rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) return false
    }
    rateLimitStore.set(storeKey, { count: 1, windowStart: now, expiresAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function jsonUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
}

export function jsonForbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
}

export function jsonTooManyRequests(): NextResponse {
  return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
}

// ─── Internal admin auth ──────────────────────────────────────────────────────

/**
 * Extract bearer token from Authorization header or x-internal-admin-token header.
 */
export function getBearerToken(req: NextRequest | Request): string | null {
  const r = req as NextRequest
  const authHeader = r.headers?.get('authorization') || ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  return r.headers?.get('x-internal-admin-token') || null
}

/**
 * Returns true if request carries a valid INTERNAL_ADMIN_TOKEN.
 * If the env var is not set, always returns false (fail closed).
 */
export function requireInternalAdmin(req: NextRequest | Request): boolean {
  const expected = process.env.INTERNAL_ADMIN_TOKEN
  if (!expected) return false
  const token = getBearerToken(req)
  if (!token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Returns a 401/403 NextResponse if not admin, null if authorized.
 * Usage: const authError = requireInternalAdminOrThrow(req); if (authError) return authError;
 */
export function requireInternalAdminOrThrow(req: NextRequest | Request): NextResponse | null {
  const expected = process.env.INTERNAL_ADMIN_TOKEN
  if (!expected) {
    return jsonForbidden()
  }
  const token = getBearerToken(req)
  if (!token) {
    return jsonUnauthorized()
  }
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return jsonForbidden()
  }
  return null
}

export function isInternalAdmin(req: NextRequest | Request): boolean {
  return requireInternalAdmin(req)
}

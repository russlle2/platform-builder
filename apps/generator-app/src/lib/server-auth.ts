/**
 * Server-side authentication and rate-limiting utilities.
 *
 * Internal admin auth uses INTERNAL_ADMIN_TOKEN env var.
 * Rate limiting is in-memory (resets on cold start) — suitable for serverless
 * as a first-line defense; complement with edge-level rate limiting for strict enforcement.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ─── Rate Limiting ────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIp(req: NextRequest | Request): string {
  const r = req as NextRequest
  return (
    r.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    r.headers?.get('x-real-ip') ||
    'unknown'
  )
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
    rateLimitStore.set(storeKey, { count: 1, windowStart: now })
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

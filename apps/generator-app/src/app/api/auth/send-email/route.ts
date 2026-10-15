import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import {
  AuthEmailHookError, authEmailHookConfig, buildAuthEmails,
  readAuthEmailBody, verifyAuthEmailSignature,
} from '@/lib/auth-email-hook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function reply(status: number, message?: string) {
  return NextResponse.json(message ? { error: { http_code: status, message } } : {}, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      ...(status === 503 ? { 'Retry-After': '1' } : {}),
    },
  })
}

export async function POST(request: Request) {
  const config = authEmailHookConfig()
  if (!config) return reply(503, 'Authentication email delivery is unavailable.')
  try {
    const body = await readAuthEmailBody(request)
    if (!verifyAuthEmailSignature(body, request.headers, config.secrets)) {
      return reply(401, 'Invalid authentication email signature.')
    }
    const messages = buildAuthEmails(body, config)
    await Promise.all(messages.map((message) => sendEmail({ ...message, timeoutMs: 2500 })))
    return reply(200)
  } catch (error) {
    if (error instanceof AuthEmailHookError) return reply(error.status, error.message)
    // Provider errors may reflect a credential link. Never log or return them.
    return reply(503, 'Authentication email delivery failed. Please retry.')
  }
}

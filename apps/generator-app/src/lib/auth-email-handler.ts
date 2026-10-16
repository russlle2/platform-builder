import { sendEmail } from './email'
import {
  AuthEmailHookError, authEmailHookConfig, buildAuthEmails,
  readAuthEmailBody, verifyAuthEmailSignature,
} from './auth-email-hook'

function reply(status: number, message?: string): Response {
  return new Response(JSON.stringify(message ? { error: { http_code: status, message } } : {}), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 503 ? { 'Retry-After': '1' } : {}),
      ...(status === 405 ? { Allow: 'POST' } : {}),
    },
  })
}

/** Keep the synchronous Auth hook independent of Next's server initialization. */
export async function handleAuthEmailHook(request: Request): Promise<Response> {
  if (request.method !== 'POST') return reply(405, 'Method not allowed.')
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

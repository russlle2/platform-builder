import { handleAuthEmailHook } from '../../apps/generator-app/src/lib/auth-email-handler'

/** Auth's five-second hook budget must not include booting the Next server. */
export default async function handler(request: Request): Promise<Response> {
  const response = await handleAuthEmailHook(request)
  // Safe readback distinguishes this route from the local Next fallback.
  response.headers.set('X-DailyClarity-Auth-Handler', 'netlify-function-v1')
  return response
}

export const config = {
  path: '/api/auth/send-email',
}

/**
 * Distributed edge protection for public and bearer-authorized APIs. One rule
 * intentionally covers every path so this plus the private fulfillment-worker
 * rule fits Netlify's two-rule allowance on entry-level plans. Route handlers
 * retain their tighter, endpoint-specific local limits as defense in depth.
 */
export default async function costApiRateLimit(_request, context) {
  return context.next()
}

export const config = {
  path: [
    '/api/chat',
    '/api/stripe/checkout',
    '/api/stripe/custom-build',
    '/api/stripe/portal',
    '/api/forms/contact',
    '/api/intake/contact',
    '/api/leads',
    '/api/profile/save-draft',
    '/api/slug/check',
    '/api/upload',
    '/api/upload/session',
    '/api/portal/customer',
    '/api/sites/domain',
  ],
  // GET protects authenticated database/DNS reads (portal, image library,
  // draft load, domain checks) as well as the public write endpoints below.
  method: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}

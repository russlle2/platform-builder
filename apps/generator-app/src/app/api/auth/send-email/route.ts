import { handleAuthEmailHook } from '@/lib/auth-email-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local Next development and non-Netlify deployments retain the same endpoint.
export const POST = handleAuthEmailHook

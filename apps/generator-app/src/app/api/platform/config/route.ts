import { NextResponse } from 'next/server'
import { getPublicPlatformConfig } from '@/lib/platform-config'

/**
 * GET /api/platform/config
 * Public launch settings for client UI (no secrets).
 */
export async function GET() {
  return NextResponse.json(getPublicPlatformConfig())
}

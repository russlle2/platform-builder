import { NextRequest, NextResponse } from 'next/server'
import {
  createDraftImageOwner,
  createUploadSessionValue,
  UPLOAD_SESSION_COOKIE,
  UPLOAD_SESSION_MAX_AGE_SECONDS,
  verifyUploadSessionValue,
} from '@/lib/upload-session'
import { jsonTooManyRequests, rateLimitByIp } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'upload-session', 20, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  const existing = verifyUploadSessionValue(req.cookies.get(UPLOAD_SESSION_COOKIE)?.value)
  const owner = existing || createDraftImageOwner()
  const cookieValue = createUploadSessionValue(owner)
  if (!cookieValue) {
    return NextResponse.json({ error: 'Image uploads are not configured.' }, { status: 503 })
  }

  const response = NextResponse.json({ owner })
  response.cookies.set(UPLOAD_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: UPLOAD_SESSION_MAX_AGE_SECONDS,
  })
  return response
}

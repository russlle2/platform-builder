import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  storeCustomerImage,
  listCustomerImages,
  deleteCustomerImage,
  normalizeImageOwner,
} from '@/lib/customer-images'
import { getPortalTokenFromRequest, validatePortalTokenForSlug } from '@/lib/portal-auth'
import { rateLimitByIp, jsonTooManyRequests, jsonUnauthorized } from '@/lib/server-auth'
import { UPLOAD_SESSION_COOKIE, verifyUploadSessionValue } from '@/lib/upload-session'
import { isAuthenticatedPortalOwnerForSlug } from '@/lib/portal-owner-auth'
import { isDraftImageOwner } from '@/lib/image-owner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function isAuthorizedForOwner(request: NextRequest, owner: string): Promise<boolean> {
  if (isDraftImageOwner(owner)) {
    const cookieOwner = verifyUploadSessionValue(
      request.cookies.get(UPLOAD_SESSION_COOKIE)?.value,
    )
    return cookieOwner === owner
  }

  if (!supabaseUrl || !supabaseServiceKey) return false
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const token = getPortalTokenFromRequest(request)
  if (token && await validatePortalTokenForSlug(supabase, owner, token)) return true
  return isAuthenticatedPortalOwnerForSlug(supabase, owner)
}

export async function POST(request: NextRequest) {
  const allowed = rateLimitByIp(request, 'upload', 20, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const owner = normalizeImageOwner(
      (formData.get('owner') as string) || request.nextUrl.searchParams.get('owner') || '',
    )

    if (!file || owner === 'anonymous') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!(await isAuthorizedForOwner(request, owner))) return jsonUnauthorized()

    const stored = await storeCustomerImage(owner, file)

    return NextResponse.json({
      success: true,
      url: stored.url,
      path: stored.path,
      filename: stored.filename,
      size: stored.size,
      uploadedAt: stored.uploadedAt,
      owner,
      embedded: false,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json(
      { error: 'The image could not be processed. Use a valid JPEG, PNG, GIF, WebP, or AVIF under 4MB.' },
      { status: 400 },
    )
  }
}

export async function GET(request: NextRequest) {
  if (!rateLimitByIp(request, 'upload-list', 60, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }
  try {
    const owner = normalizeImageOwner(request.nextUrl.searchParams.get('owner') || '')
    if (!owner || owner === 'anonymous') {
      return NextResponse.json({ error: 'Owner is required.' }, { status: 400 })
    }
    if (!(await isAuthorizedForOwner(request, owner))) return jsonUnauthorized()
    const images = await listCustomerImages(owner)
    return NextResponse.json({ images, owner })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!rateLimitByIp(request, 'upload-delete', 20, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }
  try {
    const owner = normalizeImageOwner(request.nextUrl.searchParams.get('owner') || '')
    const storagePath = request.nextUrl.searchParams.get('path') || request.nextUrl.searchParams.get('filename')

    if (!owner || !storagePath) {
      return NextResponse.json({ error: 'owner and path are required' }, { status: 400 })
    }
    if (!(await isAuthorizedForOwner(request, owner))) return jsonUnauthorized()

    await deleteCustomerImage(owner, storagePath)
    return NextResponse.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}

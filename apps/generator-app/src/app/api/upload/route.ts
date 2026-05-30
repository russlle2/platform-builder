import { NextRequest, NextResponse } from 'next/server'
import {
  storeCustomerImage,
  listCustomerImages,
  deleteCustomerImage,
  normalizeImageOwner,
} from '@/lib/customer-images'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  const allowed = rateLimitByIp(request, 'upload', 20, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const owner = normalizeImageOwner(
      (formData.get('owner') as string) || request.nextUrl.searchParams.get('owner') || 'anonymous',
    )

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

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
    const message = error instanceof Error ? error.message : 'Upload failed. Please try again.'
    console.error('[upload]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const owner = normalizeImageOwner(request.nextUrl.searchParams.get('owner') || '')
    if (!owner || owner === 'anonymous') {
      return NextResponse.json({ images: [] })
    }
    const images = await listCustomerImages(owner)
    return NextResponse.json({ images, owner })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = normalizeImageOwner(request.nextUrl.searchParams.get('owner') || '')
    const storagePath = request.nextUrl.searchParams.get('path') || request.nextUrl.searchParams.get('filename')

    if (!owner || !storagePath) {
      return NextResponse.json({ error: 'owner and path are required' }, { status: 400 })
    }

    await deleteCustomerImage(owner, storagePath)
    return NextResponse.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}

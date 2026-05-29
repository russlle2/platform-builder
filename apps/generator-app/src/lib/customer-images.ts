/**
 * Server-side customer image storage (Supabase Storage).
 * Falls back to local public/uploads when Supabase is not configured.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

export const CUSTOMER_IMAGES_BUCKET = 'customer-images'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

export interface StoredCustomerImage {
  url: string
  path: string
  filename: string
  size: number
  uploadedAt: string
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Safe storage prefix: site slug or draft UUID. */
export function normalizeImageOwner(owner: string): string {
  const trimmed = (owner || '').trim().toLowerCase()
  if (!trimmed) return 'anonymous'
  if (trimmed.startsWith('draft-')) {
    return trimmed.replace(/[^a-z0-9-]/g, '-').slice(0, 64)
  }
  return trimmed
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'anonymous'
}

export function getPublicStorageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return storagePath
  return `${base}/storage/v1/object/public/${CUSTOMER_IMAGES_BUCKET}/${storagePath}`
}

async function optimizeToWebp(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer, { animated: true })
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return buffer
  }
}

async function uploadToSupabase(
  owner: string,
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<StoredCustomerImage> {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase not configured')

  const safeOwner = normalizeImageOwner(owner)
  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 40)
  const storagePath = `${safeOwner}/${Date.now()}-${baseName}.webp`

  const { error } = await supabase.storage
    .from(CUSTOMER_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentType || 'image/webp',
      upsert: false,
      cacheControl: '31536000',
    })

  if (error) {
    throw new Error(error.message)
  }

  return {
    url: getPublicStorageUrl(storagePath),
    path: storagePath,
    filename: path.basename(storagePath),
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  }
}

async function uploadToLocal(
  owner: string,
  buffer: Buffer,
  originalName: string,
): Promise<StoredCustomerImage> {
  const safeOwner = normalizeImageOwner(owner)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeOwner)
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }
  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 40)
  const fileName = `${Date.now()}-${baseName}.webp`
  const filePath = path.join(uploadDir, fileName)
  await writeFile(filePath, buffer)
  const publicPath = `/uploads/${safeOwner}/${fileName}`
  return {
    url: publicPath,
    path: publicPath,
    filename: fileName,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  }
}

export async function storeCustomerImage(
  owner: string,
  file: File,
): Promise<StoredCustomerImage> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Upload JPEG, PNG, GIF, or WebP.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  const bytes = await file.arrayBuffer()
  const inputBuffer = Buffer.from(bytes)
  const webpBuffer = await optimizeToWebp(inputBuffer)

  if (getSupabaseAdmin()) {
    return uploadToSupabase(owner, webpBuffer, 'image/webp', file.name)
  }
  return uploadToLocal(owner, webpBuffer, file.name)
}

export async function listCustomerImages(owner: string): Promise<StoredCustomerImage[]> {
  const safeOwner = normalizeImageOwner(owner)
  const supabase = getSupabaseAdmin()

  if (supabase) {
    const { data, error } = await supabase.storage
      .from(CUSTOMER_IMAGES_BUCKET)
      .list(safeOwner, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    if (error || !data) return []

    return data
      .filter((f) => f.name && !f.name.endsWith('/'))
      .map((f) => {
        const storagePath = `${safeOwner}/${f.name}`
        return {
          url: getPublicStorageUrl(storagePath),
          path: storagePath,
          filename: f.name,
          size: (f.metadata?.size as number) || 0,
          uploadedAt: f.created_at || new Date().toISOString(),
        }
      })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeOwner)
  if (!existsSync(uploadDir)) return []

  const files = await readdir(uploadDir)
  const images = await Promise.all(
    files
      .filter((f) => /\.(webp|jpg|jpeg|png|gif)$/i.test(f))
      .map(async (f) => {
        const stats = await stat(path.join(uploadDir, f))
        const publicPath = `/uploads/${safeOwner}/${f}`
        return {
          url: publicPath,
          path: publicPath,
          filename: f,
          size: stats.size,
          uploadedAt: stats.birthtime.toISOString(),
        }
      }),
  )
  images.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  return images
}

export async function deleteCustomerImage(owner: string, storagePath: string): Promise<void> {
  const safeOwner = normalizeImageOwner(owner)
  const supabase = getSupabaseAdmin()

  if (supabase) {
    const normalized = storagePath.startsWith(safeOwner)
      ? storagePath
      : `${safeOwner}/${storagePath.replace(/^\/+/, '')}`
    const { error } = await supabase.storage.from(CUSTOMER_IMAGES_BUCKET).remove([normalized])
    if (error) throw new Error(error.message)
    return
  }

  const filePath = path.join(
    process.cwd(),
    'public',
    storagePath.replace(/^\//, '').replace(/^uploads\//, 'uploads/'),
  )
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}

/** Copy all images from draft owner folder to site slug (post-purchase). */
export async function migrateImagesToSiteSlug(
  draftOwner: string,
  siteSlug: string,
): Promise<number> {
  const from = normalizeImageOwner(draftOwner)
  const to = normalizeImageOwner(siteSlug)
  if (from === to) return 0

  const supabase = getSupabaseAdmin()
  if (!supabase) return 0

  const { data: files, error } = await supabase.storage.from(CUSTOMER_IMAGES_BUCKET).list(from)
  if (error || !files?.length) return 0

  let moved = 0
  for (const f of files) {
    if (!f.name || f.name.endsWith('/')) continue
    const fromPath = `${from}/${f.name}`
    const toPath = `${to}/${f.name}`
    const { data: blob, error: dlErr } = await supabase.storage
      .from(CUSTOMER_IMAGES_BUCKET)
      .download(fromPath)
    if (dlErr || !blob) continue
    const buffer = Buffer.from(await blob.arrayBuffer())
    const { error: upErr } = await supabase.storage
      .from(CUSTOMER_IMAGES_BUCKET)
      .upload(toPath, buffer, { contentType: 'image/webp', upsert: true })
    if (!upErr) {
      await supabase.storage.from(CUSTOMER_IMAGES_BUCKET).remove([fromPath])
      moved++
    }
  }
  return moved
}

/** Rewrite image swap URLs from draft paths to site slug paths after migration. */
export function rewriteImageSwapUrls(
  imageSwaps: Record<string, { original: string; updated: string; originalRelative?: string }[]>,
  draftOwner: string,
  siteSlug: string,
): Record<string, { original: string; updated: string; originalRelative?: string }[]> {
  const from = normalizeImageOwner(draftOwner)
  const to = normalizeImageOwner(siteSlug)
  const out: typeof imageSwaps = {}
  for (const [page, swaps] of Object.entries(imageSwaps)) {
    out[page] = swaps.map((s) => ({
      ...s,
      updated: s.updated.replace(`/${from}/`, `/${to}/`),
    }))
  }
  return out
}

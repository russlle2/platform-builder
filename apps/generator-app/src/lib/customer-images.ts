/**
 * Server-side customer image storage (Supabase Storage).
 * Local storage is available only in development; production fails closed so
 * an ephemeral serverless filesystem can never be reported as durable.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { isDraftImageOwner } from './image-owner'

export const CUSTOMER_IMAGES_BUCKET = 'customer-images'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]

// Netlify's buffered function payload limit is 6 MB before base64/multipart
// overhead. Four MiB leaves enough room for transport encoding and headers.
const MAX_FILE_SIZE = 4 * 1024 * 1024

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
  const image = sharp(buffer, { animated: true, limitInputPixels: 40_000_000 })
  const metadata = await image.metadata()
  if (!metadata.format || !['jpeg', 'png', 'gif', 'webp', 'avif'].includes(metadata.format)) {
    throw new Error('Invalid image content.')
  }
  return image
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
}

/** Resolve an object path only when it belongs to the exact owner prefix. */
export function normalizeOwnedStoragePath(owner: string, storagePath: string): string {
  const safeOwner = normalizeImageOwner(owner)
  const candidate = storagePath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!candidate || candidate.includes('\0')) throw new Error('Invalid storage path')
  if (candidate.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Invalid storage path')
  }
  if (!candidate.includes('/')) return `${safeOwner}/${candidate}`
  if (!candidate.startsWith(`${safeOwner}/`)) throw new Error('Invalid storage path')
  return candidate
}

/** Resolve one generated customer-image URL back to a path beneath its owner. */
export function getCustomerImageRelativePath(owner: string, imageUrl: string): string | null {
  const safeOwner = normalizeImageOwner(owner)
  let segments: string[]
  try {
    const pathname = new URL(imageUrl, 'https://local.invalid').pathname
    segments = pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
  } catch {
    return null
  }

  const ownerIndex = segments.findIndex((segment, index) => (
    segment === safeOwner &&
    index > 0 &&
    (segments[index - 1] === CUSTOMER_IMAGES_BUCKET || segments[index - 1] === 'uploads')
  ))
  if (ownerIndex < 0 || ownerIndex === segments.length - 1) return null

  const relativePath = segments.slice(ownerIndex + 1).join('/')
  try {
    const ownedPath = normalizeOwnedStoragePath(safeOwner, `${safeOwner}/${relativePath}`)
    return ownedPath.slice(safeOwner.length + 1)
  } catch {
    return null
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
    throw new Error('File too large. Maximum size is 4MB.')
  }

  const bytes = await file.arrayBuffer()
  const inputBuffer = Buffer.from(bytes)
  const webpBuffer = await optimizeToWebp(inputBuffer)

  if (getSupabaseAdmin()) {
    return uploadToSupabase(owner, webpBuffer, 'image/webp', file.name)
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Durable image storage is not configured.')
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

  if (process.env.NODE_ENV === 'production') return []

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
    const normalized = normalizeOwnedStoragePath(safeOwner, storagePath)
    const { error } = await supabase.storage.from(CUSTOMER_IMAGES_BUCKET).remove([normalized])
    if (error) throw new Error(error.message)
    return
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Durable image storage is not configured.')
  }

  // Path traversal prevention: resolve and verify the candidate path stays
  // within the owner's upload directory before deleting.
  const uploadRoot = path.resolve(process.cwd(), 'public', 'uploads', safeOwner)
  const filename = path.basename(storagePath)
  const candidate = path.resolve(uploadRoot, filename)
  if (!candidate.startsWith(uploadRoot + path.sep)) {
    throw new Error('Invalid storage path')
  }

  if (existsSync(candidate)) {
    await unlink(candidate)
  }
}

/**
 * Copy all images from a draft owner folder to a site slug (post-purchase).
 *
 * Source objects are intentionally retained. Fulfillment is an at-least-once
 * workflow: a later database, deployment, or email failure can retry the whole
 * job. Keeping the immutable draft source makes that retry safe even after the
 * first copy succeeded. Old draft objects can be removed later by a separate
 * retention job, after the order has reached a terminal successful state.
 */
export async function migrateImagesToSiteSlug(
  draftOwner: string,
  siteSlug: string,
  referencedImageUrls: readonly string[] = [],
): Promise<number> {
  const from = normalizeImageOwner(draftOwner)
  const to = normalizeImageOwner(siteSlug)
  if (!isDraftImageOwner(from)) throw new Error('Invalid draft image owner.')
  if (!to || to === 'anonymous' || from === to) throw new Error('Invalid destination site slug.')

  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase image storage is not configured.')

  const bucket = supabase.storage.from(CUSTOMER_IMAGES_BUCKET)
  let relativePaths: string[]
  if (referencedImageUrls.length > 0) {
    relativePaths = referencedImageUrls.map((url) => {
      const relativePath = getCustomerImageRelativePath(from, url)
      if (!relativePath) throw new Error('A referenced draft image URL is invalid.')
      return relativePath
    })
  } else {
    const { data: files, error } = await bucket.list(from, { limit: 1_000 })
    if (error) throw new Error(`Unable to list draft images: ${error.message}`)
    relativePaths = (files || [])
      .filter((file) => file.name && !file.name.endsWith('/'))
      .map((file) => file.name)
  }
  relativePaths = [...new Set(relativePaths)]
  if (relativePaths.length === 0) return 0

  let durableCount = 0
  // Keep concurrency bounded: checkout can contain many swaps, while each
  // object requires a download plus an idempotent upload.
  for (let offset = 0; offset < relativePaths.length; offset += 8) {
    const batch = relativePaths.slice(offset, offset + 8)
    const results = await Promise.all(batch.map(async (relativePath) => {
      const fromPath = `${from}/${relativePath}`
      const toPath = `${to}/${relativePath}`
      const { data: blob, error: downloadError } = await bucket.download(fromPath)

      if (downloadError || !blob) {
        // A previous attempt may have copied successfully and then failed in a
        // later provisioning step. Accept that exact durable destination so a
        // retry does not depend on the draft source still existing.
        const { data: existing, error: existingError } = await bucket.download(toPath)
        if (!existingError && existing) return 1
        throw new Error(
          `Unable to recover draft image ${relativePath}: ${downloadError?.message || 'missing source and destination'}`,
        )
      }

      const buffer = Buffer.from(await blob.arrayBuffer())
      const { error: uploadError } = await bucket.upload(toPath, buffer, {
        contentType: blob.type || 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      })
      if (uploadError) {
        throw new Error(`Unable to copy draft image ${relativePath}: ${uploadError.message}`)
      }
      return 1
    }))
    durableCount += results.reduce((sum, count) => sum + count, 0)
  }
  return durableCount
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

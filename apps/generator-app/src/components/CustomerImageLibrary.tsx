'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  fetchCustomerImageLibrary,
  uploadCustomerImageFile,
  getOrCreateImageOwnerId,
} from '@/lib/image-swaps'

interface LibraryImage {
  url: string
  path: string
  filename: string
}

/**
 * Shows the customer's uploaded images for this owner (draft id or site slug).
 * Uploads are stored in Supabase (or local /uploads in dev) and stay available
 * across sessions — they do not disappear on refresh or after purchase.
 */
export function CustomerImageLibrary({
  owner: ownerProp,
  portalToken,
  onPickImage,
  compact = false,
}: {
  owner?: string
  portalToken?: string
  /** When user clicks a saved image (e.g. to paste URL into a swap). */
  onPickImage?: (url: string) => void
  compact?: boolean
}) {
  const [owner, setOwner] = useState(ownerProp || '')
  const [images, setImages] = useState<LibraryImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedOwner = ownerProp || owner

  const refresh = useCallback(async () => {
    const id = ownerProp || getOrCreateImageOwnerId()
    setOwner(id)
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchCustomerImageLibrary(id, portalToken)
      setImages(list)
    } catch {
      setError('Could not load your images.')
    } finally {
      setLoading(false)
    }
  }, [ownerProp, portalToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = resolvedOwner || getOrCreateImageOwnerId()
    setUploading(true)
    setError(null)
    try {
      await uploadCustomerImageFile(file, id, portalToken)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className={`glass-panel rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-bold text-white ${compact ? 'text-sm' : 'text-base'}`}>
          My images
        </h3>
        <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30">
          {uploading ? 'Uploading…' : '+ Upload'}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-xs text-slate-400">
        Images you upload are saved to your account. Click any image in the preview to replace it,
        or upload here and use them anytime.
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {loading ? (
        <p className="text-xs text-slate-500">Loading library…</p>
      ) : images.length === 0 ? (
        <p className="text-xs text-slate-500">No uploads yet. Add a photo above or click an image in the preview.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {images.map((img) => (
            <button
              key={img.path}
              type="button"
              onClick={() => onPickImage?.(img.url)}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              title={onPickImage ? 'Use this image' : img.filename}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

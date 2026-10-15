'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { getOrCreateImageOwnerId, uploadCustomerImageFile } from '@/lib/image-swaps'

interface ImageUploadProps {
  onUpload: (url: string) => void
  currentImage?: string
}

export function ImageUploadWithOptimize({ onUpload, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(currentImage || '')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const uploadInFlight = useRef(false)

  useEffect(() => {
    setPreview(currentImage || '')
  }, [currentImage])

  const toDataUrl = async (file: File) => {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string) || '')
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const uploadImage = async (file: File) => {
    if (uploadInFlight.current) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Choose a PNG, JPG, GIF, WebP, or AVIF image.')
      return
    }
    if (file.size === 0 || file.size > 4 * 1024 * 1024) {
      setError('Choose an image smaller than 4 MB that is not empty.')
      return
    }

    uploadInFlight.current = true
    setUploading(true)
    setError(null)

    try {
      setPreview(await toDataUrl(file))
      const uploaded = await uploadCustomerImageFile(file, getOrCreateImageOwnerId())
      onUpload(uploaded.url)
      setPreview(uploaded.url)
    } catch {
      setPreview(currentImage || '')
      setError('We could not save this image. Your previous image is unchanged. Please try again.')
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadImage(file)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void uploadImage(file)
          }}
          disabled={uploading}
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="cursor-pointer">
          {preview ? (
            <div className="space-y-4">
              <Image
                src={preview}
                alt="Preview"
                width={320}
                height={192}
                className="max-h-48 w-auto mx-auto rounded-lg"
                unoptimized
              />
              <p className="text-sm text-gray-400">
                Click or drag to replace
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                className="w-12 h-12 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-white font-medium">
                Drop image here or click to browse
              </p>
              <p className="text-sm text-gray-400">
                PNG, JPG, GIF, WebP, or AVIF up to 4MB
              </p>
            </div>
          )}
        </label>
      </div>

      {/* The server always optimizes accepted uploads. */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
        <div>
          <p className="text-white font-medium">Automatic image optimization</p>
          <p className="text-sm text-gray-400 mt-1">
            Uploaded images are compressed and resized for fast loading.
          </p>
        </div>
        <div className="text-sm text-gray-400">
          <svg
            className="w-5 h-5 inline-block"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      {/* Upload Status */}
      {uploading && (
        <div role="status" className="text-sm text-blue-400 text-center">
          Uploading...
        </div>
      )}

      {error && (
        <div role="alert" className="text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  )
}

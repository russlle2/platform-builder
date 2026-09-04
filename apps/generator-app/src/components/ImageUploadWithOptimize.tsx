'use client'

import { useEffect, useId, useState } from 'react'
import Image from 'next/image'

interface ImageUploadProps {
  onUpload: (url: string) => void
  currentImage?: string
}

export function ImageUploadWithOptimize({ onUpload, currentImage }: ImageUploadProps) {
  const [optimizeEnabled, setOptimizeEnabled] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(currentImage || '')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const localPreviewUrl = await toDataUrl(file)
    setPreview(localPreviewUrl)

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('optimize', optimizeEnabled.toString())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        onUpload(data.url)
        setPreview(data.url)
      } else {
        setError(data.error || 'Image upload failed. Please check your Supabase configuration.')
      }
    } catch (err) {
      setError('Image upload failed. Please check your Supabase configuration.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const input = document.createElement('input')
      input.type = 'file'
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      handleFileChange({ target: input } as any)
    }
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
          accept="image/*"
          onChange={handleFileChange}
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
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          )}
        </label>
      </div>

      {/* Optimize Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
        <div>
          <label className="text-white font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={optimizeEnabled}
              onChange={(e) => setOptimizeEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            Optimize Image
          </label>
          <p className="text-sm text-gray-400 mt-1 ml-6">
            Automatically compress and resize for fast loading
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
        <div className="text-sm text-blue-400 text-center">
          Uploading...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  )
}

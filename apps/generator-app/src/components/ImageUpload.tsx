'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getOrCreateImageOwnerId, uploadCustomerImageFile } from '@/lib/image-swaps'

export function ImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const uploaded = await uploadCustomerImageFile(file, getOrCreateImageOwnerId())
      setUploadedUrl(uploaded.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {uploading && (
        <div className="text-sm text-gray-600">Uploading...</div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {uploadedUrl && (
        <div className="space-y-2">
          <div className="text-sm text-green-600">Upload successful!</div>
          <div className="border rounded p-2">
            <div className="relative w-full h-48">
              <Image 
                src={uploadedUrl} 
                alt="Uploaded" 
                fill
                className="object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

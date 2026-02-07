'use client'

import { useState } from 'react'
import { Button } from './Button'

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
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadedUrl(data.url)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed')
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
            <img src={uploadedUrl} alt="Uploaded" className="w-full h-auto rounded" />
          </div>
        </div>
      )}
    </div>
  )
}

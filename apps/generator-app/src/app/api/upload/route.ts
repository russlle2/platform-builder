import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed image types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optimizeFlag = formData.get('optimize') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${originalName}`
    const filePath = path.join(uploadDir, fileName)

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file
    await writeFile(filePath, buffer)

    // TODO: Integrate Sharp optimization when optimize flag is true
    // For now, return basic response
    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      filename: fileName,
      size: file.size,
      type: file.type,
      optimized: optimizeFlag,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to list uploaded images (for user image library)
export async function GET(request: NextRequest) {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ images: [] })
    }

    const fs = require('fs')
    const files = fs.readdirSync(uploadDir)
    
    const images = files
      .filter((file: string) => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
      })
      .map((file: string) => {
        const stats = fs.statSync(path.join(uploadDir, file))
        return {
          filename: file,
          url: `/uploads/${file}`,
          size: stats.size,
          uploadedAt: stats.birthtime,
        }
      })
      .sort((a: any, b: any) => b.uploadedAt - a.uploadedAt)

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove an image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename required' },
        { status: 400 }
      )
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const fs = require('fs')
    fs.unlinkSync(filePath)

    return NextResponse.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}

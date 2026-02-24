import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, getTemplate } from '@/lib/templates/niche-registry'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string; path: string[] }> }
) {
  const { niche, slug, path: pathSegments } = await params
  const filePath = pathSegments.join('/')

  const template = getTemplate(niche, slug)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const fullPath = path.join(template.dir, filePath)
  // Security: must stay within template dir
  if (!fullPath.startsWith(template.dir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const ext = path.extname(fullPath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.html': 'text/html',
  }

  const contentType = mimeMap[ext] || 'application/octet-stream'
  const content = fs.readFileSync(fullPath)

  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

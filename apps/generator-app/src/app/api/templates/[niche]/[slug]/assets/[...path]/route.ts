import { NextRequest, NextResponse } from 'next/server'
import { getTemplate, readTemplateFileBuffer } from '@/lib/templates/niche-registry'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string; path: string[] }> }
) {
  const { niche, slug, path: pathSegments } = await params
  const filePath = pathSegments.join('/')

  const template = getTemplate(niche, slug)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Defense in depth — the registry already sandboxes reads, but reject any
  // segment that tries to escape the template dir.
  if (pathSegments.some((s) => s === '..' || s === '' || s.includes('\\') || s.startsWith('/'))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const content = await readTemplateFileBuffer(niche, slug, filePath)
  if (!content) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
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

  // Copy into a fresh ArrayBuffer so the TS BodyInit union accepts it
  // (Node Buffer's underlying buffer could in theory be a SharedArrayBuffer).
  const ab = new ArrayBuffer(content.byteLength)
  new Uint8Array(ab).set(content)
  return new NextResponse(ab, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
    },
  })
}

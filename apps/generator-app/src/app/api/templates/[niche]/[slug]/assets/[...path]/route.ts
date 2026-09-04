import { NextRequest, NextResponse } from 'next/server'
import {
  getTemplate,
  getTemplateAtCatalogSnapshot,
  readTemplateFileBuffer,
} from '@/lib/templates/niche-registry'
import { snapshotCatalogRevision } from '@/lib/catalog-revision'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string; path: string[] }> }
) {
  const { niche, slug, path: pathSegments } = await params
  // Defense in depth — the registry already sandboxes reads, but reject any
  // segment that tries to escape the template dir.
  if (pathSegments.some((s) => s === '..' || s === '' || s.includes('\\') || s.startsWith('/'))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const historical = pathSegments[0] === '__catalog'
  if (historical && pathSegments.length < 4) {
    return NextResponse.json({ error: 'Catalogue snapshot locator is incomplete' }, { status: 400 })
  }
  const locator = historical ? {
    catalogHash: pathSegments[1],
    manifestHash: pathSegments[2],
  } : null
  const assetSegments = historical ? pathSegments.slice(3) : pathSegments
  const filePath = assetSegments.join('/')

  let template
  try {
    template = locator
      ? await getTemplateAtCatalogSnapshot(niche, slug, locator)
      : await getTemplate(niche, slug)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Catalogue snapshot is unavailable',
    }, { status: 409 })
  }
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
  if (!template.files.includes(filePath) || template.pages.includes(filePath)) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  const catalogRevision = locator ? snapshotCatalogRevision(template) : undefined
  const content = await readTemplateFileBuffer(niche, slug, filePath, catalogRevision)
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

  const contentType = ext === '.js' ? 'text/plain; charset=utf-8' : (mimeMap[ext] || 'application/octet-stream')

  // Copy into a fresh ArrayBuffer so the TS BodyInit union accepts it
  // (Node Buffer's underlying buffer could in theory be a SharedArrayBuffer).
  const ab = new ArrayBuffer(content.byteLength)
  new Uint8Array(ab).set(content)
  return new NextResponse(ab, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': historical
        ? 'public, max-age=31536000, immutable'
        : 'public, s-maxage=86400, stale-while-revalidate=86400',
      'Netlify-CDN-Cache-Control': historical
        ? 'public, durable, s-maxage=31536000, immutable'
        : 'public, s-maxage=86400, stale-while-revalidate=86400',
      'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      ...(ext === '.js' ? { 'Content-Disposition': 'attachment' } : {}),
    },
  })
}

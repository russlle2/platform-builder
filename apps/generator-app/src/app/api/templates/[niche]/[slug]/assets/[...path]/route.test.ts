import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { COMPILER_COMPATIBILITY_PATH, COMPILER_COMPATIBILITY_SCRIPT } from '@/lib/compiler-compatibility-runtime'

const mocks = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  getTemplateAtCatalogSnapshot: vi.fn(),
  readTemplateFileBuffer: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => mocks)

import { GET } from './route'

const catalogHash = 'a'.repeat(64)
const manifestHash = 'b'.repeat(64)
const historicalTemplate = {
  slug: 'legacy-template',
  pages: ['index.html'],
  files: ['index.html', 'assets/img/hero.svg'],
  validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
  designId: 'design_historical',
  contentPresetId: 'content_historical',
  themePresetId: 'theme_historical',
  qualityReceipt: 'receipt_historical',
  catalogHash,
  manifestHash,
}

describe('hash-bound historical template assets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads an asset from the verified historical snapshot and caches it immutably', async () => {
    mocks.getTemplateAtCatalogSnapshot.mockResolvedValue(historicalTemplate)
    mocks.readTemplateFileBuffer.mockResolvedValue(Buffer.from('<svg/>'))
    const response = await GET(new NextRequest('https://dailyclarity.org/asset'), {
      params: Promise.resolve({
        niche: 'wellness_coach',
        slug: 'legacy-template',
        path: ['__catalog', catalogHash, manifestHash, 'assets', 'img', 'hero.svg'],
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('immutable')
    expect(mocks.getTemplateAtCatalogSnapshot).toHaveBeenCalledWith(
      'wellness_coach',
      'legacy-template',
      { catalogHash, manifestHash },
    )
    expect(mocks.readTemplateFileBuffer).toHaveBeenCalledWith(
      'wellness_coach',
      'legacy-template',
      'assets/img/hero.svg',
      expect.objectContaining({ catalogHash, manifestHash }),
    )
    expect(mocks.getTemplate).not.toHaveBeenCalled()
  })

  it('rejects an incomplete historical locator before reading storage', async () => {
    const response = await GET(new NextRequest('https://dailyclarity.org/asset'), {
      params: Promise.resolve({
        niche: 'wellness_coach',
        slug: 'legacy-template',
        path: ['__catalog', catalogHash, 'assets'],
      }),
    })
    expect(response.status).toBe(400)
    expect(mocks.getTemplateAtCatalogSnapshot).not.toHaveBeenCalled()
  })
})

describe('compiler compatibility runtime serving', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([false, true])('executes the exact compiler-owned v3 runtime (historical=%s)', async (historical) => {
    const template = { ...historicalTemplate, files: ['index.html', COMPILER_COMPATIBILITY_PATH] }
    mocks.getTemplate.mockResolvedValue(template)
    mocks.getTemplateAtCatalogSnapshot.mockResolvedValue(template)
    mocks.readTemplateFileBuffer.mockResolvedValue(Buffer.from(COMPILER_COMPATIBILITY_SCRIPT))
    const response = await GET(new NextRequest('https://dailyclarity.org/asset'), {
      params: Promise.resolve({
        niche: 'wellness_coach', slug: 'legacy-template',
        path: [...(historical ? ['__catalog', catalogHash, manifestHash] : []), ...COMPILER_COMPATIBILITY_PATH.split('/')],
      }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/javascript')
    expect(response.headers.get('content-disposition')).toBeNull()
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.text()).toBe(COMPILER_COMPATIBILITY_SCRIPT)
  })

  it.each([
    { path: COMPILER_COMPATIBILITY_PATH, version: 3, content: `${COMPILER_COMPATIBILITY_SCRIPT}alert(1)` },
    { path: 'assets/js/other.js', version: 3, content: COMPILER_COMPATIBILITY_SCRIPT },
    { path: COMPILER_COMPATIBILITY_PATH, version: 2, content: COMPILER_COMPATIBILITY_SCRIPT },
  ])('keeps untrusted JavaScript inert: $path / v$version', async ({ path, version, content }) => {
    mocks.getTemplate.mockResolvedValue({
      ...historicalTemplate,
      files: [path],
      validation: { ...historicalTemplate.validation, contractVersion: version },
    })
    mocks.readTemplateFileBuffer.mockResolvedValue(Buffer.from(content))
    const response = await GET(new NextRequest('https://dailyclarity.org/asset'), {
      params: Promise.resolve({ niche: 'wellness_coach', slug: 'legacy-template', path: path.split('/') }),
    })
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe('attachment')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})

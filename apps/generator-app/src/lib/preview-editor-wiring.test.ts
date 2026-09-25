import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function clientSource(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('customer preview editor wiring', () => {
  const guided = clientSource('src/app/preview-your-business/PreviewYourBusinessClient.tsx')
  const portal = clientSource('src/app/templates/[niche]/[slug]/page.tsx')
  const runtime = clientSource('src/lib/customer-preview-editor-runtime.ts')
  const pricing = clientSource('src/app/pricing/PricingClient.tsx')
  const checkout = clientSource('src/app/api/stripe/checkout/route.ts')

  it('routes both customer experiences through the sole app-owned iframe runtime', () => {
    for (const source of [guided, portal]) {
      expect(source).toContain("import { getCustomerPreviewEditorScript } from '@/lib/customer-preview-editor-runtime'")
      expect(source).toContain('trustedEditorScript: getCustomerPreviewEditorScript(page)')
      expect(source).not.toContain('function getIframeInjectionScript')
      expect(source).toContain('normalizeCoordinatedImageSlotIds(e.data.slotId, e.data.pictureSlotIds)')
      expect(source).toContain('nodeId !== undefined && !isSafeInlineEditId(nodeId)')
    }
    expect(runtime).toContain("export const CUSTOMER_PREVIEW_EDITOR_RUNTIME = 'customer-preview-editor-v1'")
    expect(runtime).toContain('pictureSlotIds: pictureSlotIds')
    expect(runtime).toContain('if (!slot || slotMatches !== 1) return;')
    expect(runtime).toContain('if (responsiveChildren !== slots.length) return;')
    expect(runtime).toContain('if (!editTarget || editMatches !== 1) return;')
  })

  it('prevents an older asynchronous preview from overwriting the latest request', () => {
    for (const source of [guided, portal]) {
      expect(source).toContain('const requestId = ++previewRequestIdRef.current')
      expect(source).toContain('if (requestId !== previewRequestIdRef.current) return')
      expect(source).toContain('if (requestId === previewRequestIdRef.current) setPreviewLoading(false)')
      expect(source).toContain('setCurrentPage(page)')
    }
  })

  it('keeps portal iframe navigation bound to the newest preview callback', () => {
    expect(portal).toContain('loadPreviewRef.current(page)')
    expect(portal).toContain('loadPreviewRef.current = loadPreview')
    expect(portal).toContain('previewError={previewError}')
    expect(portal).toContain('Retry preview')
  })

  it('serializes image-map commits so concurrent uploads cannot lose an earlier swap', () => {
    for (const source of [guided, portal]) {
      expect(source).toContain('const imageUploadQueueRef = useRef<Promise<void>>(Promise.resolve())')
      expect(source).toContain('imageUploadQueueRef.current.then(upload, upload)')
      expect(source).toContain('const coordinatedSlotIds = [...pendingImageSwapSlotIds.current]')
    }
  })

  it('binds preview, assets, and checkout to the same immutable catalogue revision', () => {
    for (const source of [guided, portal, pricing]) {
      expect(source).toContain("'pb_catalog_revision'")
    }
    for (const source of [guided, portal]) {
      expect(source).toContain('catalogRevision:')
      expect(source).toContain('/assets/__catalog/${')
    }
    expect(pricing).toContain('catalogRevision,')
    expect(checkout).toContain('getTemplateAtCatalogRevision')
    expect(checkout).toContain("code: 'catalog_revision_unavailable'")
    expect(pricing).toContain('sessionStorage.removeItem(CHECKOUT_CATALOG_REVISION_KEY)')
  })
})

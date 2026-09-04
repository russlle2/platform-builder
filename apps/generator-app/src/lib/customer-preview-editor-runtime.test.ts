import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_PREVIEW_EDITOR_RUNTIME,
  getCustomerPreviewEditorScript,
} from './customer-preview-editor-runtime'

describe('customer preview editor runtime', () => {
  it('builds one deterministic, app-owned runtime for a safe manifest page', () => {
    const first = getCustomerPreviewEditorScript('pages/contact/form.html')
    const second = getCustomerPreviewEditorScript('pages/contact/form.html')

    expect(first).toBe(second)
    const executable = first
      .replace(/^\s*<script\b[^>]*>/i, '')
      .replace(/<\/script>\s*$/i, '')
    expect(() => new Function(executable)).not.toThrow()
    expect(first.match(new RegExp(`data-dc-runtime="${CUSTOMER_PREVIEW_EDITOR_RUNTIME}"`, 'g'))).toHaveLength(1)
    expect(first).toContain('var currentPage = "pages/contact/form.html";')
    expect(first).toContain("type: 'editValueRequest'")
    expect(first).toContain("type: 'textEdited'")
    expect(first).toContain("type: 'imageSwapRequest'")
    expect(first).toContain("type: 'navigatePage'")
    expect(first).toContain("clickTarget.matches('[data-dc-image-id],[data-pb-image-id]')")
    expect(first).toContain("clickTarget.closest('a[href],button,input,select,textarea,option,label,summary")
    expect(first).toContain("event.source !== window.parent")
    expect(first).toContain("if (!slot || slotMatches !== 1) return;")
    expect(first).toContain("if (responsiveChildren !== slots.length) return;")
  })

  it('fails closed instead of interpolating an unsafe page into executable code', () => {
    for (const page of [
      '../index.html',
      'https://evil.test/index.html',
      'index.html\n</script><script>alert(1)</script>',
      '/index.html',
      '',
    ]) {
      expect(() => getCustomerPreviewEditorScript(page)).toThrow(/safe manifest page/)
    }
  })
})

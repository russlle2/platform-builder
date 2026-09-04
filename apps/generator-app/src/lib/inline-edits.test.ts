import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INLINE_EDITS_KEY,
  annotateEditableElements,
  applyInlineEditsToHtml,
  buildCustomizationScope,
  loadInlineEdits,
  mergeInlineEdit,
  sanitizeStoredInlineEditMap,
  saveInlineEdits,
} from './inline-edits'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe('inline edit targeting', () => {
  it('assigns stable page-specific IDs without touching protected markup', () => {
    const html = '<main><h1>One</h1><!-- <p>comment</p> --><script>"<p>script</p>"</script><p>Two</p></main>'
    const first = annotateEditableElements(html, 'index.html')
    const second = annotateEditableElements(html, 'index.html')

    expect(first).toBe(second)
    expect(first).toContain('<h1 data-pb-edit-id="pb-index-0001">One</h1>')
    expect(first).toContain('<p data-pb-edit-id="pb-index-0002">Two</p>')
    expect(first).toContain('<!-- <p>comment</p> -->')
    expect(first).toContain('<script>"<p>script</p>"</script>')
    expect(annotateEditableElements(html, 'about.html')).toContain('pb-about-0001')
  })

  it('persists edits whose rendered source uses HTML entities and escapes replacements', () => {
    const html = '<p>&copy; Acme &amp; Co.</p>'
    const result = applyInlineEditsToHtml(html, [{
      id: 'pb-index-0001',
      original: '© Acme & Co.',
      updated: 'A & <B> "quoted"',
    }], 'index.html')

    expect(result).toBe(
      '<p data-pb-edit-id="pb-index-0001">A &amp; &lt;B&gt; &quot;quoted&quot;</p>',
    )
  })

  it('updates only the selected duplicate while preserving legacy all-match fallback', () => {
    const html = '<p>Same label</p><p>Same label</p>'
    const targeted = applyInlineEditsToHtml(html, [{
      id: 'pb-index-0002',
      original: 'Same label',
      updated: 'Second only',
    }])
    expect(targeted).toBe(
      '<p data-pb-edit-id="pb-index-0001">Same label</p>' +
      '<p data-pb-edit-id="pb-index-0002">Second only</p>',
    )

    const legacy = applyInlineEditsToHtml(html, [{
      original: 'Same label',
      updated: '<Both & safe>',
    }])
    expect(legacy.match(/&lt;Both &amp; safe&gt;/g)).toHaveLength(2)
    expect(legacy).not.toContain('<Both')
  })

  it('chains later edits by element ID instead of duplicate text', () => {
    const first = mergeInlineEdit([], 'Same', 'First version', 'pb-index-0002')
    const second = mergeInlineEdit(first, 'First version', 'Final version', 'pb-index-0002')
    expect(second).toEqual([{
      id: 'pb-index-0002',
      original: 'Same',
      updated: 'Final version',
    }])
  })

  it('rejects malformed stored edits and unsafe IDs', () => {
    expect(sanitizeStoredInlineEditMap({
      'index.html': [
        { id: 'pb-index-0001', original: 'Old', updated: 'New' },
        { id: 'not safe', original: 'Other', updated: 'Changed' },
        { original: '', updated: 'Ignored' },
      ],
      '../escape.html': [{ original: 'x', updated: 'y' }],
    })).toEqual({
      'index.html': [
        { id: 'pb-index-0001', original: 'Old', updated: 'New' },
        { original: 'Other', updated: 'Changed' },
      ],
    })
  })
})

describe('scoped inline edit persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', new MemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isolates templates and mirrors only the active scope for checkout', () => {
    const firstScope = buildCustomizationScope('wellness_coach', 'serene-path')
    const secondScope = buildCustomizationScope('sound_bath', 'moon-room')
    const first = { 'index.html': [{ original: 'Old one', updated: 'New one' }] }
    const second = { 'about.html': [{ original: 'Old two', updated: 'New two' }] }

    expect(loadInlineEdits(firstScope)).toEqual({})
    saveInlineEdits(first, firstScope)
    expect(loadInlineEdits(secondScope)).toEqual({})
    saveInlineEdits(second, secondScope)

    expect(loadInlineEdits(firstScope)).toEqual(first)
    expect(JSON.parse(sessionStorage.getItem(INLINE_EDITS_KEY) || '{}')).toEqual(first)
    expect(loadInlineEdits(secondScope)).toEqual(second)
    expect(JSON.parse(sessionStorage.getItem(INLINE_EDITS_KEY) || '{}')).toEqual(second)
  })

  it('keeps portal drafts separate from their pre-purchase template', () => {
    expect(buildCustomizationScope('wellness_coach', 'serene-path'))
      .toBe('template:wellness_coach:serene-path')
    expect(buildCustomizationScope('wellness_coach', 'serene-path', 'My Live Site'))
      .toBe('portal:my-live-site:wellness_coach:serene-path')
  })
})

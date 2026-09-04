import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INLINE_EDITS_KEY,
  VISUAL_EDITABLE_SELECTOR,
  annotateEditableElements,
  applyInlineEditsToHtml,
  applyInlineEditsToHtmlWithReport,
  buildCustomizationScope,
  isEditableAttributeForTag,
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
    expect(first).toContain('<h1 data-dc-edit-id="dc-edit-index-0001">One</h1>')
    expect(first).toContain('<p data-dc-edit-id="dc-edit-index-0002">Two</p>')
    expect(first).toContain('<!-- <p>comment</p> -->')
    expect(first).toContain('<script>"<p>script</p>"</script>')
    expect(annotateEditableElements(html, 'about.html')).toContain('dc-edit-about-0001')
  })

  it('preserves v3 IDs and canonicalizes legacy attribute names', () => {
    const html = '<h1 data-dc-edit-id="hero-title">One</h1><p data-pb-edit-id="pb-index-0002">Two</p>'
    expect(annotateEditableElements(html)).toBe(
      '<h1 data-dc-edit-id="hero-title">One</h1>' +
      '<p data-dc-edit-id="pb-index-0002">Two</p>',
    )
    expect(annotateEditableElements(
      '<h1 data-dc-edit-id="duplicate">One</h1><p data-dc-edit-id="duplicate">Two</p>',
    )).toBe(
      '<h1 data-dc-edit-id="duplicate">One</h1>' +
      '<p data-dc-edit-id="dc-edit-index-0002">Two</p>',
    )
  })

  it('preserves compiler IDs for additional text roles without shifting v2 ordinals', () => {
    const html = '<head><title data-dc-edit-id="page-title">Page title</title></head><h1>Heading</h1><table><caption data-dc-edit-id="table-caption">Summary</caption></table><select><option data-dc-edit-id="first-option">Choice</option></select>'
    const annotated = annotateEditableElements(html)

    expect(annotated).toContain('<title data-dc-edit-id="page-title">Page title</title>')
    expect(annotated).toContain('<h1 data-dc-edit-id="dc-edit-index-0001">Heading</h1>')
    expect(annotated).toContain('<caption data-dc-edit-id="table-caption">Summary</caption>')
    expect(annotated).toContain('<option data-dc-edit-id="first-option">Choice</option>')
    const edited = applyInlineEditsToHtml(annotated, [
      { nodeId: 'page-title', updated: 'New page title' },
      { nodeId: 'table-caption', updated: 'New summary' },
      { nodeId: 'first-option', updated: 'New choice' },
    ])
    expect(edited).toContain('<title data-dc-edit-id="page-title">New page title</title>')
    expect(edited).toContain('<caption data-dc-edit-id="table-caption">New summary</caption>')
    expect(edited).toContain('<option data-dc-edit-id="first-option">New choice</option>')
    expect(VISUAL_EDITABLE_SELECTOR).toBe('[data-dc-edit-id],[data-pb-edit-id]')
  })

  it('does not synthesize structural parent IDs on compiler-v3 pages', () => {
    const html = [
      '<nav><ul><li><a href="about.html">',
      '<span data-dc-edit-wrapper="direct-text" data-dc-edit-id="txt_111111111111111111">About</span>',
      '</a></li></ul></nav>',
      '<form><label><span data-dc-edit-id="txt_222222222222222222">Name</span>',
      '<input name="name" placeholder="Your name" data-dc-edit-id="txt_333333333333333333" data-dc-edit-attribute="placeholder"></label></form>',
    ].join('')

    expect(annotateEditableElements(html, 'index.html')).toBe(html)
    expect(annotateEditableElements(html)).not.toMatch(/<(?:nav|ul|li|a|form|label)\b[^>]*data-dc-edit-id=/)
  })

  it('fails closed for an ID text edit whose target owns descendant markup', () => {
    const html = '<li data-dc-edit-id="legacy-parent"><a href="about.html">About</a></li>'
    const result = applyInlineEditsToHtmlWithReport(html, [{
      nodeId: 'legacy-parent',
      original: 'About',
      updated: 'Changed',
    }])

    expect(result.unmatchedNodeIds).toEqual(['legacy-parent'])
    expect(result.html).not.toContain('Changed')
    expect(result.html).toMatch(/<li data-dc-edit-id="legacy-parent"><a href="about\.html"[^>]*>About<\/a><\/li>/)
  })

  it('edits leaf navigation and form slots without changing their structure', () => {
    const html = [
      '<nav><a href="about.html"><span data-dc-edit-id="txt_111111111111111111">About</span></a></nav>',
      '<form action="/" method="post"><label><span data-dc-edit-id="txt_222222222222222222">Name</span>',
      '<input name="name" aria-label="Customer name" placeholder="Your name" data-dc-edit-id="txt_333333333333333333" data-dc-edit-attribute="placeholder"></label>',
      '<button type="submit"><span data-dc-edit-id="txt_444444444444444444">Send</span></button></form>',
    ].join('')
    const result = applyInlineEditsToHtmlWithReport(html, [
      { nodeId: 'txt_111111111111111111', updated: 'Our approach' },
      { nodeId: 'txt_222222222222222222', updated: 'Preferred name' },
      { nodeId: 'txt_333333333333333333', updated: 'Enter your name' },
      { nodeId: 'txt_444444444444444444', updated: 'Send inquiry' },
    ])

    expect(result.unmatchedNodeIds).toEqual([])
    expect(result.html).toContain('<a href="about.html"><span data-dc-edit-id="txt_111111111111111111">Our approach</span></a>')
    expect(result.html).toContain('aria-label="Customer name" placeholder="Enter your name"')
    expect(result.html).toContain('<form action="/" method="post">')
    expect(result.html).toContain('<input name="name"')
    expect(result.html).toContain('<button type="submit"><span data-dc-edit-id="txt_444444444444444444">Send inquiry</span></button>')
  })

  it.each([
    {
      name: 'meta content',
      html: '<meta name="description" content="Old summary" data-dc-edit-id="meta-description" data-dc-edit-attribute="content">',
      updated: 'New & <safe> "summary"',
      expected: 'content="New &amp; &lt;safe&gt; &quot;summary&quot;"',
    },
    {
      name: 'image alt text',
      html: '<img src="hero.jpg" alt="Old hero" data-dc-edit-id="hero-alt" data-dc-edit-attribute="alt">',
      updated: 'Founder & client',
      expected: 'alt="Founder &amp; client"',
    },
    {
      name: 'aria label',
      html: '<button aria-label="Open menu" data-dc-edit-id="menu-label" data-dc-edit-attribute="aria-label"><svg></svg></button>',
      updated: 'Open services',
      expected: 'aria-label="Open services"',
    },
    {
      name: 'title attribute',
      html: '<abbr title="Frequently asked questions" data-dc-edit-id="faq-title" data-dc-edit-attribute="title">FAQ</abbr>',
      updated: 'Common questions',
      expected: 'title="Common questions"',
    },
    {
      name: 'form placeholder',
      html: '<input placeholder="Your name" data-dc-edit-id="name-placeholder" data-dc-edit-attribute="placeholder">',
      updated: 'Preferred name',
      expected: 'placeholder="Preferred name"',
    },
  ])('applies an ID-first $name edit to the declared safe attribute', ({ html, updated, expected }) => {
    const nodeId = /data-dc-edit-id="([^"]+)"/.exec(html)?.[1]
    const result = applyInlineEditsToHtmlWithReport(html, [{ nodeId, updated }])

    expect(result.unmatchedNodeIds).toEqual([])
    expect(result.html).toContain(expected)
  })

  it('fails closed when an edit marker declares a structural attribute', () => {
    const html = '<a href="/safe" data-dc-edit-id="link-target" data-dc-edit-attribute="href">Visit</a>'
    const result = applyInlineEditsToHtmlWithReport(html, [{
      nodeId: 'link-target',
      original: '/safe',
      updated: 'javascript:alert(1)',
    }])

    expect(result.unmatchedNodeIds).toEqual(['link-target'])
    expect(result.html).toContain('href="/safe"')
    expect(result.html).not.toContain('javascript:')
    expect(isEditableAttributeForTag('a', 'title')).toBe(true)
    expect(isEditableAttributeForTag('div', 'content')).toBe(false)
    expect(isEditableAttributeForTag('script', 'aria-label')).toBe(false)
  })

  it('persists edits whose rendered source uses HTML entities and escapes replacements', () => {
    const html = '<p>&copy; Acme &amp; Co.</p>'
    const result = applyInlineEditsToHtml(html, [{
      nodeId: 'dc-edit-index-0001',
      original: '© Acme & Co.',
      updated: 'A & <B> "quoted"',
    }], 'index.html')

    expect(result).toBe(
      '<p data-dc-edit-id="dc-edit-index-0001">A &amp; &lt;B&gt; &quot;quoted&quot;</p>',
    )
  })

  it('updates only the selected duplicate while preserving legacy all-match fallback', () => {
    const html = '<p>Same label</p><p>Same label</p>'
    const targeted = applyInlineEditsToHtml(html, [{
      nodeId: 'dc-edit-index-0002',
      original: 'Same label',
      updated: 'Second only',
    }])
    expect(targeted).toBe(
      '<p data-dc-edit-id="dc-edit-index-0001">Same label</p>' +
      '<p data-dc-edit-id="dc-edit-index-0002">Second only</p>',
    )

    const legacy = applyInlineEditsToHtml(html, [{
      original: 'Same label',
      updated: '<Both & safe>',
    }])
    expect(legacy.match(/&lt;Both &amp; safe&gt;/g)).toHaveLength(2)
    expect(legacy).not.toContain('<Both')
  })

  it('limits v2 fallback edits to visible text without altering markup or protected blocks', () => {
    const html = [
      '<a href="Same label">Same label</a>',
      '<p title="Same label">Same label</p>',
      '<script>window.label = "Same label"</script>',
      '<style>.Same label { color: red }</style>',
      '<!-- Same label -->',
    ].join('')
    const edited = applyInlineEditsToHtml(html, [{
      original: 'Same label',
      updated: 'Visible only',
    }])

    expect(edited).toContain('href="Same label"')
    expect(edited).toContain('title="Same label"')
    expect(edited.match(/>Visible only</g)).toHaveLength(2)
    expect(edited).toContain('<script>window.label = "Same label"</script>')
    expect(edited).toContain('<style>.Same label { color: red }</style>')
    expect(edited).toContain('<!-- Same label -->')
  })

  it('reports a stale v3 ID without falling through to duplicate-text replacement', () => {
    const html = '<p>Same label</p><p>Same label</p>'
    const result = applyInlineEditsToHtmlWithReport(html, [{
      nodeId: 'removed-node',
      original: 'Same label',
      updated: 'Must not spread',
    }])

    expect(result.unmatchedNodeIds).toEqual(['removed-node'])
    expect(result.html).toBe(
      '<p data-dc-edit-id="dc-edit-index-0001">Same label</p>' +
      '<p data-dc-edit-id="dc-edit-index-0002">Same label</p>',
    )
  })

  it('fails closed for malformed or ambiguous stable IDs', () => {
    const malformed = applyInlineEditsToHtmlWithReport('<p>Same label</p>', [{
      id: 'not safe',
      original: 'Same label',
      updated: 'Must not spread',
    }])
    expect(malformed.unmatchedNodeIds).toEqual(['not safe'])
    expect(malformed.html).toContain('>Same label</p>')
    expect(malformed.html).not.toContain('Must not spread')

    const compilerId = 'txt_0123456789abcdefab'
    const duplicateHtml = `<p data-dc-edit-id="${compilerId}">One</p>` +
      `<p data-dc-edit-id="${compilerId}">Two</p>`
    const ambiguous = applyInlineEditsToHtmlWithReport(duplicateHtml, [{
      nodeId: compilerId,
      updated: 'Neither',
    }])
    expect(ambiguous).toEqual({ html: duplicateHtml, unmatchedNodeIds: [compilerId] })
    expect(mergeInlineEdit([], 'Same label', 'Changed', 'not safe')).toEqual([])
  })

  it('chains later edits by element ID instead of duplicate text', () => {
    const first = mergeInlineEdit([], 'Same', 'First version', 'dc-edit-index-0002')
    const second = mergeInlineEdit(first, 'First version', 'Final version', 'dc-edit-index-0002')
    expect(second).toEqual([{
      nodeId: 'dc-edit-index-0002',
      original: 'Same',
      updated: 'Final version',
    }])
  })

  it('allows an ID-targeted attribute slot to be repopulated after it was cleared', () => {
    expect(mergeInlineEdit([], '', 'Restored label', 'menu-label')).toEqual([{
      nodeId: 'menu-label',
      updated: 'Restored label',
    }])
  })

  it('rejects malformed stored edits and unsafe IDs', () => {
    expect(sanitizeStoredInlineEditMap({
      'index.html': [
        { id: 'pb-index-0001', original: 'Old', updated: 'New' },
        { nodeId: 'hero-copy', updated: 'New without fallback' },
        { id: 'not safe', original: 'Other', updated: 'Changed' },
        { original: '', updated: 'Ignored' },
      ],
      '../escape.html': [{ original: 'x', updated: 'y' }],
    })).toEqual({
      'index.html': [
        { nodeId: 'pb-index-0001', original: 'Old', updated: 'New' },
        { nodeId: 'hero-copy', updated: 'New without fallback' },
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
    const first = {
      'index.html': [{ nodeId: 'dc-edit-index-0001', updated: 'New one' }],
    }
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

  it('round-trips safe nested page edits while rejecting non-canonical paths', () => {
    const scope = buildCustomizationScope('wellness_coach', 'serene-path')
    const nested = {
      'pages/services/detail.html': [{ nodeId: 'service-detail', updated: 'Custom detail' }],
      '/absolute.html': [{ original: 'Old', updated: 'Unsafe' }],
      'pages//empty.html': [{ original: 'Old', updated: 'Unsafe' }],
      '../escape.html': [{ original: 'Old', updated: 'Unsafe' }],
    }

    saveInlineEdits(nested, scope)
    expect(loadInlineEdits(scope)).toEqual({
      'pages/services/detail.html': [{ nodeId: 'service-detail', updated: 'Custom detail' }],
    })
  })

  it('keeps portal drafts separate from their pre-purchase template', () => {
    expect(buildCustomizationScope('wellness_coach', 'serene-path'))
      .toBe('template:wellness_coach:serene-path')
    expect(buildCustomizationScope('wellness_coach', 'serene-path', 'My Live Site'))
      .toBe('portal:my-live-site:wellness_coach:serene-path')
  })
})

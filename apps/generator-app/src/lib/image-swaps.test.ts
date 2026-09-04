import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IMAGE_SWAPS_KEY,
  annotateImageSlots,
  applyImageSwapsToHtml,
  applyImageSwapsToHtmlWithReport,
  extractRelativeAssetPath,
  getOrCreateImageOwnerId,
  loadImageSwaps,
  mergeCoordinatedImageSwaps,
  mergeImageSwap,
  normalizeCoordinatedImageSlotIds,
  sanitizeImageSwapMap,
  saveImageSwaps,
} from './image-swaps'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe('image swap safety', () => {
  it('retains valid image replacements and rejects active-content injection', () => {
    const swaps = sanitizeImageSwapMap({
      'index.html': [
        { original: '/assets/old.jpg', updated: 'https://cdn.example/new.webp' },
        { original: '/assets/x.jpg', updated: 'javascript:alert(1)' },
        { original: '"', updated: 'https://attacker.test/x.webp" onerror="alert(1)' },
        { original: '/assets/css.jpg', updated: 'https://attacker.test/x.webp);color:red;/*' },
        { original: '/assets/escape.jpg', updated: 'https://attacker.test/x\\29;color:red' },
      ],
      '../escape.html': [{ original: '/a.jpg', updated: 'https://cdn.example/a.webp' }],
    })
    expect(swaps).toEqual({
      'index.html': [{ original: '/assets/old.jpg', updated: 'https://cdn.example/new.webp' }],
    })
    expect(applyImageSwapsToHtml(
      '<img src="/assets/old.jpg">',
      swaps['index.html'],
    )).toBe('<img src="https://cdn.example/new.webp" data-dc-image-id="dc-image-index-0001">')
  })

  it('HTML-escapes valid URL query separators at every image write boundary', () => {
    const updated = 'https://cdn.example/new.webp?width=400&fit=crop'
    expect(applyImageSwapsToHtml(
      '<img src="/assets/old.jpg">',
      [{ slotId: 'dc-image-index-0001', updated }],
    )).toBe(
      '<img src="https://cdn.example/new.webp?width=400&amp;fit=crop" data-dc-image-id="dc-image-index-0001">',
    )

    expect(applyImageSwapsToHtml(
      '<section style="background-image:url(/assets/old.jpg)"></section>',
      [{ slotId: 'dc-image-index-0001', updated }],
    )).toBe(
      '<section style="background-image:url(/assets/old.jpg);background-image:url(https://cdn.example/new.webp?width=400&amp;fit=crop)!important" data-dc-image-id="dc-image-index-0001"></section>',
    )
  })

  it('assigns stable independent slots and updates only the selected duplicate', () => {
    const html = '<img src="/assets/same.jpg"><img src="/assets/same.jpg">'
    expect(annotateImageSlots(html, 'about.html')).toBe(
      '<img src="/assets/same.jpg" data-dc-image-id="dc-image-about-0001">' +
      '<img src="/assets/same.jpg" data-dc-image-id="dc-image-about-0002">',
    )
    expect(annotateImageSlots('<img src="one.jpg" />')).toBe(
      '<img src="one.jpg" data-dc-image-id="dc-image-index-0001" />',
    )
    expect(annotateImageSlots(
      '<img data-dc-image-id="duplicate" src="one.jpg"><img data-dc-image-id="duplicate" src="two.jpg">',
    )).toBe(
      '<img src="one.jpg" data-dc-image-id="duplicate">' +
      '<img src="two.jpg" data-dc-image-id="dc-image-index-0002">',
    )

    const targeted = applyImageSwapsToHtml(html, [{
      slotId: 'dc-image-index-0002',
      updated: 'https://cdn.example/second.webp',
    }])
    expect(targeted).toBe(
      '<img src="/assets/same.jpg" data-dc-image-id="dc-image-index-0001">' +
      '<img src="https://cdn.example/second.webp" data-dc-image-id="dc-image-index-0002">',
    )
  })

  it('does not invent image controls for an explicitly marked compiler-v3 document with zero image slots', () => {
    const html = '<!doctype html><html data-dc-catalog-version="3"><body><img src="pattern.svg" alt="" aria-hidden="true"></body></html>'

    expect(annotateImageSlots(html)).toBe(html)
    expect(applyImageSwapsToHtml(html, [])).toBe(html)
    expect(annotateImageSlots('<html><body><img src="legacy.jpg"></body></html>'))
      .toContain('data-dc-image-id="dc-image-index-0001"')
  })

  it('retains v2 URL fallback and upgrades it when that slot is edited again', () => {
    const legacy = applyImageSwapsToHtml(
      '<img src="/assets/same.jpg"><img src="/assets/same.jpg">',
      [{ original: '/assets/same.jpg', updated: 'https://cdn.example/both.webp' }],
    )
    expect(legacy.match(/https:\/\/cdn\.example\/both\.webp/g)).toHaveLength(2)
    expect(applyImageSwapsToHtml(
      '<img src="/assets/same.jpg"><img src="same.jpg">',
      [{ original: '/assets/same.jpg', updated: 'https://cdn.example/only-exact.webp' }],
    )).toBe(
      '<img src="https://cdn.example/only-exact.webp" data-dc-image-id="dc-image-index-0001">' +
      '<img src="same.jpg" data-dc-image-id="dc-image-index-0002">',
    )

    expect(mergeImageSwap(
      [{ original: '/assets/same.jpg', updated: 'https://cdn.example/first.webp' }],
      'https://cdn.example/first.webp',
      'https://cdn.example/final.webp',
      undefined,
      'dc-image-index-0001',
    )).toEqual([{
      slotId: 'dc-image-index-0001',
      original: '/assets/same.jpg',
      updated: 'https://cdn.example/final.webp',
    }])
  })

  it('limits v2 fallback swaps to image sources and inline backgrounds', () => {
    const original = '/assets/same.jpg'
    const updated = 'https://cdn.example/new.webp'
    const html = [
      `<a href="${original}">${original}</a>`,
      `<script>var markup = '<img src="${original}">'</script>`,
      `<!-- <img src="${original}"> -->`,
      `<img src="${original}" alt="">`,
      `<section style="background-image:url(&quot;${original}&quot;)"></section>`,
    ].join('')
    const edited = applyImageSwapsToHtml(html, [{ original, updated }])

    expect(edited).toContain(`<a href="${original}">${original}</a>`)
    expect(edited).toContain(`<script>var markup = '<img src="${original}">'</script>`)
    expect(edited).toContain(`<!-- <img src="${original}"> -->`)
    expect(edited).toContain(`src="${updated}"`)
    expect(edited).toContain(`background-image:url(&quot;${updated}&quot;)`)
  })

  it('recovers v2 image sources from the Netlify preview proxy without trusting unsafe paths', () => {
    const templateSource = '/api/templates/wellness_coach/legacy-route/assets/assets/img/hero%20portrait.webp'
    const previewProxy = `/.netlify/images?url=${encodeURIComponent(templateSource)}&w=1200&q=72`
    const browserCurrentSrc = `https://dailyclarity.org${previewProxy}`
    const updated = 'https://cdn.example/customer/hero.webp'

    expect(extractRelativeAssetPath(previewProxy)).toBe('assets/img/hero portrait.webp')
    expect(extractRelativeAssetPath(browserCurrentSrc)).toBe('assets/img/hero portrait.webp')
    expect(extractRelativeAssetPath(previewProxy.replace(/&/g, '&amp;')))
      .toBe('assets/img/hero portrait.webp')
    expect(extractRelativeAssetPath(
      `/.netlify/images?url=${encodeURIComponent('/api/templates/niche/slug/assets/%252e%252e%252fsecret.jpg')}`,
    )).toBeUndefined()
    expect(extractRelativeAssetPath('/.netlify/images?w=1200&q=72')).toBeUndefined()
    expect(extractRelativeAssetPath('/.netlify/images?url=javascript%3Aalert%281%29'))
      .toBeUndefined()

    // Old affected drafts have only the absolute currentSrc. The helper now
    // derives their missing relative source and restores both preview + deploy.
    const legacySwap = [{ original: browserCurrentSrc, updated }]
    expect(applyImageSwapsToHtml(`<img src="${previewProxy}">`, legacySwap)).toBe(
      `<img src="${updated}" data-dc-image-id="dc-image-index-0001">`,
    )
    expect(applyImageSwapsToHtml(
      '<img src="assets/img/hero portrait.webp">',
      legacySwap,
    )).toBe(`<img src="${updated}" data-dc-image-id="dc-image-index-0001">`)

    const staleTarget = applyImageSwapsToHtmlWithReport(
      `<img src="${previewProxy}">`,
      [{ slotId: 'removed-slot', original: browserCurrentSrc, updated }],
    )
    expect(staleTarget.unmatchedSlotIds).toEqual(['removed-slot'])
    expect(staleTarget.html).toContain('/.netlify/images?')
    expect(staleTarget.html).not.toContain(updated)
  })

  it('reports a stale v3 slot without falling through to duplicate-URL replacement', () => {
    const html = '<img src="/assets/same.jpg"><img src="/assets/same.jpg">'
    const result = applyImageSwapsToHtmlWithReport(html, [{
      slotId: 'removed-slot',
      original: '/assets/same.jpg',
      updated: 'https://cdn.example/must-not-spread.webp',
    }])

    expect(result.unmatchedSlotIds).toEqual(['removed-slot'])
    expect(result.html).toBe(
      '<img src="/assets/same.jpg" data-dc-image-id="dc-image-index-0001">' +
      '<img src="/assets/same.jpg" data-dc-image-id="dc-image-index-0002">',
    )
  })

  it('fails closed for malformed or ambiguous stable slot IDs', () => {
    const malformedMap = sanitizeImageSwapMap({
      'index.html': [{
        id: 'not safe',
        original: '/assets/same.jpg',
        updated: 'https://cdn.example/must-not-spread.webp',
      }],
    })
    expect(malformedMap).toEqual({})
    expect(mergeImageSwap(
      [],
      '/assets/same.jpg',
      'https://cdn.example/new.webp',
      undefined,
      'not safe',
    )).toEqual([])

    const compilerId = 'img_0123456789abcdefab'
    const duplicateHtml = `<img data-dc-image-id="${compilerId}" src="one.jpg">` +
      `<img data-dc-image-id="${compilerId}" src="two.jpg">`
    const ambiguous = applyImageSwapsToHtmlWithReport(duplicateHtml, [{
      slotId: compilerId,
      updated: 'https://cdn.example/neither.webp',
    }])
    expect(ambiguous).toEqual({ html: duplicateHtml, unmatchedSlotIds: [compilerId] })
  })

  it('canonicalizes legacy slot attributes and supports background-image slots', () => {
    const html = '<section data-pb-image-id="legacy-hero" style="background-image:url(/assets/hero.jpg)"></section>'
    expect(applyImageSwapsToHtml(html, [{
      id: 'legacy-hero',
      updated: 'https://cdn.example/hero.webp',
    }])).toBe(
      '<section style="background-image:url(/assets/hero.jpg);background-image:url(https://cdn.example/hero.webp)!important" data-dc-image-id="legacy-hero"></section>',
    )
  })

  it('applies compiler CSS-background slots through the shared preview/deploy helper', () => {
    const slotId = 'css_0123456789abcdefab'
    const result = applyImageSwapsToHtmlWithReport(
      `<section class="hero" data-dc-image-id="${slotId}"></section>`,
      [{ slotId, updated: 'https://cdn.example/customer-hero.webp' }],
      'index.html',
    )

    expect(result.unmatchedSlotIds).toEqual([])
    expect(result.html).toContain('style="background-image:url(https://cdn.example/customer-hero.webp)!important"')
    expect(result.html).toContain(`data-dc-image-id="${slotId}"`)
  })

  it('targets responsive img and source elements by their real element slot', () => {
    const img = applyImageSwapsToHtml(
      '<img data-dc-image-id="img_responsive" src="old.webp" srcset="old.webp 1x, old-2x.webp 2x">',
      [{ slotId: 'img_responsive', updated: 'https://cdn.example/new.webp' }],
    )
    expect(img).toBe('<img src="https://cdn.example/new.webp" data-dc-image-id="img_responsive">')

    const source = applyImageSwapsToHtmlWithReport(
      '<source data-dc-image-id="source_responsive" media="(min-width: 50rem)" srcset="wide.webp 1x, wide-2x.webp 2x">',
      [{ slotId: 'source_responsive', updated: 'https://cdn.example/new-wide.webp' }],
    )
    expect(source.unmatchedSlotIds).toEqual([])
    expect(source.html).toBe('<source media="(min-width: 50rem)" srcset="https://cdn.example/new-wide.webp" data-dc-image-id="source_responsive">')
  })

  it('persists one picture replacement as an atomic set of independent stable slots', () => {
    const primary = 'img_111111111111111111'
    const source = 'img_222222222222222222'
    const updated = 'https://cdn.example/customer-picture.webp'
    expect(normalizeCoordinatedImageSlotIds(primary, [source, primary])).toEqual([primary, source])
    expect(normalizeCoordinatedImageSlotIds(primary, [primary, source, source])).toBeNull()
    expect(normalizeCoordinatedImageSlotIds(primary, [primary, 'not safe'])).toBeNull()

    const swaps = mergeCoordinatedImageSwaps(
      [],
      '/assets/fallback.webp',
      updated,
      'fallback.webp',
      primary,
      [source, primary],
    )
    expect(swaps).toEqual([
      { slotId: primary, original: '/assets/fallback.webp', updated, originalRelative: 'fallback.webp' },
      { slotId: source, updated },
    ])
    expect(sanitizeImageSwapMap({ 'pages/gallery/detail.html': swaps })).toEqual({
      'pages/gallery/detail.html': swaps,
    })

    const full = Array.from({ length: 50 }, (_, index) => ({
      slotId: `existing-${index}`,
      updated: `https://cdn.example/${index}.webp`,
    }))
    expect(mergeCoordinatedImageSwaps(
      full,
      '/assets/fallback.webp',
      updated,
      undefined,
      primary,
      [primary, source],
    )).toBe(full)
  })
})

describe('scoped image swap persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', new MemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isolates templates and mirrors only the selected scope for checkout', () => {
    const firstScope = 'template:wellness_coach:serene-path'
    const secondScope = 'portal:live-site:sound_bath:moon-room'
    const first = {
      'index.html': [{ slotId: 'dc-image-index-0001', updated: 'https://cdn.example/one.webp' }],
    }
    const second = {
      'about.html': [{ original: '/assets/two.jpg', updated: 'https://cdn.example/two.webp' }],
    }

    expect(loadImageSwaps(firstScope)).toEqual({})
    saveImageSwaps(first, firstScope)
    expect(loadImageSwaps(secondScope)).toEqual({})
    saveImageSwaps(second, secondScope)

    expect(loadImageSwaps(firstScope)).toEqual(first)
    expect(JSON.parse(sessionStorage.getItem(IMAGE_SWAPS_KEY) || '{}')).toEqual(first)
    expect(loadImageSwaps(secondScope)).toEqual(second)
    expect(JSON.parse(sessionStorage.getItem(IMAGE_SWAPS_KEY) || '{}')).toEqual(second)
  })

  it('round-trips safe nested page swaps while rejecting non-canonical paths', () => {
    const scope = 'template:wellness_coach:serene-path'
    const nested = {
      'pages/services/detail.html': [{
        slotId: 'service-hero',
        updated: 'https://cdn.example/service.webp',
      }],
      '/absolute.html': [{ original: '/old.jpg', updated: 'https://cdn.example/unsafe.webp' }],
      'pages//empty.html': [{ original: '/old.jpg', updated: 'https://cdn.example/unsafe.webp' }],
      '../escape.html': [{ original: '/old.jpg', updated: 'https://cdn.example/unsafe.webp' }],
    }

    saveImageSwaps(nested, scope)
    expect(loadImageSwaps(scope)).toEqual({
      'pages/services/detail.html': [{
        slotId: 'service-hero',
        updated: 'https://cdn.example/service.webp',
      }],
    })
  })

  it('does not reuse a portal slug as an unauthenticated draft upload owner', () => {
    expect(getOrCreateImageOwnerId('my-live-site')).toBe('my-live-site')
    expect(getOrCreateImageOwnerId()).toMatch(/^draft-/)
  })
})

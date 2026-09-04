import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IMAGE_SWAPS_KEY,
  annotateImageSlots,
  applyImageSwapsToHtml,
  applyImageSwapsToHtmlWithReport,
  getOrCreateImageOwnerId,
  loadImageSwaps,
  mergeImageSwap,
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

  it('retains v2 URL fallback and upgrades it when that slot is edited again', () => {
    const legacy = applyImageSwapsToHtml(
      '<img src="/assets/same.jpg"><img src="/assets/same.jpg">',
      [{ original: '/assets/same.jpg', updated: 'https://cdn.example/both.webp' }],
    )
    expect(legacy.match(/https:\/\/cdn\.example\/both\.webp/g)).toHaveLength(2)

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

  it('canonicalizes legacy slot attributes and supports background-image slots', () => {
    const html = '<section data-pb-image-id="legacy-hero" style="background-image:url(/assets/hero.jpg)"></section>'
    expect(applyImageSwapsToHtml(html, [{
      id: 'legacy-hero',
      updated: 'https://cdn.example/hero.webp',
    }])).toBe(
      '<section style="background-image:url(/assets/hero.jpg);background-image:url(https://cdn.example/hero.webp)!important" data-dc-image-id="legacy-hero"></section>',
    )
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

  it('does not reuse a portal slug as an unauthenticated draft upload owner', () => {
    expect(getOrCreateImageOwnerId('my-live-site')).toBe('my-live-site')
    expect(getOrCreateImageOwnerId()).toMatch(/^draft-/)
  })
})

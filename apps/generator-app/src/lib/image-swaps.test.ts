import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IMAGE_SWAPS_KEY,
  applyImageSwapsToHtml,
  getOrCreateImageOwnerId,
  loadImageSwaps,
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
      ],
      '../escape.html': [{ original: '/a.jpg', updated: 'https://cdn.example/a.webp' }],
    })
    expect(swaps).toEqual({
      'index.html': [{ original: '/assets/old.jpg', updated: 'https://cdn.example/new.webp' }],
    })
    expect(applyImageSwapsToHtml(
      '<img src="/assets/old.jpg">',
      swaps['index.html'],
    )).toBe('<img src="https://cdn.example/new.webp">')
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
      'index.html': [{ original: '/assets/one.jpg', updated: 'https://cdn.example/one.webp' }],
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

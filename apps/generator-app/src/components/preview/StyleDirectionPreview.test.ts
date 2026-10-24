import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StyleDirectionPreview } from './StyleDirectionPreview'
import type { StylePreferences } from '@/store/previewStore'

const prefs: StylePreferences = { vibes: [], proseStyle: 'professional', colorMood: 'original', fontPreference: 'sans-serif', layoutDensity: 'balanced' }
const info = { businessName: 'My own practice', tagline: '', description: '', accountEmail: 'private@example.com' }
const render = (choices: Partial<StylePreferences> = {}) => renderToStaticMarkup(createElement(StyleDirectionPreview, { info, prefs: { ...prefs, ...choices }, customTheme: null }))

describe('style-direction illustration', () => {
  it('does not invent original template colors or expose private contact information', () => {
    const html = render()
    expect(html).toContain('Neutral illustration · original colors vary by template')
    expect(html).toContain('Illustrative layout · sample wording · not a published website')
    expect(html).toContain('My own practice')
    expect(html).not.toContain('private@example.com')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('<script')
  })

  it('shows the actual resolved palette and font/layout direction for selected preferences', () => {
    const html = render({ colorMood: 'nature-organic', fontPreference: 'serif', layoutDensity: 'spacious', vibes: ['earthy'] })
    expect(html).toContain('data-color-scheme="sage-garden"')
    expect(html).toContain('background-color:#0F1A14')
    expect(html).toContain('data-font-variation="source-serif"')
    expect(html).toContain('data-structure-variation="elegant-serif"')
    expect(html).toContain('earthy')
  })

  it('changes example tone while preserving business wording as escaped plain text', () => {
    const html = renderToStaticMarkup(createElement(StyleDirectionPreview, { info: { businessName: '<script>private()</script>', tagline: 'My original tagline', description: 'My own offer' }, prefs: { ...prefs, proseStyle: 'conversational' }, customTheme: null }))
    expect(html).toContain('Let’s talk')
    expect(html).toContain('My original tagline')
    expect(html).toContain('My own offer')
    expect(html).toContain('&lt;script&gt;private()&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('reflects a saved custom theme and warns about unreadable text without discarding it', () => {
    const html = renderToStaticMarkup(createElement(StyleDirectionPreview, { info, prefs: { ...prefs, colorMood: 'nature-organic' }, customTheme: { primary: '#123456', background: '#ffffff', text: '#ffffff', headingFont: 'Georgia, serif', bodyFont: 'Georgia, serif' } }))
    expect(html).toContain('Saved custom colors')
    expect(html).toContain('data-color-scheme="custom"')
    expect(html).toContain('data-font-variation="custom"')
    expect(html).toContain('Saved custom fonts')
    expect(html).toContain('background-color:#123456')
    expect(html).toContain('Your saved text and background colors may be difficult to read.')
    expect(html).not.toContain('background-color:#0F1A14')
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildVariationCSS,
  resolveQuizColorScheme,
  resolveQuizFontVariation,
  resolveQuizStructureVariation,
} from './variations'

describe('style quiz variation mapping', () => {
  it('maps every quiz color mood to a real deployable scheme', () => {
    expect([
      'dark-elegant',
      'light-airy',
      'rich-warm',
      'cool-modern',
      'nature-organic',
      'vibrant-energy',
    ].map(resolveQuizColorScheme)).toEqual([
      'midnight-bloom',
      'arctic-frost',
      'warm-ember',
      'ocean-breeze',
      'sage-garden',
      'rose-quartz',
    ])
  })

  it('maps font and density vocabulary to real variation IDs', () => {
    expect(['serif', 'sans-serif', 'mixed'].map(resolveQuizFontVariation)).toEqual([
      'source-serif',
      'inter',
      'lora',
    ])
    expect(['spacious', 'balanced', 'compact'].map(resolveQuizStructureVariation)).toEqual([
      'elegant-serif',
      'rounded-soft',
      'compact-dense',
    ])
  })

  it('preserves valid direct IDs and fails closed to original', () => {
    expect(resolveQuizColorScheme('golden-hour')).toBe('golden-hour')
    expect(resolveQuizFontVariation('space-grotesk')).toBe('space-grotesk')
    expect(resolveQuizStructureVariation('asymmetric')).toBe('asymmetric')
    expect(resolveQuizColorScheme('unknown')).toBe('original')
  })

  it('overrides compiler color tokens with the selected customer palette', () => {
    const compiledCss = ':root{--dc-theme-color_bg:#fff;--dc-theme-color_cta:#f00}body{background:var(--dc-theme-color_bg)}.btn{background:var(--dc-theme-color_cta)}'
    const css = buildVariationCSS('ocean-breeze', 'original', 'original', compiledCss)
    expect(css).toContain('--dc-theme-color_bg: #0B1628 !important')
    expect(css).toContain('--dc-theme-color_cta: #0EA5E9 !important')
  })
})

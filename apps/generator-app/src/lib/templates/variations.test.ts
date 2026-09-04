import { describe, expect, it } from 'vitest'
import {
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
})

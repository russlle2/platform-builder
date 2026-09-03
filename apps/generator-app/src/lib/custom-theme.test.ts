import { describe, expect, it } from 'vitest'
import {
  buildCustomThemeCss,
  customThemeAfterVariationChange,
  sanitizeCustomTheme,
} from './custom-theme'

const validTheme = {
  primary: '#0EA5E9',
  background: '#0F172A',
  text: '#E2E8F0',
  headingFont: "'Inter', sans-serif",
  bodyFont: "'Inter', sans-serif",
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
}

describe('custom theme', () => {
  it('normalizes a safe theme and produces deployable CSS', () => {
    expect(sanitizeCustomTheme(validTheme)?.primary).toBe('#0ea5e9')
    const css = buildCustomThemeCss(validTheme)
    expect(css).toContain('--primary: #0ea5e9 !important')
    expect(css).toContain("font-family: 'Inter', sans-serif")
  })

  it('rejects CSS and remote-import injection', () => {
    expect(sanitizeCustomTheme({ ...validTheme, primary: 'red;display:none' })).toBeNull()
    expect(sanitizeCustomTheme({ ...validTheme, fontImportUrl: 'https://evil.test/font.css' })).toBeNull()
    expect(buildCustomThemeCss({ ...validTheme, headingFont: 'Inter;display:none' })).toBe('')
  })

  it('preserves custom colors and fonts across structure-only changes', () => {
    const sanitized = sanitizeCustomTheme(validTheme)

    expect(customThemeAfterVariationChange(sanitized, 'structure')).toBe(sanitized)
    expect(customThemeAfterVariationChange(sanitized, 'color')).toBeNull()
    expect(customThemeAfterVariationChange(sanitized, 'font')).toBeNull()
  })
})

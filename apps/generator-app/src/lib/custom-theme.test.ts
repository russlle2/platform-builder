import { describe, expect, it } from 'vitest'
import { buildCustomThemeCss, sanitizeCustomTheme } from './custom-theme'

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

  it('overrides compiler tokens with exact customer colors and fonts', () => {
    const compiledCss = [
      ':root{--dc-theme-color_bg:#fff;--dc-theme-color_cta:#f00;--dc-theme-font_heading:serif}',
      'body{background:var(--dc-theme-color_bg)}',
      '.btn{background:var(--dc-theme-color_cta)}',
      'h1{font-family:var(--dc-theme-font_heading)}',
    ].join('')
    const css = buildCustomThemeCss(validTheme, compiledCss)
    expect(css).toContain('--dc-theme-color_bg: #0f172a !important')
    expect(css).toContain('--dc-theme-color_cta: #0ea5e9 !important')
    expect(css).toContain("--dc-theme-font_heading: 'Inter', sans-serif !important")
  })

  it('rejects CSS and remote-import injection', () => {
    expect(sanitizeCustomTheme({ ...validTheme, primary: 'red;display:none' })).toBeNull()
    expect(sanitizeCustomTheme({ ...validTheme, fontImportUrl: 'https://evil.test/font.css' })).toBeNull()
    expect(buildCustomThemeCss({ ...validTheme, headingFont: 'Inter;display:none' })).toBe('')
  })
})

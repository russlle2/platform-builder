import { describe, expect, it } from 'vitest'
import { buildCompilerThemeOverrides } from './compiler-theme'

const compilerStylesheet = `
:root {
  --dc-theme-color_canvas: #ffffff;
  --dc-theme-color_copy: #111111;
  --dc-theme-color_action: #cc0000;
  --dc-theme-color_surface: #f5f5f5;
  --dc-theme-font_body: Georgia, serif;
  --dc-theme-font_heading: Georgia, serif;
  --dc-theme-font_weight: 700;
}
:root { --page-bg: var(--dc-theme-color_canvas); }
body { background: var(--page-bg); color: var(--dc-theme-color_copy); font-family: var(--dc-theme-font_body); }
.card { background-color: var(--dc-theme-color_surface); }
.btn { background: var(--dc-theme-color_action); }
h1 { font-family: var(--dc-theme-font_heading); font-weight: var(--dc-theme-font_weight); }
`

describe('compiler theme bridge', () => {
  it('maps opaque compiler tokens to semantic customer colors and font families', () => {
    const css = buildCompilerThemeOverrides(compilerStylesheet, {
      colors: {
        background: '#010203',
        text: '#fefefe',
        muted: '#999999',
        primary: '#123456',
        accent: '#654321',
        card: '#111827',
      },
      fonts: {
        body: "'Inter', sans-serif",
        heading: "'Lora', serif",
      },
    })

    expect(css).toContain('--dc-theme-color_canvas: #010203 !important')
    expect(css).toContain('--dc-theme-color_copy: #fefefe !important')
    expect(css).toContain('--dc-theme-color_action: #123456 !important')
    expect(css).toContain('--dc-theme-color_surface: #111827 !important')
    expect(css).toContain("--dc-theme-font_body: 'Inter', sans-serif !important")
    expect(css).toContain("--dc-theme-font_heading: 'Lora', serif !important")
    expect(css).not.toContain('--dc-theme-font_weight:')
  })

  it('emits nothing for a stylesheet without compiler tokens', () => {
    expect(buildCompilerThemeOverrides('body { color: #111; }', {
      colors: {
        background: '#000000', text: '#ffffff', muted: '#aaaaaa',
        primary: '#00aaff', accent: '#55ccff', card: '#111111',
      },
    })).toBe('')
  })
})

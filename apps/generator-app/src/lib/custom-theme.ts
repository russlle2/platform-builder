import { buildCompilerThemeOverrides } from './compiler-theme'

export const CUSTOM_THEME_STORAGE_KEY = 'pb_custom_theme'

export interface CustomTheme {
  primary: string
  background: string
  text: string
  headingFont: string
  bodyFont: string
  fontImportUrl?: string
}

export type TemplateVariationDimension = 'color' | 'font' | 'structure'

export function customThemeAfterVariationChange(
  currentTheme: CustomTheme | null,
  dimension: TemplateVariationDimension,
): CustomTheme | null {
  return dimension === 'structure' ? currentTheme : null
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const FONT_STACK = /^[a-z0-9,'" -]{1,120}$/i

export function sanitizeCustomTheme(value: unknown): CustomTheme | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<CustomTheme>
  if (
    typeof candidate.primary !== 'string' || !HEX_COLOR.test(candidate.primary) ||
    typeof candidate.background !== 'string' || !HEX_COLOR.test(candidate.background) ||
    typeof candidate.text !== 'string' || !HEX_COLOR.test(candidate.text) ||
    typeof candidate.headingFont !== 'string' || !FONT_STACK.test(candidate.headingFont) ||
    typeof candidate.bodyFont !== 'string' || !FONT_STACK.test(candidate.bodyFont)
  ) {
    return null
  }

  const fontImportUrl = typeof candidate.fontImportUrl === 'string'
    ? candidate.fontImportUrl.trim()
    : ''
  if (fontImportUrl) {
    if (fontImportUrl.length > 500 || /['"()\\\s]/.test(fontImportUrl)) return null
    try {
      const url = new URL(fontImportUrl)
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'fonts.googleapis.com' ||
        (url.pathname !== '/css' && url.pathname !== '/css2') ||
        url.username ||
        url.password
      ) {
        return null
      }
    } catch {
      return null
    }
  }

  return {
    primary: candidate.primary.toLowerCase(),
    background: candidate.background.toLowerCase(),
    text: candidate.text.toLowerCase(),
    headingFont: candidate.headingFont,
    bodyFont: candidate.bodyFont,
    ...(fontImportUrl ? { fontImportUrl } : {}),
  }
}

function mixHexColors(first: string, second: string, firstWeight: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const a = Number.parseInt(first.slice(offset, offset + 2), 16)
    const b = Number.parseInt(second.slice(offset, offset + 2), 16)
    return Math.round(a * firstWeight + b * (1 - firstWeight))
      .toString(16)
      .padStart(2, '0')
  })
  return `#${channels.join('')}`
}

export interface LivePreviewThemeControls {
  colors: { primary: string; bg: string; text: string }
  fonts: { heading: string; body: string; importUrl?: string }
}

export function buildCustomThemeCss(value: unknown, stylesheet = ''): string {
  const theme = sanitizeCustomTheme(value)
  if (!theme) return ''
  const compilerOverrides = buildCompilerThemeOverrides(stylesheet, {
    colors: {
      background: theme.background,
      text: theme.text,
      muted: mixHexColors(theme.text, theme.background, 0.68),
      primary: theme.primary,
      accent: theme.primary,
      card: mixHexColors(theme.background, theme.text, 0.92),
    },
    fonts: {
      body: theme.bodyFont,
      heading: theme.headingFont,
    },
  })
  return [
    theme.fontImportUrl ? `@import url('${theme.fontImportUrl}');` : '',
    `:root { --pb-primary: ${theme.primary}; --pb-bg: ${theme.background}; --pb-text: ${theme.text}; --primary: ${theme.primary} !important; --bg: ${theme.background} !important; --fg: ${theme.text} !important; }`,
    `body { background-color: ${theme.background} !important; color: ${theme.text} !important; font-family: ${theme.bodyFont} !important; }`,
    `h1,h2,h3,h4,h5,h6,.h1,.h2,.brand { font-family: ${theme.headingFont} !important; }`,
    `a,.btn,button { --pb-accent: ${theme.primary}; }`,
    compilerOverrides,
  ].filter(Boolean).join('\n')
}

/**
 * Build the exact CSS used by server preview and deployment from the editor's
 * control-state shape. Sending this complete stylesheet to the iframe keeps
 * compiler-generated `--dc-theme-*` variables in sync during live updates.
 */
export function buildLivePreviewThemeCss(
  controls: LivePreviewThemeControls,
  stylesheet = '',
): string {
  return buildCustomThemeCss({
    primary: controls.colors.primary,
    background: controls.colors.bg,
    text: controls.colors.text,
    headingFont: controls.fonts.heading,
    bodyFont: controls.fonts.body,
    fontImportUrl: controls.fonts.importUrl,
  }, stylesheet)
}

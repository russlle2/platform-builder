import { buildCustomThemeCss, type CustomTheme } from './custom-theme'
import { hydrateTemplate, type HydrationField } from './templates/template-hydration'
import { buildVariationCSS } from './templates/variations'

export interface TemplatePreviewCompositionInput {
  html: string
  css?: string | null
  /**
   * All template stylesheets in stable path order. This is used only to map
   * compiler-generated theme tokens; `css` remains the page's injectable base
   * stylesheet so relative asset URLs keep their original directory context.
   */
  themeStylesheet?: string | null
  page: string
  fields: readonly HydrationField[]
  values?: Record<string, string>
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  customTheme?: CustomTheme | null
}

export interface TemplatePreviewComposition {
  html: string
  css: string | null
  variationCSS: string | null
  page: string
}

/** Build one deterministic token-discovery surface without changing CSS paths. */
export function combineTemplateThemeStylesheets(
  stylesheets: readonly { path: string; css: string | null | undefined }[],
): string {
  return [...stylesheets]
    .filter((entry): entry is { path: string; css: string } => typeof entry.css === 'string' && entry.css.length > 0)
    .sort((left, right) => left.path.localeCompare(right.path, 'en'))
    .map((entry) => `/* Daily Clarity theme source: ${entry.path.replace(/[^A-Za-z0-9._/-]/g, '_')} */\n${entry.css}`)
    .join('\n')
}

/**
 * Pure server-side composition used by the preview API. Keeping hydration and
 * theme construction here lets offline CI exercise the same code path without
 * starting Next.js or reaching template storage.
 */
export function composeTemplatePreview(
  input: TemplatePreviewCompositionInput,
): TemplatePreviewComposition {
  const css = input.css || ''
  const themeStylesheet = input.themeStylesheet ?? css
  const variationCSS = [
    buildVariationCSS(
      input.colorScheme || 'original',
      input.fontVariation || 'original',
      input.structureVariation || 'original',
      themeStylesheet,
    ),
    buildCustomThemeCss(input.customTheme, themeStylesheet),
  ].filter(Boolean).join('\n')

  return {
    html: hydrateTemplate(input.html, input.values || {}, input.fields),
    css: css || null,
    variationCSS: variationCSS || null,
    page: input.page,
  }
}

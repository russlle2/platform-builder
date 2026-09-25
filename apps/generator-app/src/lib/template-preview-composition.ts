import { buildCustomThemeCss, type CustomTheme } from './custom-theme'
import { hydrateTemplate, type HydrationField } from './templates/template-hydration'
import { buildVariationCSS } from './templates/variations'

export interface TemplatePreviewCompositionInput {
  html: string
  css?: string | null
  /**
   * All template stylesheets in stable path order. This is used only to map
   * compiler-generated theme tokens. For legacy documents, `css` remains the
   * page's injectable base stylesheet so relative asset URLs keep their
   * original directory context. Compiler-v3 documents instead preserve their
   * authored stylesheet graph and never inject an unlinked global stylesheet.
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
  /**
   * Complete, non-injected stylesheet surface used to discover compiler theme
   * tokens during live customer edits. `css` is retained only for legacy
   * documents that depend on the historical global stylesheet injection.
   */
  themeStylesheet: string | null
  variationCSS: string | null
  page: string
}

const COMPILER_V3_DOCUMENT_RE = /<html\b[^>]*\bdata-dc-catalog-version\s*=\s*(?:"3"|'3'|3(?=\s|>))/i

/**
 * Compiler-v3 pages carry an explicit applicability graph through their LINK
 * and STYLE/@import elements. Injecting assets/css/styles.css into every page
 * can therefore apply an unrelated legacy selector (for example `.pattern`)
 * to BODY and make an otherwise valid page invisible or non-interactive.
 * Markerless v2 documents keep the historical injection for compatibility.
 */
export function selectInjectableTemplateCss(
  html: string,
  css: string | null | undefined,
): string | null {
  if (!css || COMPILER_V3_DOCUMENT_RE.test(html)) return null
  return css
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
  const css = selectInjectableTemplateCss(input.html, input.css) || ''
  const themeStylesheet = input.themeStylesheet ?? input.css ?? ''
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
    themeStylesheet: themeStylesheet || null,
    variationCSS: variationCSS || null,
    page: input.page,
  }
}

import {
  applyImageSwapsToHtml,
  type ImageSwap,
} from './image-swaps'
import {
  applyInlineEditsToHtml,
  type InlineTextEdit,
} from './inline-edits'
import {
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewCss,
  sanitizeTemplatePreviewHtml,
} from './template-preview-security'

export interface ComposeCustomerPreviewDocumentInput {
  /** Hydrated HTML returned by the template preview API. */
  html: string
  /** Page-level base stylesheet returned by the template preview API. */
  css?: string | null
  /** Server-composed variation and custom-theme overrides. */
  variationCSS?: string | null
  /** Manifest-backed endpoint used to serve template-relative assets. */
  assetBase: string
  /** Template-relative page path, including nested pages. */
  page: string
  /** Path that relative URLs inside `css` resolve from. */
  baseStylesheetPath?: string
  inlineEdits?: readonly InlineTextEdit[]
  imageSwaps?: readonly ImageSwap[]
  /**
   * App-owned editor/navigation code. Template/API scripts are removed before
   * this trusted block is appended, so callers must never pass template data.
   */
  trustedEditorScript?: string | null
}

const CUSTOMER_PREVIEW_BASE_STYLES = `
          <style>
            body { margin: 0; }
            img { cursor: pointer; transition: outline 0.15s; }
            img:hover { outline: 3px solid #8b5cf6; outline-offset: 2px; border-radius: 2px; }
          </style>
        `

function injectBeforeClosingTag(document: string, tag: 'head' | 'body', block: string): string {
  if (!block) return document
  const closingTag = tag === 'head' ? /<\/head\s*>/i : /<\/body\s*>/i
  return document.replace(closingTag, (closing) => `${block}${closing}`)
}

/**
 * Compose the exact srcDoc consumed by every customer preview route.
 *
 * This function is deliberately pure and ordered: untrusted API content is
 * sanitized first, trusted styles are added in cascade order, persisted v3/v2
 * customizations are applied to that final document, and only then may the
 * app-owned editor script be appended.
 */
export function composeCustomerPreviewDocument(
  input: ComposeCustomerPreviewDocumentInput,
): string {
  let document = sanitizeTemplatePreviewHtml(input.html, {
    preserveCompilerCompatibilityRuntime: true,
  })
  document = rewriteTemplateAssetReferences(document, input.assetBase, input.page)

  if (input.css) {
    const rewrittenCss = rewriteTemplateAssetReferences(
      input.css,
      input.assetBase,
      input.baseStylesheetPath ?? 'assets/css/styles.css',
    )
    const css = sanitizeTemplatePreviewCss(rewrittenCss)
    if (css) document = injectBeforeClosingTag(document, 'head', `<style>${css}</style>`)
  }

  if (input.variationCSS) {
    const variationCss = sanitizeTemplatePreviewCss(input.variationCSS)
    if (variationCss) {
      document = injectBeforeClosingTag(
        document,
        'head',
        `<style id="variation-overrides">${variationCss}</style>`,
      )
    }
  }

  document = injectBeforeClosingTag(document, 'head', CUSTOMER_PREVIEW_BASE_STYLES)
  document = applyInlineEditsToHtml(
    document,
    input.inlineEdits ? [...input.inlineEdits] : undefined,
    input.page,
  )
  document = applyImageSwapsToHtml(
    document,
    input.imageSwaps ? [...input.imageSwaps] : undefined,
    input.page,
  )

  if (input.trustedEditorScript) {
    document = injectBeforeClosingTag(document, 'body', input.trustedEditorScript)
  }
  return document
}

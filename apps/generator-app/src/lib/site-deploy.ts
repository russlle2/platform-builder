/**
 * Shared site build + deploy pipeline.
 *
 * Used by:
 *   - /api/stripe/webhook       (provision + deploy on purchase)
 *   - /api/test-purchase        (dev simulation of the above)
 *   - /api/portal/site          (re-deploy live site when the owner edits post-purchase)
 *
 * Previously the webhook and test-purchase each carried their own copy of this
 * logic, which drifted apart. Centralizing it guarantees the preview the
 * customer approves matches what actually gets deployed — before AND after
 * purchase.
 */

import {
  readTemplateFile,
  hydrateTemplate,
  getTemplate,
} from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'
import { applyImageSwapsToHtml, type ImageSwap } from '@/lib/image-swaps'

/** A single inline text override captured from the live editor. */
export interface InlineTextEdit {
  /** The text exactly as it appeared before the user edited it. */
  original: string
  /** The replacement text the user typed. */
  updated: string
}

export interface BuildSiteOptions {
  niche: string
  templateSlug: string
  /** {{TOKEN}} → value map collected from the intake form / wizard. */
  customerValues: Record<string, string>
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  /** Inline text edits keyed by page filename (e.g. "index.html"). */
  inlineEdits?: Record<string, InlineTextEdit[]>
  /** Image src replacements keyed by page filename. */
  imageSwaps?: Record<string, ImageSwap[]>
  /** Slug used by the injected contact-form handler to attribute submissions. */
  slug: string
}

export const STRIPE_METADATA_VALUE_LIMIT = 500

/**
 * Apply inline text overrides to a hydrated HTML string.
 *
 * Conservative on purpose: we only swap text the customer explicitly changed,
 * matching the exact original string. Identical repeated strings are all
 * updated, which is the expected behavior for things like a repeated tagline.
 */
export function applyInlineTextEdits(html: string, edits?: InlineTextEdit[]): string {
  if (!edits || edits.length === 0) return html
  let result = html
  for (const edit of edits) {
    const original = (edit.original || '').trim()
    const updated = edit.updated ?? ''
    if (!original || original === updated) continue
    // Plain string split/join avoids regex-escaping pitfalls with user content.
    result = result.split(original).join(updated)
  }
  return result
}

function buildContactFormScript(slug: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
  return `
<script>
(function(){
  var forms = document.querySelectorAll('form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function(v, k) { data[k] = v; });
      data.slug = '${slug}';
      fetch('${apiBase}/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function() {
        form.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--primary,#22c55e)">Thank you! We\\'ll be in touch soon.</p>';
      }).catch(function() {
        alert('Something went wrong. Please try again.');
      });
    });
  });
})();
</script>`
}

/**
 * Hydrate every page of a template, inject CSS + variation overrides + the
 * contact-form handler, and return the full map of deployable files
 * (HTML pages + static assets). Pure: performs no network calls.
 *
 * Returns `null` when the template can't be found.
 */
export function buildDeployFiles(opts: BuildSiteOptions): Record<string, string> | null {
  const {
    niche,
    templateSlug,
    customerValues,
    colorScheme = 'original',
    fontVariation = 'original',
    structureVariation = 'original',
    inlineEdits,
    imageSwaps,
    slug,
  } = opts

  const templateData = getTemplate(niche, templateSlug)
  if (!templateData) return null

  const variationCSS = buildVariationCSS(colorScheme, fontVariation, structureVariation)
  const cssFile = readTemplateFile(niche, templateSlug, 'assets/css/styles.css')
  const jsFile = readTemplateFile(niche, templateSlug, 'assets/js/main.js')
  const contactScript = buildContactFormScript(slug)

  const deployFiles: Record<string, string> = {}

  for (const page of templateData.pages) {
    const rawHtml = readTemplateFile(niche, templateSlug, page)
    if (!rawHtml) continue

    let html = hydrateTemplate(rawHtml, customerValues)
    html = applyInlineTextEdits(html, inlineEdits?.[page])
    html = applyImageSwapsToHtml(html, imageSwaps?.[page])

    const injectedStyles: string[] = []
    if (cssFile) injectedStyles.push(cssFile)
    if (variationCSS) injectedStyles.push(variationCSS)
    if (injectedStyles.length > 0) {
      html = html.replace('</head>', `<style>${injectedStyles.join('\n')}</style></head>`)
    }

    html = html.replace('</body>', contactScript + '</body>')
    deployFiles[page] = html
  }

  if (cssFile) deployFiles['assets/css/styles.css'] = cssFile
  if (jsFile) deployFiles['assets/js/main.js'] = jsFile

  return deployFiles
}

/* ------------------------------------------------------------------ */
/* Stripe metadata chunking                                            */
/* ------------------------------------------------------------------ */
/*
 * Stripe caps each metadata VALUE at 500 chars. A real intake (business name,
 * tagline, description, services, plus every template field default) easily
 * exceeds that, so storing it in a single key silently truncates it into
 * invalid JSON that the webhook then fails to parse — dropping ALL of the
 * customer's data. We instead split the JSON across numbered keys and
 * reassemble it on the other side.
 */

/**
 * Serialize an object and split it into chunked metadata entries.
 * @returns e.g. { customerValues_n: "3", customerValues_0: "...", customerValues_1: "...", ... }
 */
export function chunkJsonToMetadata(
  prefix: string,
  value: unknown,
  maxChunks = 18,
): Record<string, string> {
  const json = JSON.stringify(value ?? {})
  const out: Record<string, string> = {}
  if (!json || json === '{}' || json === 'null') {
    out[`${prefix}_n`] = '0'
    return out
  }
  const size = STRIPE_METADATA_VALUE_LIMIT
  const chunks: string[] = []
  for (let i = 0; i < json.length; i += size) {
    chunks.push(json.slice(i, i + size))
  }
  // Guard against runaway payloads (e.g. someone pasted a base64 image).
  const usable = chunks.slice(0, maxChunks)
  out[`${prefix}_n`] = String(usable.length)
  usable.forEach((chunk, i) => {
    out[`${prefix}_${i}`] = chunk
  })
  return out
}

/** Reassemble and parse a chunked JSON value from Stripe metadata. */
export function unchunkJsonFromMetadata<T>(
  prefix: string,
  metadata: Record<string, string>,
  fallback: T,
): T {
  const count = parseInt(metadata[`${prefix}_n`] || '0', 10)
  if (!Number.isFinite(count) || count <= 0) {
    // Back-compat: try the old single-key form.
    const legacy = metadata[prefix]
    if (legacy) {
      try {
        return JSON.parse(legacy) as T
      } catch {
        return fallback
      }
    }
    return fallback
  }
  let json = ''
  for (let i = 0; i < count; i++) {
    json += metadata[`${prefix}_${i}`] || ''
  }
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

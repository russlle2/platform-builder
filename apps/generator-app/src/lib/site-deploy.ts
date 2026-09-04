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
  readTemplateFileBuffer,
  hydrateTemplate,
  getTemplate,
} from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'
import { buildCustomThemeCss, type CustomTheme } from '@/lib/custom-theme'
import {
  assertCatalogRevision,
  type CatalogRevisionPin,
} from '@/lib/catalog-revision'
import {
  applyImageSwapsToHtmlWithReport,
  sanitizeImageSwapMap,
  type ImageSwap,
} from '@/lib/image-swaps'
import {
  applyInlineEditsToHtml,
  applyInlineEditsToHtmlWithReport,
  sanitizeStoredInlineEditMap,
  type InlineTextEdit,
} from '@/lib/inline-edits'

export type { InlineTextEdit } from '@/lib/inline-edits'

export interface BuildSiteOptions {
  niche: string
  templateSlug: string
  /** {{TOKEN}} → value map collected from the intake form / wizard. */
  customerValues: Record<string, string>
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  /** Exact colors/fonts selected in the live editor. */
  customTheme?: CustomTheme | null
  /** Server-snapshotted v3 design/content/theme receipt from checkout. */
  catalogRevision?: CatalogRevisionPin | null
  /** Inline text edits keyed by page filename (e.g. "index.html"). */
  inlineEdits?: Record<string, InlineTextEdit[]>
  /** Image src replacements keyed by page filename. */
  imageSwaps?: Record<string, ImageSwap[]>
  /** Slug used by the injected contact-form handler to attribute submissions. */
  slug: string
  /** Canonical public origin used to generate robots.txt and sitemap.xml. */
  siteUrl: string
}

export const STRIPE_METADATA_VALUE_LIMIT = 500
const MAX_INLINE_EDITS_PER_PAGE = 250
const MAX_INLINE_EDIT_LENGTH = 10_000
const MAX_CUSTOMER_VALUES = 200
const MAX_CUSTOMER_VALUE_LENGTH = 5_000

function canonicalSiteOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname) return null
    return url.origin
  } catch {
    return null
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSearchEngineFiles(siteUrl: string, pages: readonly string[]) {
  const origin = canonicalSiteOrigin(siteUrl)
  if (!origin) return null
  const pageUrls = pages.map((page) => new URL(page === 'index.html' ? '/' : `/${page}`, origin).toString())
  return {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    'sitemap.xml': [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...pageUrls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n'),
  }
}

export type DeployFileContent = string | Buffer

/** Normalize client-supplied inline edits before durable storage or deploy. */
export function sanitizeInlineEditMap(value: unknown): Record<string, InlineTextEdit[]> {
  return sanitizeStoredInlineEditMap(value)
}

export function sanitizeCustomerValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value).slice(0, MAX_CUSTOMER_VALUES)) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(key) || typeof raw !== 'string') continue
    result[key] = raw.replace(/\0/g, '').slice(0, MAX_CUSTOMER_VALUE_LENGTH)
  }
  return result
}

/**
 * Apply inline text overrides to a hydrated HTML string.
 *
 * Stable element IDs update exactly the element the customer selected. Drafts
 * created before IDs existed retain their original exact-text fallback.
 */
export function applyInlineTextEdits(
  html: string,
  edits?: InlineTextEdit[],
  page = 'index.html',
): string {
  const boundedEdits = Array.isArray(edits)
    ? edits
      .filter((edit) => (
        edit &&
        typeof edit.updated === 'string' &&
        (typeof edit.nodeId === 'string' ||
          typeof edit.id === 'string' ||
          typeof edit.original === 'string')
      ))
      .slice(0, MAX_INLINE_EDITS_PER_PAGE)
      .map((edit) => ({
        ...edit,
        updated: edit.updated.slice(0, MAX_INLINE_EDIT_LENGTH),
      }))
    : undefined
  return applyInlineEditsToHtml(
    html,
    boundedEdits,
    page,
  )
}

/**
 * Apply persisted page customizations with strict v3 identity checks.
 *
 * Preview callers intentionally use the non-throwing wrappers so a stale edit
 * can be repaired in the editor. Deployment must fail closed: publishing a
 * page after silently applying a stale ID by duplicate text/URL would corrupt
 * customer content in a way that is difficult to spot or undo.
 */
export function applyPageCustomizationsForDeploy(
  html: string,
  edits: InlineTextEdit[] | undefined,
  swaps: ImageSwap[] | undefined,
  page = 'index.html',
): string {
  const edited = applyInlineEditsToHtmlWithReport(html, edits, page)
  const imaged = applyImageSwapsToHtmlWithReport(edited.html, swaps, page)
  if (edited.unmatchedNodeIds.length > 0 || imaged.unmatchedSlotIds.length > 0) {
    const details = [
      edited.unmatchedNodeIds.length > 0
        ? `text IDs: ${edited.unmatchedNodeIds.join(', ')}`
        : '',
      imaged.unmatchedSlotIds.length > 0
        ? `image IDs: ${imaged.unmatchedSlotIds.join(', ')}`
        : '',
    ].filter(Boolean).join('; ')
    throw new Error(`Cannot deploy ${page}: saved customization targets no longer exist (${details})`)
  }
  return imaged.html
}

export function buildContactFormScript(slug: string): string {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://dailyclarity.org'
  ).replace(/\/$/, '')
  const endpoint = JSON.stringify(`${apiBase}/api/forms/contact?slug=${encodeURIComponent(slug)}`)
  const siteSlug = JSON.stringify(slug)
  return `
<script>
(function(){
  function eligible(form) {
    return !!(
      form.querySelector('input[type="email"],input[name="email" i],input[name="email_address" i]') &&
      form.querySelector('input[name="name" i],input[name="full_name" i],input[autocomplete="name"]') &&
      form.querySelector('textarea')
    );
  }

  document.querySelectorAll('form').forEach(function(form) {
    if (!eligible(form)) return;
    form.setAttribute('data-dailyclarity-contact', 'true');

    var notice = document.createElement('p');
    notice.setAttribute('data-dailyclarity-privacy-notice', 'true');
    notice.style.cssText = 'font-size:.8rem;line-height:1.45;opacity:.78;margin:.75rem 0';
    notice.textContent = 'For your privacy, do not include medical, mental-health, financial, or other sensitive information.';
    form.appendChild(notice);

    var status = document.createElement('p');
    status.setAttribute('data-dailyclarity-form-status', 'true');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'font-size:.9rem;line-height:1.45;margin:.75rem 0';
    form.appendChild(status);
  });

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement) || !eligible(form)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    if (form.getAttribute('aria-busy') === 'true') return;

    var raw = {};
    new FormData(form).forEach(function(value, key) {
      if (typeof value === 'string') raw[String(key).toLowerCase()] = value;
    });
    function first(keys, fallback) {
      for (var i = 0; i < keys.length; i += 1) {
        var value = raw[keys[i]];
        if (value && String(value).trim()) return String(value).trim();
      }
      return fallback && fallback.value ? String(fallback.value).trim() : '';
    }

    var nameInput = form.querySelector('input[name="name" i],input[name="full_name" i],input[autocomplete="name"]');
    var emailInput = form.querySelector('input[type="email"],input[name="email" i],input[name="email_address" i]');
    var phoneInput = form.querySelector('input[type="tel"],input[name="phone" i],input[name="phone_number" i]');
    var messageInput = form.querySelector('textarea[name="message" i],textarea[name="comments" i],textarea[name="notes" i],textarea[name="note" i],textarea[name="goal" i],textarea');
    var status = form.querySelector('[data-dailyclarity-form-status]');
    var submit = form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
    var data = {
      slug: ${siteSlug},
      name: first(['name', 'full_name', 'fullname'], nameInput),
      email: first(['email', 'email_address'], emailInput),
      phone: first(['phone', 'phone_number', 'telephone'], phoneInput),
      message: first(['message', 'comments', 'notes', 'note', 'goal', 'details'], messageInput) || 'New inquiry submitted from the website.'
    };

    form.setAttribute('aria-busy', 'true');
    if (submit) submit.disabled = true;
    if (status) {
      status.setAttribute('role', 'status');
      status.textContent = 'Sending your message…';
    }

    fetch(${endpoint}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function(response) {
      if (!response.ok) throw new Error('Contact request failed');
      return response.json().catch(function() { return {}; });
    }).then(function(result) {
      form.reset();
      if (status) {
        status.textContent = result.deliveryStatus === 'sent'
          ? 'Thank you! Your message was sent.'
          : 'Thank you! Your message was received and saved for follow-up.';
      }
    }).catch(function() {
      if (status) {
        status.setAttribute('role', 'alert');
        status.textContent = 'We could not send your message. Please try again or use the contact details on this page.';
      }
    }).finally(function() {
      form.removeAttribute('aria-busy');
      if (submit) submit.disabled = false;
    });
  }, true);
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
export async function buildDeployFiles(
  opts: BuildSiteOptions,
): Promise<Record<string, DeployFileContent> | null> {
  const {
    niche,
    templateSlug,
    customerValues,
    colorScheme = 'original',
    fontVariation = 'original',
    structureVariation = 'original',
    customTheme,
    catalogRevision,
    inlineEdits,
    imageSwaps,
    slug,
    siteUrl,
  } = opts

  const templateData = await getTemplate(niche, templateSlug)
  if (!templateData) return null
  assertCatalogRevision(templateData, catalogRevision)
  const searchEngineFiles = buildSearchEngineFiles(siteUrl, templateData.pages)
  if (!searchEngineFiles) return null

  const safeCustomerValues = sanitizeCustomerValues(customerValues)
  const safeInlineEdits = sanitizeInlineEditMap(inlineEdits)
  const safeImageSwaps = sanitizeImageSwapMap(imageSwaps)

  // Fetch shared assets + every page in parallel — each read is a CDN
  // round-trip in production, so serial loops blow up latency.
  const [cssFile, ...rawPages] = await Promise.all([
    readTemplateFile(niche, templateSlug, 'assets/css/styles.css'),
    ...templateData.pages.map((page) => readTemplateFile(niche, templateSlug, page)),
  ])
  const variationCSS = [
    buildVariationCSS(colorScheme, fontVariation, structureVariation, cssFile || ''),
    buildCustomThemeCss(customTheme, cssFile || ''),
  ].filter(Boolean).join('\n')
  const contactScript = buildContactFormScript(slug)

  const deployFiles: Record<string, DeployFileContent> = {}

  templateData.pages.forEach((page, i) => {
    const rawHtml = rawPages[i]
    if (!rawHtml) return

    let html = hydrateTemplate(rawHtml, safeCustomerValues, templateData.fields)
    html = applyPageCustomizationsForDeploy(
      html,
      safeInlineEdits[page],
      safeImageSwaps[page],
      page,
    )

    const injectedStyles: string[] = []
    if (cssFile) injectedStyles.push(cssFile)
    if (variationCSS) injectedStyles.push(variationCSS)
    if (injectedStyles.length > 0) {
      html = html.replace('</head>', `<style>${injectedStyles.join('\n')}</style></head>`)
    }

    html = html.replace('</body>', contactScript + '</body>')
    deployFiles[page] = html
  })

  const pageSet = new Set(templateData.pages)
  const assets = templateData.files.filter((file) => !pageSet.has(file))
  const assetBuffers = await Promise.all(
    assets.map((file) => readTemplateFileBuffer(niche, templateSlug, file)),
  )
  assets.forEach((file, index) => {
    const content = assetBuffers[index]
    if (content) deployFiles[file] = content
  })

  // These are always generated for the actual deployed origin. Template-level
  // copies are intentionally overwritten so a cloned site cannot advertise a
  // stale domain or unhydrated placeholder URL.
  Object.assign(deployFiles, searchEngineFiles)

  // A validated manifest promises a complete atomic file set. If an object is
  // missing from storage, abort instead of publishing a visually broken site.
  if (templateData.files.some((file) => deployFiles[file] === undefined)) return null

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

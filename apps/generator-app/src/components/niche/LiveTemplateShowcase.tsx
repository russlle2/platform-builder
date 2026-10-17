'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export type ShowcaseTemplate = {
  slug: string
  name: string
  layoutFamily?: string
  snippet: string
}

type Props = {
  niche: string
  nicheLabel: string
  templates: ShowcaseTemplate[]
  totalCount: number
  headingClass?: string
}

const LAYOUT_LABELS: Record<string, string> = {
  earthy_warm: 'Earthy & Warm',
  clinical_modern: 'Modern & Clinical',
  'clinical-modern': 'Modern & Clinical',
  clinic_modern: 'Modern & Clinical',
  bold_playful: 'Bold & Playful',
  poster_hero: 'Poster Hero',
  minimalist_clean: 'Minimal & Clean',
  zen_minimal: 'Minimal & Clean',
  nature_organic: 'Nature Organic',
  'nature-immersive': 'Nature Immersive',
  glass_morphism: 'Glass & Light',
  lux_gallery: 'Gallery Style',
  'luxury-gallery': 'Luxury Gallery',
  aura_editorial: 'Editorial',
  editorial: 'Editorial',
  magazine: 'Magazine',
  'bold-statement': 'Bold Statement',
  'hero-centered': 'Hero Centered',
  'hero-left': 'Hero Left',
  'split-screen': 'Split Screen',
  'community-warm': 'Community Warm',
  'conversion-focused': 'Conversion Focused',
  minimal: 'Minimal',
}

function layoutLabel(family?: string): string {
  if (!family) return 'Custom Layout'
  if (LAYOUT_LABELS[family]) return LAYOUT_LABELS[family]
  return family
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function shortName(name: string): string {
  const parts = name.split('·')
  const primary = parts[0]?.trim() || name
  return primary.length > 48 ? `${primary.slice(0, 45)}…` : primary
}

function snippetPreview(snippet: string, max = 60): string {
  const trimmed = snippet.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trim()}…`
}

export function LiveTemplateShowcase({
  niche,
  nicheLabel,
  templates,
  totalCount,
  headingClass = 'text-cyan-200',
}: Props) {
  const [selected, setSelected] = useState<ShowcaseTemplate | null>(null)
  const [previewState, setPreviewState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [attempt, setAttempt] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const browseHref = `/preview-your-business?niche=${encodeURIComponent(niche)}`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!selected) {
      dialog?.close()
      return
    }
    if (!dialog?.open) dialog?.showModal()

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    let current = true
    setPreviewState('loading')
    setPreviewHtml(null)
    const url = `/api/templates/${encodeURIComponent(niche)}/${encodeURIComponent(selected.slug)}/html?sample=1`
    // The endpoint sanitizes the HTML and rewrites its assets. srcDoc avoids
    // framing an application URL (the platform deliberately sends X-Frame-Options:
    // DENY). An empty sandbox and noninteractive display disable scripts,
    // navigation and form submission; the document also inherits the page CSP.
    fetch(url, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
          throw new Error('Preview unavailable')
        }
        const html = await response.text()
        if (current) setPreviewHtml(html)
      })
      .catch(() => {
        if (current) setPreviewState('error')
      })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      current = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [selected, niche, attempt])

  useEffect(() => {
    if (!selected || !previewHtml || previewState !== 'loading') return
    const timeout = window.setTimeout(() => setPreviewState('error'), 30_000)
    return () => window.clearTimeout(timeout)
  }, [selected, previewHtml, previewState])

  const selectedHref = selected
    ? `${browseHref}&template=${encodeURIComponent(selected.slug)}`
    : browseHref

  return (
    <section id="template-styles" className="container-hvac py-12 scroll-mt-24">
      <div className="text-center mb-10 space-y-3 max-w-3xl mx-auto">
        <span className="signal-chip">Explore the actual designs</span>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Find the right look for your {nicheLabel.toLowerCase()} practice
        </h2>
        <p className="text-slate-300 text-lg">
          {templates.length > 0
            ? 'Open a homepage preview, check its mobile layout, then make it yours. No email or payment needed to look around.'
            : 'You can explore designs with your own business details or get help choosing a style.'}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center space-y-4">
          <p className="text-slate-200">No sample is available for this practice yet.</p>
          <p className="text-sm text-slate-400">Start with your own details to explore available designs, or contact us for help choosing.</p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href={browseHref} className="text-cyan-200 underline underline-offset-4">Start your business details</Link>
            <Link href="/contact" className="text-slate-200 underline underline-offset-4">Get help choosing</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <article
                key={template.slug}
                className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-slate-900/50 shadow-lg shadow-black/20"
              >
                <div className="p-5 flex-1 flex flex-col items-start gap-3 min-w-0">
                  <span className={`max-w-full text-xs font-semibold px-3 py-1 rounded-full border border-white/15 bg-white/5 break-words ${headingClass}`}>
                    {layoutLabel(template.layoutFamily)}
                  </span>
                  <h3 className="text-lg font-semibold text-white leading-snug break-words">
                    {shortName(template.name)}
                  </h3>
                  {template.snippet && (
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 break-words">
                      {snippetPreview(template.snippet)}
                    </p>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`Open homepage preview: ${template.name}`}
                    onClick={() => {
                      setPreviewState('loading')
                      setPreviewHtml(null)
                      setSelected(template)
                    }}
                    className="w-full rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                  >
                    Open homepage preview →
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href={browseHref} className={`inline-flex items-center gap-2 font-semibold ${headingClass} hover:text-white underline underline-offset-4`}>
              Find a style with my business details →
            </Link>
            {totalCount > templates.length && (
              <p className="mt-2 text-sm text-slate-400">
                A few starting points from {totalCount.toLocaleString()} available designs.
              </p>
            )}
          </div>
        </>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="style-preview-title"
        aria-describedby="style-preview-description"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        className="w-[calc(100%-1.5rem)] max-w-6xl max-h-[calc(100dvh-1.5rem)] m-auto rounded-2xl border border-slate-700 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/80"
      >
        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-950 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="style-preview-title" className="font-semibold text-lg break-words">{selected?.name}</h3>
              <p id="style-preview-description" className="mt-1 text-sm text-slate-400">Sample homepage. Links and forms are disabled in this view.</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              Close preview
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Preview width">
            {(['desktop', 'mobile'] as const).map((size) => (
              <button key={size} type="button" aria-pressed={device === size} onClick={() => setDevice(size)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${device === size ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>
                {size === 'desktop' ? 'Wide view' : 'Mobile view'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-80 overflow-hidden bg-slate-800 p-3 sm:p-5" aria-busy={previewState === 'loading'}>
          {previewState === 'loading' && (
            <p role="status" className="absolute inset-x-4 top-16 text-center text-slate-200">Loading this homepage…</p>
          )}
          {previewState === 'error' && (
            <div role="status" className="py-16 text-center space-y-4">
              <p>This homepage preview couldn&apos;t load. Try again or choose another style.</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg border border-cyan-300/40 px-5 py-3 font-semibold text-cyan-100">Try again</button>
            </div>
          )}
          {selected && previewHtml && previewState !== 'error' && (
            <div className={`relative mx-auto overflow-hidden rounded-lg bg-white ${device === 'mobile' ? 'max-w-[390px]' : 'w-full'} ${previewState === 'ready' ? '' : 'invisible'}`}>
              <iframe
                key={`${selected?.slug}-${attempt}`}
                srcDoc={previewHtml}
                title={`${selected?.name || nicheLabel} sample homepage, ${device === 'mobile' ? 'mobile' : 'wide'} view`}
                sandbox=""
                referrerPolicy="no-referrer"
                tabIndex={-1}
                onLoad={() => setPreviewState('ready')}
                onError={() => setPreviewState('error')}
                className="pointer-events-none block h-[1000px] w-full border-0"
              />
            </div>
          )}
        </div>
        <div className="border-t border-slate-700 bg-slate-950 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`${selectedHref}&sample=1`} className="rounded-xl bg-cyan-300 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-200">
              Try this style with sample details
            </Link>
            <Link href={selectedHref} className="rounded-xl border border-slate-600 px-5 py-3 text-center font-semibold text-slate-100 hover:bg-slate-800">
              Use my business details
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">Continue to the editor to explore pages and personalize supported text and images.</p>
        </div>
      </dialog>
    </section>
  )
}

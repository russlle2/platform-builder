'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  type InlineTextEdit,
  INLINE_EDITS_KEY,
  mergeInlineEdit,
  applyInlineEditsToHtml,
  loadInlineEdits,
} from '@/lib/inline-edits'
import {
  type ImageSwapMap,
  loadImageSwaps,
  applyImageSwapsToHtml,
  handlePersistentImageUpload,
  getOrCreateImageOwnerId,
  saveImageSwaps,
} from '@/lib/image-swaps'
import { CustomerImageLibrary } from '@/components/CustomerImageLibrary'
import { getStoredPortalToken } from '@/lib/portal-token-client'

interface TemplateField {
  name: string
  label: string
  type: string
  required?: boolean
  default?: string
}

interface TemplateData {
  slug: string
  name: string
  niche: string
  nicheSlug: string
  layoutFamily?: string
  voiceFamily?: string
  pages: string[]
  fields: TemplateField[]
  snippet: string
}

/* ---------- Accent map ---------- */
const accentMap: Record<string, { chip: string; heading: string; btn: string; glow: string }> = {
  aromatherapy: { chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30', heading: 'text-emerald-200', btn: 'from-emerald-500 to-green-600 border-emerald-200/40', glow: 'rgba(16,185,129,0.3)' },
  holistic_medicine: { chip: 'bg-violet-500/10 text-violet-300 border-violet-400/30', heading: 'text-violet-200', btn: 'from-violet-500 to-purple-600 border-violet-200/40', glow: 'rgba(139,92,246,0.3)' },
  private_practice_therapist: { chip: 'bg-amber-500/10 text-amber-300 border-amber-400/30', heading: 'text-amber-200', btn: 'from-amber-500 to-orange-600 border-amber-200/40', glow: 'rgba(245,158,11,0.3)' },
  sound_bath: { chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30', heading: 'text-indigo-200', btn: 'from-indigo-500 to-blue-600 border-indigo-200/40', glow: 'rgba(99,102,241,0.3)' },
  wellness_coach: { chip: 'bg-rose-500/10 text-rose-300 border-rose-400/30', heading: 'text-rose-200', btn: 'from-rose-500 to-pink-600 border-rose-200/40', glow: 'rgba(244,63,94,0.3)' },
}

const nicheLabels: Record<string, string> = {
  aromatherapy: 'Aromatherapy',
  holistic_medicine: 'Holistic Medicine',
  private_practice_therapist: 'Private Practice Therapist',
  sound_bath: 'Sound Bath',
  wellness_coach: 'Wellness Coach',
}

/* ---------- Script injected into preview iframe for editing + nav ---------- */
function getIframeInjectionScript(): string {
  return `
<script>
(function(){
  /* ---- Inline text editing ---- */
  var editableSelectors = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,a,blockquote,figcaption,label,button,dt,dd';

  document.addEventListener('dblclick', function(e) {
    var el = e.target.closest(editableSelectors);
    if (!el || el.isContentEditable) return;
    var originalText = el.textContent;
    el.contentEditable = 'true';
    el.style.outline = '2px solid #3b82f6';
    el.style.outlineOffset = '2px';
    el.style.borderRadius = '2px';
    el.style.cursor = 'text';
    el.focus();

    el.addEventListener('blur', function onBlur() {
      el.contentEditable = 'false';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = '';
      el.removeEventListener('blur', onBlur);
      // Notify parent of the edit (include the pre-edit text so it can persist)
      window.parent.postMessage({ type: 'textEdited', tag: el.tagName, original: originalText, text: el.textContent }, '*');
    }, { once: true });

    e.preventDefault();
    e.stopPropagation();
  });

  /* ---- Hover outlines for editable text ---- */
  var lastHovered = null;
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest(editableSelectors);
    if (lastHovered && lastHovered !== el && !lastHovered.isContentEditable) {
      lastHovered.style.outline = '';
      lastHovered.style.outlineOffset = '';
    }
    if (el && !el.isContentEditable) {
      el.style.outline = '1px dashed rgba(59,130,246,0.4)';
      el.style.outlineOffset = '1px';
      lastHovered = el;
    }
  });
  document.addEventListener('mouseout', function(e) {
    var el = e.target.closest(editableSelectors);
    if (el && !el.isContentEditable) {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  });

  /* ---- Image swap / insert ---- */
  document.addEventListener('click', function(e) {
    var img = e.target.closest('img');
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    // Ask parent to open file picker
    window.parent.postMessage({ type: 'imageSwapRequest', src: img.src, id: img.id || '' }, '*');
  });

  // Listen for image swap response from parent
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'imageSwapResponse') {
      var newSrc = e.data.imageUrl || e.data.dataUrl;
      if (!newSrc) return;
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].src === e.data.originalSrc || (!e.data.originalSrc && i === 0)) {
          imgs[i].src = newSrc;
          break;
        }
      }
    }
  });

  /* ---- Live page navigation ---- */
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    // Only intercept internal .html links
    if (href.endsWith('.html') || href === '/' || href === './') {
      e.preventDefault();
      e.stopPropagation();
      var page = href;
      if (page === '/' || page === './') page = 'index.html';
      if (!page.endsWith('.html')) page = page + '.html';
      // Strip leading ./ or /
      page = page.replace(/^\\.?\\//, '');
      window.parent.postMessage({ type: 'navigatePage', page: page }, '*');
    }
  });
})();
</script>
`
}

export default function TemplateCustomizePage({
  params: paramsPromise,
}: {
  params: Promise<{ niche: string; slug: string }>
}) {
  const searchParams = useSearchParams()
  const portalSlug = searchParams.get('portalSlug')
  const [params, setParams] = useState<{ niche: string; slug: string } | null>(null)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState('index.html')
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [editMode, setEditMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null!)
  const fileInputRef = useRef<HTMLInputElement>(null!)
  const pendingImageSwapSrc = useRef<string>('')
  // Inline text edits keyed by page filename, persisted so they survive page
  // navigation, variation switches, and carry through to purchase.
  const [inlineEdits, setInlineEdits] = useState<Record<string, InlineTextEdit[]>>({})
  const inlineEditsRef = useRef<Record<string, InlineTextEdit[]>>({})
  inlineEditsRef.current = inlineEdits
  const [imageSwaps, setImageSwaps] = useState<ImageSwapMap>({})
  const imageSwapsRef = useRef<ImageSwapMap>({})
  imageSwapsRef.current = imageSwaps
  const currentPageRef = useRef('index.html')
  currentPageRef.current = currentPage

  // Variation state
  const [colorScheme, setColorScheme] = useState('original')
  const [fontVariation, setFontVariation] = useState('original')
  const [structureVariation, setStructureVariation] = useState('original')
  const [variationOptions, setVariationOptions] = useState<{
    colorSchemes: { id: string; name: string }[]
    fontVariations: { id: string; name: string }[]
    structureVariations: { id: string; name: string }[]
  } | null>(null)

  // Resolve params promise
  useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  // Restore any inline edits captured earlier this session
  useEffect(() => {
    setInlineEdits(loadInlineEdits())
    const swaps = loadImageSwaps()
    setImageSwaps(swaps)
    imageSwapsRef.current = swaps
    getOrCreateImageOwnerId(portalSlug)
  }, [portalSlug])

  // Fetch available variation options
  useEffect(() => {
    fetch('/api/templates/variations')
      .then((r) => r.json())
      .then(setVariationOptions)
      .catch(() => {})
  }, [])

  // Fetch template metadata — pre-populate ALL fields with their defaults
  // + auto-populate from saved Preview Your Business info if available
  useEffect(() => {
    if (!params) return
    fetch(`/api/templates/${params.niche}/${params.slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Template not found')
        return r.json()
      })
      .then((data: TemplateData) => {
        setTemplate(data)

        // Try to load saved business info from Preview Your Business flow
        let savedValues: Record<string, string> = {}
        try {
          const savedInfo = sessionStorage.getItem('pb_biz_info')
          const infoSaved = sessionStorage.getItem('pb_info_saved')
          if (savedInfo && infoSaved === 'true') {
            const info = JSON.parse(savedInfo)
            savedValues = {
              BUSINESS_NAME: info.businessName || '',
              OWNER_NAME: info.ownerName || '',
              EMAIL: info.email || '',
              PHONE: info.phone || '',
              PHONE_NUMBER: info.phone || '',
              ADDRESS: info.address || '',
              TAGLINE: info.tagline || '',
              DESCRIPTION: info.description || '',
              SERVICES: info.services || '',
              WEBSITE: info.website || '',
              business_name: info.businessName || '',
              owner_name: info.ownerName || '',
              email: info.email || '',
              phone: info.phone || '',
              phone_number: info.phone || '',
              address: info.address || '',
              tagline: info.tagline || '',
              description: info.description || '',
            }
          }
        } catch { /* ignore */ }

        const initial: Record<string, string> = {}
        data.fields.forEach((f) => {
          // Priority: saved business info > template default > empty
          const upperName = f.name.toUpperCase()
          const savedVal = savedValues[f.name] || savedValues[upperName] || ''
          if (savedVal) {
            initial[f.name] = savedVal
          } else {
            initial[f.name] = f.default && !f.default.startsWith('{{') ? f.default : ''
          }
        })
        setValues(initial)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [params])

  // Listen for postMessage from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return

      if (e.data.type === 'navigatePage') {
        const page = e.data.page as string
        if (template?.pages.includes(page)) {
          loadPreview(page)
        }
      }

      if (e.data.type === 'imageSwapRequest') {
        pendingImageSwapSrc.current = e.data.src
        fileInputRef.current?.click()
      }

      if (e.data.type === 'textEdited') {
        const page = currentPageRef.current
        const original = (e.data.original as string) || ''
        const updated = (e.data.text as string) || ''
        const pageEdits = mergeInlineEdit(
          inlineEditsRef.current[page] || [],
          original,
          updated,
        )
        const next = { ...inlineEditsRef.current, [page]: pageEdits }
        setInlineEdits(next)
        try {
          sessionStorage.setItem(INLINE_EDITS_KEY, JSON.stringify(next))
        } catch { /* ignore */ }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  // Handle image file selection
  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const page = currentPageRef.current
    const originalSrc = pendingImageSwapSrc.current
    const owner = getOrCreateImageOwnerId()
    try {
      const { map, url } = await handlePersistentImageUpload(
        file,
        owner,
        originalSrc,
        page,
        imageSwapsRef.current,
      )
      setImageSwaps(map)
      imageSwapsRef.current = map
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'imageSwapResponse', imageUrl: url, originalSrc },
        '*',
      )
    } catch (err) {
      console.error('Image upload failed:', err)
      alert(err instanceof Error ? err.message : 'Image upload failed')
    }
    e.target.value = ''
  }, [])

  // Load preview
  const loadPreview = useCallback(
    async (page: string = 'index.html') => {
      if (!params || !template) return
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/templates/${params.niche}/${params.slug}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, values, colorScheme, fontVariation, structureVariation }),
        })
        if (!res.ok) throw new Error('Failed to load preview')
        const data = await res.json()

        let html = data.html as string
        const assetBase = `/api/templates/${params.niche}/${params.slug}/assets`

        // Rewrite relative href/src paths to use asset API (skip .html links)
        html = html.replace(
          /(href|src)="(?!https?:\/\/|\/\/|data:|mailto:|tel:|#)([^"]+)"/g,
          (match, attr, path) => {
            if (path.endsWith('.html')) return match
            return `${attr}="${assetBase}/${path}"`
          }
        )

        // Inject CSS if available
        if (data.css) {
          html = html.replace('</head>', `<style>${data.css}</style></head>`)
        }

        // Inject variation CSS overrides (must come after base CSS)
        if (data.variationCSS) {
          html = html.replace('</head>', `<style id="variation-overrides">${data.variationCSS}</style></head>`)
        }

        // Inject base styles + editing/navigation scripts
        html = html.replace('</head>', `
          <style>
            body { margin: 0; }
            img { cursor: pointer; transition: outline 0.15s; }
            img:hover { outline: 3px solid #8b5cf6; outline-offset: 2px; border-radius: 2px; }
          </style>
        </head>`)

        // Re-apply any inline text edits the user made (they aren't part of
        // the server hydration, which only fills {{TOKENS}}).
        html = applyInlineEditsToHtml(html, inlineEditsRef.current[page])
        html = applyImageSwapsToHtml(html, imageSwapsRef.current[page])

        // Inject interaction scripts before </body>
        html = html.replace('</body>', getIframeInjectionScript() + '</body>')

        setPreviewHtml(html)
        setCurrentPage(page)
      } catch (e) {
        console.error('Preview error:', e)
      } finally {
        setPreviewLoading(false)
      }
    },
    [params, template, values, colorScheme, fontVariation, structureVariation]
  )

  const handleGeneratePreview = () => {
    // Persist customer values so they survive navigation to pricing page
    try {
      sessionStorage.setItem('pb_template_values', JSON.stringify(values))
      saveImageSwaps(imageSwapsRef.current)
    } catch { /* ignore */ }
    setStep('preview')
    loadPreview('index.html')
  }

  const publishToLiveSite = useCallback(async () => {
    if (!portalSlug) return
    setPublishStatus('saving')
    try {
      // Use the customer portal API (portal-token authenticated) instead of
      // the admin-only /api/portal/site route.
      const token = getStoredPortalToken(portalSlug) || ''
      const res = await fetch('/api/portal/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-portal-token': token } : {}),
        },
        body: JSON.stringify({
          slug: portalSlug,
          token,
          customerValues: values,
          inlineEdits,
          imageSwaps: imageSwapsRef.current,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Publish failed')
      setPublishStatus('done')
    } catch {
      setPublishStatus('error')
    }
  }, [portalSlug, values, inlineEdits])

  if (loading || !params) {
    return (
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-wide py-20 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-white/10 rounded mx-auto" />
            <div className="h-4 w-96 bg-white/10 rounded mx-auto" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !template) {
    return (
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-wide text-center py-20">
          <h1 className="text-4xl font-bold text-white">Template not found</h1>
          <p className="text-slate-400 mt-4">{error}</p>
          <Link href={`/preview-your-business?niche=${encodeURIComponent(params.niche)}`} className="text-cyan-300 mt-4 inline-block">
            Start preview wizard →
            ← Back to templates
          </Link>
        </div>
      </main>
    )
  }

  const colors = accentMap[params.niche] || accentMap.wellness_coach
  const nicheLabel = nicheLabels[params.niche] || params.niche

  return (
    <main className="min-h-screen pt-24 pb-20">
      {/* Hidden file input for image swap */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <div className="container-wide">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link href={`/${params.niche}`} className="hover:text-white transition-colors">
            {nicheLabel}
          </Link>
          <span>/</span>
          <Link href={`/preview-your-business?niche=${encodeURIComponent(params.niche)}`} className="hover:text-white transition-colors">
            Intake
          </Link>
          <span>/</span>
          <span className="text-white">{template.name}</span>
        </div>

        {step === 'form' ? (
          <FormStep
            template={template}
            values={values}
            setValues={setValues}
            onPreview={handleGeneratePreview}
            colors={colors}
            nicheLabel={nicheLabel}
            niche={params.niche}
          />
        ) : (
          <PreviewStep
            template={template}
            previewHtml={previewHtml}
            previewLoading={previewLoading}
            currentPage={currentPage}
            onPageChange={(page) => loadPreview(page)}
            onBack={() => setStep('form')}
            colors={colors}
            nicheLabel={nicheLabel}
            niche={params.niche}
            iframeRef={iframeRef}
            editMode={editMode}
            setEditMode={setEditMode}
            colorScheme={colorScheme}
            setColorScheme={setColorScheme}
            fontVariation={fontVariation}
            setFontVariation={setFontVariation}
            structureVariation={structureVariation}
            setStructureVariation={setStructureVariation}
            variationOptions={variationOptions}
            onReloadPreview={() => loadPreview(currentPage)}
            portalSlug={portalSlug}
            publishStatus={publishStatus}
            onPublishLive={publishToLiveSite}
          />
        )}
      </div>
    </main>
  )
}

/* ================================================================== */
/* Form Step — Paginated by field groups                               */
/* ================================================================== */

const FIELDS_PER_PAGE = 4

/** Group template fields into logical pages based on field semantics */
function groupFieldsIntoPages(fields: TemplateField[]): { label: string; fields: TemplateField[] }[] {
  const groups: Record<string, TemplateField[]> = {
    'Business Identity': [],
    'Contact & Location': [],
    'Calls to Action': [],
    'Professional Details': [],
    'Additional Info': [],
  }

  for (const f of fields) {
    const key = f.name.toUpperCase()
    if (key.includes('BUSINESS_NAME') || key.includes('TAGLINE') || key === 'SITENAME' || key === 'SITETITLE') {
      groups['Business Identity'].push(f)
    } else if (key.includes('PHONE') || key.includes('EMAIL') || key.includes('ADDRESS') || key.includes('CITY') || key.includes('STATE') || key.includes('ZIP') || key.includes('HOURS')) {
      groups['Contact & Location'].push(f)
    } else if (key.includes('CTA') || key.includes('BUTTON') || key.includes('URL') || key.includes('LINK')) {
      groups['Calls to Action'].push(f)
    } else if (key.includes('NAME') || key.includes('LICENSE') || key.includes('MODALITIES') || key.includes('PRACTITIONER') || key.includes('THERAPIST') || key.includes('BLEND') || key.includes('DISCLAIMER')) {
      groups['Professional Details'].push(f)
    } else {
      groups['Additional Info'].push(f)
    }
  }

  // Filter empty groups and split any large group into sub-pages
  const pages: { label: string; fields: TemplateField[] }[] = []
  for (const [label, fieldList] of Object.entries(groups)) {
    if (fieldList.length === 0) continue
    if (fieldList.length <= FIELDS_PER_PAGE) {
      pages.push({ label, fields: fieldList })
    } else {
      for (let i = 0; i < fieldList.length; i += FIELDS_PER_PAGE) {
        const chunk = fieldList.slice(i, i + FIELDS_PER_PAGE)
        const pageNum = Math.floor(i / FIELDS_PER_PAGE) + 1
        pages.push({ label: `${label} (${pageNum})`, fields: chunk })
      }
    }
  }

  return pages.length > 0 ? pages : [{ label: 'Template Fields', fields }]
}

function FormStep({
  template,
  values,
  setValues,
  onPreview,
  colors,
  nicheLabel,
  niche,
}: {
  template: TemplateData
  values: Record<string, string>
  setValues: (v: Record<string, string>) => void
  onPreview: () => void
  colors: { chip: string; heading: string; btn: string; glow: string }
  nicheLabel: string
  niche: string
}) {
  const [currentPage, setCurrentPage] = useState(0)

  const pages = groupFieldsIntoPages(template.fields)
  const totalPages = pages.length
  const page = pages[currentPage] || pages[0]

  const filledCount = Object.values(values).filter((v) => v.trim()).length
  const totalFields = template.fields.length
  const progress = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0

  const goNext = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
  const goPrev = () => setCurrentPage((p) => Math.max(0, p - 1))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Form */}
      <div className="lg:col-span-2 space-y-8">
        <div className="space-y-4">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${colors.chip}`}>
            Customize Template
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {template.name}
          </h1>
          <p className="text-lg text-slate-300">
            Fill in your business information below — every field is pre-populated
            with placeholder copy you can keep or replace. Navigate pages with the
            arrows, then generate a live preview when you&apos;re ready.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            {template.layoutFamily && (
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                Layout: {template.layoutFamily.replace(/_/g, ' ')}
              </span>
            )}
            {template.voiceFamily && (
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                Voice: {template.voiceFamily.replace(/_/g, ' ')}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
              {template.pages.length} pages
            </span>
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
              {totalFields} customizable fields
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6">
          {/* Page header with progress */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{page.label}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Page {currentPage + 1} of {totalPages} &middot; {filledCount}/{totalFields} fields filled
              </p>
            </div>
            {/* Page indicator dots */}
            <div className="flex items-center gap-1.5">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentPage
                      ? 'bg-white scale-110'
                      : idx < currentPage
                      ? 'bg-white/40'
                      : 'bg-white/15'
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Fields for current page */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {page.fields.map((field) => (
              <div key={field.name} className={
                field.name === 'TAGLINE' || field.name === 'BUSINESS_NAME' || field.name === 'DISCLAIMER'
                  ? 'md:col-span-2'
                  : ''
              }>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {(field.name === 'TAGLINE' || field.name === 'DISCLAIMER' || field.name === 'MODALITIES') ? (
                  <textarea
                    rows={3}
                    value={values[field.name] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    placeholder={field.default || `Enter ${field.label.toLowerCase()}`}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all resize-none"
                  />
                ) : (
                  <input
                    type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    value={values[field.name] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    placeholder={field.default || `Enter ${field.label.toLowerCase()}`}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                )}
                {/* Show default hint if the field has one */}
                {field.default && !field.default.startsWith('{{') && (
                  <p className="text-xs text-slate-500 mt-1">
                    Default: {field.default}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination arrows and action buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={goPrev}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentPage === totalPages - 1 ? (
                <button
                  onClick={onPreview}
                  className={`px-8 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
                  style={{ boxShadow: `0 0 30px ${colors.glow}` }}
                >
                  Generate Live Preview
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className={`flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
                  style={{ boxShadow: `0 0 20px ${colors.glow}` }}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Quick-skip to preview */}
          {currentPage < totalPages - 1 && (
            <div className="text-center">
              <button
                onClick={onPreview}
                className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Skip to preview with current values →
              </button>
            </div>
          )}

          {/* Back to templates link */}
          <div className="text-center pt-2">
            <Link
              href={`/portal`}
              className="text-sm text-slate-500 hover:text-white transition-colors"
            >
              ← Back to Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4 sticky top-24">
          <h3 className="text-lg font-bold text-white">Template Details</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Category</span>
              <span className={`font-semibold ${colors.heading}`}>{nicheLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>Pages</span>
              <span className="font-semibold text-white">{template.pages.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Custom Fields</span>
              <span className="font-semibold text-white">{template.fields.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Filled</span>
              <span className="font-semibold text-white">{progress}%</span>
            </div>
          </div>
          <hr className="border-white/10" />

          {/* Page quick nav */}
          <h4 className="text-sm font-bold text-white">Customization Pages</h4>
          <ul className="space-y-1.5">
            {pages.map((p, idx) => (
              <li key={idx}>
                <button
                  onClick={() => setCurrentPage(idx)}
                  className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1 rounded transition-colors ${
                    idx === currentPage
                      ? 'text-white bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx < currentPage
                      ? 'bg-green-500/30 text-green-300'
                      : idx === currentPage
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-slate-500'
                  }`}>
                    {idx < currentPage ? '✓' : idx + 1}
                  </span>
                  {p.label}
                  <span className="ml-auto text-xs text-slate-500">{p.fields.length}</span>
                </button>
              </li>
            ))}
          </ul>

          <hr className="border-white/10" />
          <h4 className="text-sm font-bold text-white">Pages Included</h4>
          <ul className="space-y-1.5">
            {template.pages.map((page) => (
              <li key={page} className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                {page.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Preview Step                                                        */
/* ================================================================== */

function PreviewStep({
  template,
  previewHtml,
  previewLoading,
  currentPage,
  onPageChange,
  onBack,
  colors,
  nicheLabel,
  niche,
  iframeRef,
  editMode,
  setEditMode,
  colorScheme,
  setColorScheme,
  fontVariation,
  setFontVariation,
  structureVariation,
  setStructureVariation,
  variationOptions,
  onReloadPreview,
  portalSlug,
  publishStatus,
  onPublishLive,
}: {
  template: TemplateData
  previewHtml: string | null
  previewLoading: boolean
  currentPage: string
  onPageChange: (page: string) => void
  onBack: () => void
  colors: { chip: string; heading: string; btn: string; glow: string }
  nicheLabel: string
  niche: string
  iframeRef: React.RefObject<HTMLIFrameElement>
  editMode: boolean
  setEditMode: (v: boolean) => void
  colorScheme: string
  setColorScheme: (v: string) => void
  fontVariation: string
  setFontVariation: (v: string) => void
  structureVariation: string
  setStructureVariation: (v: string) => void
  variationOptions: {
    colorSchemes: { id: string; name: string }[]
    fontVariations: { id: string; name: string }[]
    structureVariations: { id: string; name: string }[]
  } | null
  onReloadPreview: () => void
  portalSlug: string | null
  publishStatus: 'idle' | 'saving' | 'done' | 'error'
  onPublishLive: () => void
}) {
  // Generic cycler helper
  const cycle = (
    list: { id: string; name: string }[] | undefined,
    current: string,
    dir: 1 | -1,
    setter: (v: string) => void,
  ) => {
    if (!list || list.length === 0) return
    const idx = list.findIndex((o) => o.id === current)
    const next = (idx + dir + list.length) % list.length
    setter(list[next].id)
  }

  // When any variation changes, reload the preview
  const prevColor = useRef(colorScheme)
  const prevFont = useRef(fontVariation)
  const prevStructure = useRef(structureVariation)
  useEffect(() => {
    if (
      prevColor.current !== colorScheme ||
      prevFont.current !== fontVariation ||
      prevStructure.current !== structureVariation
    ) {
      prevColor.current = colorScheme
      prevFont.current = fontVariation
      prevStructure.current = structureVariation
      onReloadPreview()
    }
  }, [colorScheme, fontVariation, structureVariation, onReloadPreview])

  const currentColorName = variationOptions?.colorSchemes.find((o) => o.id === colorScheme)?.name || 'Original'
  const currentFontName = variationOptions?.fontVariations.find((o) => o.id === fontVariation)?.name || 'Original'
  const currentStructureName = variationOptions?.structureVariations.find((o) => o.id === structureVariation)?.name || 'Original'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${colors.chip}`}>
            Live Preview
          </span>
          <h1 className="text-3xl font-bold text-white">{template.name}</h1>
          <p className="text-slate-400">
            Your business info has been populated into every page.
            <span className="text-blue-300 ml-1">Double-click text to edit &bull; Click images to swap</span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="px-6 py-3 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            ← Edit Info
          </button>
          {portalSlug && (
            <button
              type="button"
              onClick={onPublishLive}
              disabled={publishStatus === 'saving'}
              className="px-6 py-3 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
            >
              {publishStatus === 'saving'
                ? 'Publishing…'
                : publishStatus === 'done'
                  ? 'Published ✓'
                  : 'Publish to live site'}
            </button>
          )}
          <Link
            href={`/pricing?template=${template.slug}&niche=${niche}&color=${colorScheme}&font=${fontVariation}&structure=${structureVariation}`}
            className={`px-6 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
            style={{ boxShadow: `0 0 20px ${colors.glow}` }}
          >
            Purchase This Site →
          </Link>
        </div>
      </div>

      <CustomerImageLibrary owner={portalSlug || undefined} />

      {/* ═══════ Variation Switcher Bar ═══════ */}
      {variationOptions && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            <span className="text-sm font-semibold text-white">Style Variations</span>
            <span className="text-xs text-slate-500 ml-2">Use arrows to cycle through 10 options for each</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Color Scheme */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
              <button
                onClick={() => cycle(variationOptions.colorSchemes, colorScheme, -1, setColorScheme)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Previous color scheme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 text-center min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Color</div>
                <div className="text-sm font-bold text-white truncate">{currentColorName}</div>
              </div>
              <button
                onClick={() => cycle(variationOptions.colorSchemes, colorScheme, 1, setColorScheme)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Next color scheme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Font */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
              <button
                onClick={() => cycle(variationOptions.fontVariations, fontVariation, -1, setFontVariation)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Previous font"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 text-center min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Font</div>
                <div className="text-sm font-bold text-white truncate">{currentFontName}</div>
              </div>
              <button
                onClick={() => cycle(variationOptions.fontVariations, fontVariation, 1, setFontVariation)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Next font"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Structure */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
              <button
                onClick={() => cycle(variationOptions.structureVariations, structureVariation, -1, setStructureVariation)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Previous structure"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 text-center min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Layout</div>
                <div className="text-sm font-bold text-white truncate">{currentStructureName}</div>
              </div>
              <button
                onClick={() => cycle(variationOptions.structureVariations, structureVariation, 1, setStructureVariation)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
                title="Next structure"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page tabs */}
      <div className="flex flex-wrap gap-2">
        {template.pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              currentPage === page
                ? `bg-white/15 text-white border border-white/20`
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {page.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Preview iframe */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Windows-style browser chrome */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#202225] border-b border-white/10">
          {/* Left: page favicon + URL bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Back">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Forward">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Refresh" onClick={() => onPageChange(currentPage)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 7A4.5 4.5 0 1 1 7 2.5M7 2.5V5.5M7 2.5H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            {/* URL bar */}
            <div className="flex-1 mx-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2b2d31] border border-white/5 text-xs text-slate-400 font-mono">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5S8.76 1 6 1z" stroke="#6b7280" strokeWidth="0.8"/><path d="M1 6h10M6 1c1.1 1.2 1.7 3 1.7 5s-.6 3.8-1.7 5c-1.1-1.2-1.7-3-1.7-5s.6-3.8 1.7-5z" stroke="#6b7280" strokeWidth="0.8"/></svg>
              <span className="truncate">yourbusiness.platformbuilder.com/{currentPage}</span>
            </div>
          </div>

          {/* Right: Window controls */}
          <div className="flex items-center ml-4">
            {/* Minimize */}
            <div className="w-[34px] h-[28px] flex items-center justify-center hover:bg-white/10 transition-colors cursor-default">
              <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#999"/></svg>
            </div>
            {/* Maximize */}
            <div className="w-[34px] h-[28px] flex items-center justify-center hover:bg-white/10 transition-colors cursor-default">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" stroke="#999" strokeWidth="1"/></svg>
            </div>
            {/* Close */}
            <div className="w-[34px] h-[28px] flex items-center justify-center hover:bg-[#e81123] transition-colors cursor-default rounded-tr-xl">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#999" strokeWidth="1.2"/><line x1="9" y1="1" x2="1" y2="9" stroke="#999" strokeWidth="1.2"/></svg>
            </div>
          </div>
        </div>

        {/* Content */}
        {previewLoading ? (
          <div className="flex items-center justify-center h-[700px] bg-white">
            <div className="text-center space-y-4">
              <div className="animate-spin w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full mx-auto" />
              <p className="text-slate-600 font-medium">Generating preview...</p>
            </div>
          </div>
        ) : previewHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            className="w-full bg-white"
            style={{ height: 'min(85vh, 1200px)', minHeight: '70vh' }}
            sandbox="allow-same-origin allow-scripts"
            title="Template preview"
          />
        ) : (
          <div className="flex items-center justify-center h-[700px] bg-slate-900">
            <p className="text-slate-400">Preview will appear here</p>
          </div>
        )}
      </div>

      {/* Editing hint bar */}
      <div className="flex flex-wrap items-center gap-6 px-6 py-3 rounded-xl bg-slate-800/60 border border-white/5 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400/60" />
          <strong className="text-slate-300">Double-click</strong> any text to edit inline
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400/60" />
          <strong className="text-slate-300">Click</strong> any image to swap or replace it
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/60" />
          <strong className="text-slate-300">Click links</strong> in the preview to navigate between pages
        </span>
      </div>

      {/* Bottom CTA */}
      <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Love what you see?</h2>
        <p className="text-slate-300 max-w-xl mx-auto">
          This is your actual website with your real business information. Purchase now to
          get it deployed with a custom domain, email integration, and ongoing updates.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/pricing?template=${template.slug}&niche=${niche}`}
            className={`px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
            style={{ boxShadow: `0 0 30px ${colors.glow}` }}
          >
            Purchase This Site
          </Link>
          <Link
            href="/portal"
            className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            Back to Portal
          </Link>
        </div>
      </div>
    </div>
  )
}

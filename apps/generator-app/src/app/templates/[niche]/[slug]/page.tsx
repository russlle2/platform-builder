'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'

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
  hvac: { chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30', heading: 'text-cyan-200', btn: 'from-cyan-500 to-blue-600 border-cyan-200/40', glow: 'rgba(34,211,238,0.3)' },
  private_practice_therapist: { chip: 'bg-amber-500/10 text-amber-300 border-amber-400/30', heading: 'text-amber-200', btn: 'from-amber-500 to-orange-600 border-amber-200/40', glow: 'rgba(245,158,11,0.3)' },
  sound_bath: { chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30', heading: 'text-indigo-200', btn: 'from-indigo-500 to-blue-600 border-indigo-200/40', glow: 'rgba(99,102,241,0.3)' },
  wellness_coach: { chip: 'bg-rose-500/10 text-rose-300 border-rose-400/30', heading: 'text-rose-200', btn: 'from-rose-500 to-pink-600 border-rose-200/40', glow: 'rgba(244,63,94,0.3)' },
}

const nicheLabels: Record<string, string> = {
  aromatherapy: 'Aromatherapy',
  holistic_medicine: 'Holistic Medicine',
  hvac: 'HVAC',
  private_practice_therapist: 'Private Practice Therapist',
  sound_bath: 'Sound Bath',
  wellness_coach: 'Wellness Coach',
}

export default function TemplateCustomizePage({
  params: paramsPromise,
}: {
  params: Promise<{ niche: string; slug: string }>
}) {
  const [params, setParams] = useState<{ niche: string; slug: string } | null>(null)
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState('index.html')
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const iframeRef = useRef<HTMLIFrameElement>(null!)

  // Resolve params promise
  useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  // Fetch template metadata
  useEffect(() => {
    if (!params) return
    fetch(`/api/templates/${params.niche}/${params.slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Template not found')
        return r.json()
      })
      .then((data: TemplateData) => {
        setTemplate(data)
        // Initialize form values with defaults
        const initial: Record<string, string> = {}
        data.fields.forEach((f) => {
          initial[f.name] = f.default && !f.default.startsWith('{{') ? f.default : ''
        })
        setValues(initial)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [params])

  // Load preview
  const loadPreview = useCallback(
    async (page: string = 'index.html') => {
      if (!params || !template) return
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/templates/${params.niche}/${params.slug}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, values }),
        })
        if (!res.ok) throw new Error('Failed to load preview')
        const data = await res.json()

        // Rewrite asset paths to use our API
        let html = data.html as string
        const assetBase = `/api/templates/${params.niche}/${params.slug}/assets`

        // Rewrite relative href/src paths to use asset API
        html = html.replace(
          /(href|src)="(?!https?:\/\/|\/\/|data:|mailto:|tel:|#)([^"]+)"/g,
          (match, attr, path) => {
            if (path.endsWith('.html')) {
              // Keep HTML links as-is for page navigation
              return match
            }
            return `${attr}="${assetBase}/${path}"`
          }
        )

        // Inject CSS if available
        if (data.css) {
          html = html.replace('</head>', `<style>${data.css}</style></head>`)
        }

        // Inject base styles for iframe
        html = html.replace('</head>', `
          <style>
            body { margin: 0; }
            /* Disable all links in preview */
            a[href$=".html"] { pointer-events: none; }
          </style>
        </head>`)

        setPreviewHtml(html)
        setCurrentPage(page)
      } catch (e) {
        console.error('Preview error:', e)
      } finally {
        setPreviewLoading(false)
      }
    },
    [params, template, values]
  )

  const handleGeneratePreview = () => {
    setStep('preview')
    loadPreview('index.html')
  }

  if (loading || !params) {
    return (
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-hvac py-20 text-center">
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
        <div className="container-hvac text-center py-20">
          <h1 className="text-4xl font-bold text-white">Template not found</h1>
          <p className="text-slate-400 mt-4">{error}</p>
          <Link href={`/templates/${params.niche}`} className="text-cyan-300 mt-4 inline-block">
            ← Back to templates
          </Link>
        </div>
      </main>
    )
  }

  const colors = accentMap[params.niche] || accentMap.hvac
  const nicheLabel = nicheLabels[params.niche] || params.niche

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link href={`/${params.niche}`} className="hover:text-white transition-colors">
            {nicheLabel}
          </Link>
          <span>/</span>
          <Link href={`/templates/${params.niche}`} className="hover:text-white transition-colors">
            Templates
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
          />
        )}
      </div>
    </main>
  )
}

/* ================================================================== */
/* Form Step                                                           */
/* ================================================================== */

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
  const filledCount = Object.values(values).filter((v) => v.trim()).length
  const totalFields = template.fields.length
  const progress = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0

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
            Fill in your business information below. Every field populates directly into
            your website template. When you&apos;re ready, generate a live preview.
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
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your Business Information</h2>
            <span className="text-sm text-slate-400">{filledCount}/{totalFields} fields</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {template.fields.map((field) => (
              <div key={field.name} className={field.name === 'TAGLINE' || field.name === 'BUSINESS_NAME' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                  value={values[field.name] || ''}
                  onChange={(e) =>
                    setValues({ ...values, [field.name]: e.target.value })
                  }
                  placeholder={field.default || `Enter ${field.label.toLowerCase()}`}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onPreview}
              className={`px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
              style={{ boxShadow: `0 0 30px ${colors.glow}` }}
            >
              Generate Live Preview
            </button>
            <Link
              href={`/templates/${niche}`}
              className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
            >
              ← Back to Templates
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
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${colors.chip}`}>
            Live Preview
          </span>
          <h1 className="text-3xl font-bold text-white">{template.name}</h1>
          <p className="text-slate-400">Your business info has been populated into every page.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-6 py-3 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            ← Edit Info
          </button>
          <Link
            href={`/pricing?template=${template.slug}&niche=${niche}`}
            className={`px-6 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
            style={{ boxShadow: `0 0 20px ${colors.glow}` }}
          >
            Purchase This Site →
          </Link>
        </div>
      </div>

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
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/80 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 mx-4 px-4 py-1 rounded bg-slate-800 text-xs text-slate-400 text-center font-mono">
            yourbusiness.platformbuilder.com/{currentPage}
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
            className="w-full h-[700px] bg-white"
            sandbox="allow-same-origin"
            title="Template preview"
          />
        ) : (
          <div className="flex items-center justify-center h-[700px] bg-slate-900">
            <p className="text-slate-400">Preview will appear here</p>
          </div>
        )}
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
            href={`/templates/${niche}`}
            className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            Browse Other Templates
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

function formatPageLabel(page: string): string {
  return page
    .replace('.html', '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type Props = {
  niche: string
  slug: string
  templateName: string
  pages: string[]
  nicheLabel: string
  accentBtn: string
  accentChip: string
}

export function TemplateFullSiteViewer({
  niche,
  slug,
  templateName,
  pages,
  nicheLabel,
  accentBtn,
  accentChip,
}: Props) {
  const [currentPage, setCurrentPage] = useState('index.html')
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const iframeSrc = `/api/templates/${niche}/${slug}/html?page=${encodeURIComponent(currentPage)}&browse=1`

  useEffect(() => {
    setLoaded(false)
  }, [currentPage, niche, slug])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'templateBrowseNav' && typeof event.data.page === 'string') {
        setCurrentPage(event.data.page)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const goPage = useCallback((page: string) => {
    setCurrentPage(page)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${accentChip}`}
          >
            Full site preview
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{templateName}</h1>
          <p className="text-slate-400 max-w-2xl">
            Browse every page in this template at full size. Use the tabs below or click links inside
            the preview. When you&apos;re ready, customize with your business info.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/templates/${niche}`}
            className="px-5 py-2.5 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            ← All {nicheLabel} templates
          </Link>
          <Link
            href={`/templates/${niche}/${slug}`}
            className={`px-6 py-2.5 text-sm font-bold rounded-lg text-white bg-gradient-to-r border shadow-lg hover:shadow-xl hover:scale-105 transition-all ${accentBtn}`}
          >
            Customize this template
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => goPage(page)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              currentPage === page
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {formatPageLabel(page)}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[#202225] border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
            <span className="text-slate-500">Preview</span>
            <span className="text-slate-300 truncate">/{currentPage}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            {pages.length} pages
          </span>
        </div>

        <div className="relative bg-white min-h-[70vh]">
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-4 border-slate-300 border-t-cyan-500 rounded-full animate-spin mx-auto" />
                <p className="text-slate-600 text-sm font-medium">Loading {formatPageLabel(currentPage)}…</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={iframeSrc}
            src={iframeSrc}
            title={`${templateName} — ${formatPageLabel(currentPage)}`}
            className="w-full border-0"
            style={{ height: 'min(85vh, 1200px)', minHeight: '70vh' }}
            sandbox="allow-same-origin allow-scripts"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Tip: click navigation links inside the site preview to move between pages, or use the tabs above.
      </p>
    </div>
  )
}

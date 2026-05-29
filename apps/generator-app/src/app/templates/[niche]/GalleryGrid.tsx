'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface TemplateCard {
  slug: string
  name: string
  layoutFamily?: string
  voiceFamily?: string
  pages: string[]
  fieldCount: number
  snippet?: string
}

interface Props {
  niche: string
  templates: TemplateCard[]
  accentBtn: string
  accentGlow: string
  accentHeading: string
  accentCard: string
}

/* ---------- Single thumbnail card ---------- */
function TemplateThumbnail({
  template,
  niche,
  index,
  accentBtn,
  accentGlow,
  accentHeading,
  accentCard,
}: {
  template: TemplateCard
  niche: string
  index: number
  accentBtn: string
  accentGlow: string
  accentHeading: string
  accentCard: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Lazy-load iframes when card scrolls into view
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const iframeSrc = `/api/templates/${niche}/${template.slug}/html?page=index.html`

  const viewHref = `/templates/${niche}/${template.slug}/view`

  return (
    <div
      ref={cardRef}
      className={`card-mahogany overflow-hidden transition-all duration-300 hover:scale-[1.02] ${accentCard}`}
    >
      {/* Live iframe preview — click opens full-site browser */}
      <Link
        href={viewHref}
        className="block relative bg-slate-900 border-b border-white/10 overflow-hidden group/preview cursor-pointer"
        style={{ height: 280 }}
        aria-label={`View full site: ${template.name}`}
      >
        {/* Windows-style browser chrome */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#202225] border-b border-white/5 z-10 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{template.name}</span>
          </div>
          <div className="flex items-center gap-[2px]">
            <div className="w-[28px] h-[22px] flex items-center justify-center hover:bg-white/10 rounded-sm">
              <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#999"/></svg>
            </div>
            <div className="w-[28px] h-[22px] flex items-center justify-center hover:bg-white/10 rounded-sm">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x="0.5" y="0.5" width="8" height="8" stroke="#999" strokeWidth="1"/></svg>
            </div>
            <div className="w-[28px] h-[22px] flex items-center justify-center hover:bg-[#e81123]/80 rounded-sm">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#999" strokeWidth="1.2"/><line x1="9" y1="1" x2="1" y2="9" stroke="#999" strokeWidth="1.2"/></svg>
            </div>
          </div>
        </div>

        {/* Iframe wrapper — scaled down to fit */}
        <div
          className="relative"
          style={{
            width: '1280px',
            height: '960px',
            transform: 'scale(0.29)',
            transformOrigin: 'top left',
          }}
        >
          {isVisible ? (
            <iframe
              src={iframeSrc}
              title={`Preview of ${template.name}`}
              className="w-full h-full border-0 bg-white"
              style={{ pointerEvents: 'none' }}
              loading="lazy"
              sandbox="allow-same-origin"
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="w-full h-full animate-pulse bg-slate-800" />
          )}
        </div>

        {/* Loading overlay */}
        {isVisible && !loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-20" style={{ top: 30 }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              <span className="text-[10px] text-slate-400">Loading preview…</span>
            </div>
          </div>
        )}

        {/* Template number badge */}
        <div className="absolute top-8 right-2 z-10">
          <span className="text-xs bg-black/50 backdrop-blur px-2 py-1 rounded text-slate-300">
            #{index + 1}
          </span>
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 group-hover/preview:bg-black/40 transition-colors pointer-events-none">
          <span className="opacity-0 group-hover/preview:opacity-100 px-4 py-2 rounded-lg bg-white/95 text-slate-900 text-sm font-bold shadow-lg transition-opacity">
            View full website →
          </span>
        </div>
      </Link>

      {/* Card body */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white leading-tight">{template.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {template.layoutFamily && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase tracking-wider">
                  {template.layoutFamily.replace(/_/g, ' ')}
                </span>
              )}
              {template.voiceFamily && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase tracking-wider">
                  {template.voiceFamily.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{template.pages.length} pages</span>
          <span>•</span>
          <span>{template.fieldCount} fields</span>
        </div>

        {template.snippet && (
          <p className="text-sm text-slate-400 line-clamp-2">{template.snippet}</p>
        )}

        <div className="flex flex-col gap-2">
          <Link
            href={viewHref}
            className="block w-full text-center px-6 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-white/10 hover:bg-white/15 border border-white/20"
          >
            View Full Website
          </Link>
          <Link
            href={`/templates/${niche}/${template.slug}`}
            className={`block w-full text-center px-6 py-3 text-sm font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${accentBtn}`}
          >
            Customize This Template
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ---------- Gallery grid ---------- */
export function TemplateGalleryGrid({ niche, templates, accentBtn, accentGlow, accentHeading, accentCard }: Props) {
  const [search, setSearch] = useState('')

  const filtered = templates.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) ||
      t.layoutFamily?.toLowerCase().includes(q) ||
      t.voiceFamily?.toLowerCase().includes(q) ||
      t.snippet?.toLowerCase().includes(q)
  })

  return (
    <>
      {/* Search bar */}
      {templates.length > 6 && (
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search templates by name, layout, or style…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/30 transition-all"
          />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.map((template, index) => (
          <TemplateThumbnail
            key={template.slug}
            template={template}
            niche={niche}
            index={index}
            accentBtn={accentBtn}
            accentGlow={accentGlow}
            accentHeading={accentHeading}
            accentCard={accentCard}
          />
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-12">
          <p className="text-lg text-slate-400">No templates match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch('')} className="text-cyan-300 mt-2 text-sm hover:underline">
            Clear search
          </button>
        </div>
      )}
    </>
  )
}

import Link from 'next/link'

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
  if (templates.length === 0) return null

  const browseHref = `/preview-your-business?niche=${encodeURIComponent(niche)}`

  return (
    <section className="container-hvac py-16">
      <div className="text-center mb-10 space-y-3 max-w-3xl mx-auto">
        <span className="signal-chip">Live template previews</span>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Real templates built for {nicheLabel.toLowerCase()} professionals
        </h2>
        <p className="text-slate-300 text-lg">
          Each style below is a real, customizable template — preview it with your business details in minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => {
          const previewHref = `/preview-your-business?niche=${encodeURIComponent(niche)}&template=${encodeURIComponent(t.slug)}`
          return (
            <article
              key={t.slug}
              className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm shadow-lg shadow-black/20 hover:border-cyan-400/35 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white leading-snug group-hover:text-cyan-50 transition-colors">
                    {shortName(t.name)}
                  </h3>
                  {t.layoutFamily && (
                    <span className={`shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15 bg-white/5 ${headingClass}`}>
                      {layoutLabel(t.layoutFamily)}
                    </span>
                  )}
                </div>
                {t.snippet && (
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {snippetPreview(t.snippet)}
                  </p>
                )}
              </div>
              <div className="px-5 pb-5 pt-0">
                <Link
                  href={previewHref}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${headingClass} hover:text-white transition-colors`}
                >
                  Preview this style →
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-10 text-center">
        <Link
          href={browseHref}
          className={`inline-flex items-center gap-2 text-base font-semibold ${headingClass} hover:text-white transition-colors`}
        >
          Browse all {totalCount}+ templates →
        </Link>
      </div>
    </section>
  )
}

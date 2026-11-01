import Link from 'next/link'

type Accent = 'cyan' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'violet'

export function SeoCtaGroup({
  demoHref,
  demoLabel = 'Watch Demo',
  centered = false,
}: {
  demoHref: string
  demoLabel?: string
  accent?: Accent
  centered?: boolean
}) {
  const align = centered ? 'justify-center items-center' : ''
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${align}`}>
      <Link
        href="/preview-your-business"
        className="cta-button text-center"
      >
        Build My Preview
      </Link>
      <Link
        href={demoHref}
        className="dc-button-secondary px-8 py-4 text-lg text-center"
      >
        {demoLabel}
      </Link>
      <Link
        href="/pricing"
        className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
      >
        See Pricing
      </Link>
    </div>
  )
}

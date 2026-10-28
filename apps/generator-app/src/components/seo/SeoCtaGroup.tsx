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
        className="px-8 py-4 text-lg font-bold rounded-lg dc-button-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
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
        className="dc-button-secondary px-8 py-4 text-lg text-center"
      >
        See Pricing
      </Link>
    </div>
  )
}

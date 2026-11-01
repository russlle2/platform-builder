import Link from 'next/link'

type Accent = 'cyan' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'violet'

const accentBtn: Record<Accent, string> = {
  cyan: 'from-cyan-500 to-blue-600 border-cyan-200/40',
  amber: 'from-amber-500 to-orange-600 border-amber-200/40',
  rose: 'from-rose-500 to-pink-600 border-rose-200/40',
  indigo: 'from-indigo-500 to-blue-600 border-indigo-200/40',
  emerald: 'from-emerald-500 to-green-600 border-emerald-200/40',
  violet: 'from-violet-500 to-purple-600 border-violet-200/40',
}

export function SeoCtaGroup({
  demoHref,
  demoLabel = 'Watch Demo',
  accent = 'cyan',
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
        className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
      >
        Build My Preview
      </Link>
      <Link
        href={demoHref}
        className={`px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border text-center ${accentBtn[accent]}`}
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

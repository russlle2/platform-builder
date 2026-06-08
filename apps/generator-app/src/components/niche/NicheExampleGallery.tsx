import Image from 'next/image'
import Link from 'next/link'
import { getNicheExampleShots } from '@/lib/niche-example-screenshots'

type Props = {
  niche: string
  nicheLabel: string
  headingClass?: string
}

export function NicheExampleGallery({ niche, nicheLabel, headingClass = 'text-cyan-200' }: Props) {
  const examples = getNicheExampleShots(niche)
  const intakeHref = `/preview-your-business?niche=${encodeURIComponent(niche)}`

  if (examples.length === 0) return null

  return (
    <section className="container-hvac py-16">
      <div className="text-center mb-10 space-y-3 max-w-3xl mx-auto">
        <span className="signal-chip">Example homepage styles</span>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          A few looks {nicheLabel} practices launch with
        </h2>
        <p className="text-slate-300 text-lg">
          Static previews only — tap any style to start with your business details. Every layout
          fills in with your real info before you browse.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {examples.map((ex) => (
          <Link
            key={ex.slug}
            href={intakeHref}
            className="group block rounded-2xl overflow-hidden border border-white/10 bg-slate-900/40 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
          >
            <div className="relative aspect-[16/10] bg-slate-800">
              <Image
                src={ex.imagePath}
                alt={`${ex.label} homepage example for ${nicheLabel}`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="p-4 border-t border-white/10">
              <p className={`text-sm font-semibold ${headingClass} group-hover:text-white transition-colors`}>
                {ex.label}
              </p>
              <p className="text-xs text-slate-400 mt-1">Start your preview →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

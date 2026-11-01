import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Product proof — explore DailyClarity before you buy',
  description:
    'Explore DailyClarity templates, build an editable preview with your own business details, and compare published plan scope before checkout.',
  alternates: { canonical: '/proof' },
}

const productEvidence = [
  {
    eyebrow: 'Explore',
    title: 'Interactive template demos',
    copy: 'Browse purpose-built layouts and inspect the pages, structure, and mobile experience directly. The product is the evidence.',
    href: '/demo/platform-builder',
    linkLabel: 'Watch the platform demo',
  },
  {
    eyebrow: 'Personalize',
    title: 'An editable business preview',
    copy: 'Add your own business details, choose a template, and review the result before you are asked to select a plan.',
    href: '/preview-your-business',
    linkLabel: 'Build my preview',
  },
  {
    eyebrow: 'Compare',
    title: 'Published plan scope',
    copy: 'See current prices, trial terms, included platform features, and managed services together—without a sales call.',
    href: '/pricing',
    linkLabel: 'Compare plans',
  },
]

const publicationStandards = [
  {
    step: '01',
    title: 'Permission first',
    copy: 'A customer story will appear only after the customer approves the words, identity details, and work shown.',
  },
  {
    step: '02',
    title: 'Define the measurement',
    copy: 'Any result will name the metric, baseline, observation window, and material factors that shaped it.',
  },
  {
    step: '03',
    title: 'Publish useful context',
    copy: 'Case studies will show what was built and for whom—not imply that every business should expect the same outcome.',
  },
]

export default function ProofPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <section className="container-hvac py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div className="space-y-6">
            <span className="signal-chip">Product proof</span>
            <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
              See what works today. We&apos;ll earn the case studies next.
            </h1>
            <p className="text-xl text-slate-200 max-w-3xl leading-relaxed">
              DailyClarity is in early access. Instead of filling this page with anonymous quotes,
              borrowed benchmarks, or results we cannot substantiate, we invite you to inspect the
              platform and build with your own content.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span>Interactive demos</span>
              <span>Editable preview</span>
              <span>Clear plan details</span>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/preview-your-business" className="cta-button">
                Build My Preview
              </Link>
              <Link
                href="/demo/platform-builder"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Watch the Demo
              </Link>
            </div>
          </div>

          <aside className="glass-panel rounded-3xl p-8" aria-labelledby="evidence-status-title">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Evidence status
            </p>
            <h2 id="evidence-status-title" className="mt-3 text-2xl font-bold text-white">
              Transparent early access
            </h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              The demos, preview workflow, plan comparison, and checkout terms are available to
              evaluate now. Verified customer outcomes are not yet published.
            </p>
            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
              <p className="font-semibold text-white">Our publishing rule</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                We will add customer names, visuals, and performance results only with permission
                and enough measurement detail for you to judge the claim fairly.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="container-hvac pb-20" aria-labelledby="verify-now-title">
        <div className="glass-panel rounded-3xl p-8 md:p-10">
          <div className="max-w-3xl">
            <span className="signal-chip">Available now</span>
            <h2 id="verify-now-title" className="mt-5 text-3xl md:text-4xl font-bold text-white">
              Three ways to evaluate DailyClarity for yourself
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              You do not need a testimonial to decide whether the workflow, design quality, and
              commercial terms fit your business.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {productEvidence.map((item) => (
              <article key={item.title} className="card-mahogany flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-bold text-white">{item.title}</h3>
                <p className="mt-4 flex-1 leading-relaxed text-slate-300">{item.copy}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  {item.linkLabel} <span aria-hidden="true" className="ml-2">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-hvac pb-20" aria-labelledby="future-proof-title">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-5">
            <span className="signal-chip">What comes next</span>
            <h2 id="future-proof-title" className="text-3xl md:text-4xl font-bold text-white">
              Customer proof with a paper trail
            </h2>
            <p className="text-lg leading-relaxed text-slate-300">
              As early-access sites launch, this page will grow into a library of consented,
              measured case studies. Until then, an empty claim is less useful than a product you
              can actually try.
            </p>
          </div>

          <ol className="space-y-4">
            {publicationStandards.map((item) => (
              <li key={item.step} className="card-mahogany grid gap-4 sm:grid-cols-[auto_1fr]">
                <span className="text-xl font-bold text-cyan-200" aria-hidden="true">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-300">{item.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-hvac pb-20">
        <div className="glass-panel rounded-3xl p-10 md:p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Put your own business in the frame
          </h2>
          <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Add your details, explore compatible templates, and review an editable preview before
            choosing a plan.
          </p>
          <Link href="/preview-your-business" className="cta-button">
            Build My Preview
          </Link>
        </div>
      </section>
    </main>
  )
}

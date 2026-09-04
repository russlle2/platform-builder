import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connect Your Custom Domain | DailyClarity Help',
  description:
    'Step-by-step guide to pointing your custom domain at your DailyClarity website — DNS records, registrar instructions, and FAQs.',
}

const REGISTRAR_GUIDES: { name: string; steps: string }[] = [
  {
    name: 'GoDaddy',
    steps: 'Log in → Manage Domain → DNS → Add Record',
  },
  {
    name: 'Namecheap',
    steps: 'Log in → Domain List → Manage → Advanced DNS → Add New Record',
  },
  {
    name: 'Cloudflare',
    steps:
      'Log in → your domain → DNS → Records → Add Record (DISABLE orange proxy during setup)',
  },
  {
    name: 'Google Domains (now Squarespace)',
    steps: 'Log in → My Domains → Manage → DNS → Custom Records',
  },
  {
    name: 'Other',
    steps:
      'Log in to your registrar, find DNS Management or Name Server settings, add the records shown in your portal',
  },
]

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'How long does DNS take?',
    answer: 'Most changes propagate within 15 minutes to 48 hours, depending on your registrar and TTL settings.',
  },
  {
    question: 'Will my email be affected?',
    answer:
      'Only if you change MX records — do not modify MX records when adding your website DNS entries.',
  },
  {
    question: 'What if I use Cloudflare?',
    answer:
      'Disable the orange proxy cloud (set records to DNS only / grey cloud) during initial setup so Netlify can verify your domain.',
  },
  {
    question: 'Can I use an apex domain?',
    answer:
      'Yes. Use the A record pointing to 75.2.60.5 (Netlify load balancer) shown in your portal, plus an optional www CNAME.',
  },
  {
    question: 'Do I need www?',
    answer:
      'Recommended. Add both root (apex) and www records — both will work once DNS propagates.',
  },
]

export default function CustomDomainHelpPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-wide max-w-3xl mx-auto space-y-10 px-4">
        <header className="space-y-4 text-center">
          <span className="signal-chip">Help</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            How to connect your custom domain to DailyClarity
          </h1>
          <p className="text-slate-300 text-lg">
            Point your own domain at your DailyClarity site in a few steps.
          </p>
        </header>

        <section className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">What you need</h2>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>
              A custom domain purchased from a registrar (GoDaddy, Namecheap, Google Domains,
              Cloudflare, etc.)
            </li>
            <li>Access to your domain&apos;s DNS settings</li>
            <li>Your DailyClarity site already launched (after checkout)</li>
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">Step-by-step instructions</h2>
          <ol className="text-slate-300 space-y-3 list-decimal list-inside">
            <li>Go to your DailyClarity dashboard → Domain settings</li>
            <li>Enter your domain name</li>
            <li>Copy the DNS records shown</li>
            <li>Log in to your domain registrar</li>
            <li>Add the DNS records</li>
            <li>Click &ldquo;Check Status&rdquo; — may take up to 48 hours</li>
          </ol>
          <p className="text-sm text-slate-400">
            Open your portal:{' '}
            <Link href="/portal" className="text-cyan-200 hover:text-cyan-100 underline">
              /portal
            </Link>
          </p>
        </section>

        <section className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">Registrar-specific guides</h2>
          <div className="space-y-4">
            {REGISTRAR_GUIDES.map((guide) => (
              <div
                key={guide.name}
                className="rounded-xl bg-white/5 border border-white/10 p-4"
              >
                <h3 className="text-lg font-semibold text-white">{guide.name}</h3>
                <p className="text-slate-300 text-sm mt-1">{guide.steps}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">FAQ</h2>
          <dl className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-b border-white/10 pb-4 last:border-0">
                <dt className="text-white font-semibold">{item.question}</dt>
                <dd className="text-slate-300 text-sm mt-1">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="glass-panel rounded-2xl p-8 text-center space-y-4 border border-cyan-400/20">
          <h2 className="text-xl font-bold text-white">Still stuck?</h2>
          <p className="text-slate-300">
            Our team can walk you through DNS setup for your registrar.
          </p>
          <Link href="/contact" className="cta-button inline-block">
            Contact support
          </Link>
        </section>
      </div>
    </main>
  )
}

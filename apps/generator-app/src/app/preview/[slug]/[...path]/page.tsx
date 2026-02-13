import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

interface PreviewFaq {
  question: string
  answer: string
}

interface PreviewService {
  name: string
  summary: string
}

interface PreviewProject {
  title: string
  summary: string
  outcome: string
}

interface PreviewSiteData {
  businessName: string
  tagline: string
  description: string
  phoneNumber: string
  email: string
  address: string
  accentColor: string
  headingFont: string
  bodyFont: string
  heroImage: string
  backgroundImage: string
  logo: string
  templateName: string
  structureSummary: string
  services: PreviewService[]
  faq: PreviewFaq[]
  customInfo: { label: string; value: string }[]
  includePastJobs: boolean
  pastJobs: PreviewProject[]
  generatedFromAutoFill: boolean
}

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const normalizePage = (value: string) => {
  const safe = value.toLowerCase()
  if (['home', 'services', 'faq', 'about', 'contact', 'past-jobs'].includes(safe)) {
    return safe
  }
  return 'home'
}

const fallbackSite: PreviewSiteData = {
  businessName: 'Preview HVAC Business',
  tagline: 'Reliable comfort for every season.',
  description: 'Your generated preview appears here once wizard data is saved.',
  phoneNumber: '(555) 123-4567',
  email: 'contact@example.com',
  address: 'Your service area',
  accentColor: '#2563eb',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  heroImage: '/images/hvac-condenser.jpg',
  backgroundImage: '/images/hvac-background.jpg',
  logo: '/images/logo-placeholder.png',
  templateName: 'Service First',
  structureSummary: 'Hero with urgent CTA, then services and trust badges.',
  services: [
    { name: 'AC Repair', summary: 'Fast diagnostics and dependable repairs.' },
    { name: 'Heating Repair', summary: 'Reliable winter comfort support.' },
  ],
  faq: [
    { question: 'How soon can you come out?', answer: 'Same-day and priority windows are available.' },
  ],
  customInfo: [],
  includePastJobs: false,
  pastJobs: [],
  generatedFromAutoFill: false,
}

const getLocalCacheFilePath = (slug: string) => {
  return path.join('/tmp', 'platform-builder-portal-sites', `${slug}.json`)
}

const readLocalSiteData = async (slug: string): Promise<PreviewSiteData | null> => {
  const filePath = getLocalCacheFilePath(slug)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return (parsed?.data as PreviewSiteData) || null
  } catch {
    return null
  }
}

export default async function PreviewSitePage({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>
}) {
  const resolved = await params
  const slug = normalizeSlug(resolved.slug)
  const page = normalizePage(resolved.path?.[0] || 'home')

  if (!slug) {
    notFound()
  }

  const supabase = getSupabase()
  if (!supabase) {
    const localSite = await readLocalSiteData(slug)
    return <PreviewLayout slug={slug} page={page} site={localSite || fallbackSite} />
  }

  const { data } = await supabase
    .from('portal_sites')
    .select('data')
    .eq('slug', slug)
    .maybeSingle()

  const localSite = await readLocalSiteData(slug)
  const site = (data?.data as PreviewSiteData | undefined) || localSite || fallbackSite

  return <PreviewLayout slug={slug} page={page} site={site} />
}

function PreviewLayout({ slug, page, site }: { slug: string; page: string; site: PreviewSiteData }) {
  const navItems = [
    { key: 'home', label: 'Home' },
    { key: 'services', label: 'Services' },
    { key: 'faq', label: 'FAQ' },
    { key: 'about', label: 'About' },
    { key: 'contact', label: 'Contact' },
    ...(site.includePastJobs ? [{ key: 'past-jobs', label: 'Past Jobs' }] : []),
  ]

  return (
    <main className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: site.bodyFont }}>
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Full Preview</p>
            <h1 className="text-2xl font-bold" style={{ fontFamily: site.headingFont }}>
              {site.businessName}
            </h1>
            <p className="text-slate-300 text-sm">{site.tagline}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={`/preview/${slug}/${item.key}`}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  item.key === page
                    ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                    : 'border-white/15 text-slate-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section
        className="relative border-b border-white/10"
        style={{
          backgroundImage: `linear-gradient(rgba(2,6,23,0.75), rgba(2,6,23,0.75)), url(${site.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{site.templateName}</p>
          <h2 className="text-4xl font-bold mt-2" style={{ fontFamily: site.headingFont }}>
            {site.businessName}
          </h2>
          <p className="text-slate-200 mt-3 max-w-2xl">{site.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: site.accentColor, color: '#fff' }}
            >
              Request Service (demo)
            </button>
            <button type="button" className="px-4 py-2 rounded-lg border border-white/20 bg-white/10">
              Call Now (demo)
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {page === 'home' && <HomePage site={site} />}
        {page === 'services' && <ServicesPage site={site} />}
        {page === 'faq' && <FaqPage site={site} />}
        {page === 'about' && <AboutPage site={site} />}
        {page === 'contact' && <ContactPage site={site} />}
        {page === 'past-jobs' && site.includePastJobs && <PastJobsPage site={site} />}
      </div>
    </main>
  )
}

function HomePage({ site }: { site: PreviewSiteData }) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {site.services.slice(0, 3).map((service) => (
          <article key={service.name} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold">{service.name}</h3>
            <p className="text-sm text-slate-300 mt-2">{service.summary}</p>
          </article>
        ))}
      </section>
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold">Why customers choose us</h3>
        <p className="text-slate-300 mt-2">{site.structureSummary}</p>
      </section>
    </div>
  )
}

function ServicesPage({ site }: { site: PreviewSiteData }) {
  return (
    <div className="space-y-4">
      {site.services.map((service) => (
        <article key={service.name} className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">{service.name}</h3>
          <p className="text-slate-300 mt-2">{service.summary}</p>
          <button type="button" className="mt-4 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">
            Request quote (demo)
          </button>
        </article>
      ))}
    </div>
  )
}

function FaqPage({ site }: { site: PreviewSiteData }) {
  return (
    <div className="space-y-4">
      {site.faq.map((item) => (
        <article key={item.question} className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">{item.question}</h3>
          <p className="text-slate-300 mt-2">{item.answer}</p>
        </article>
      ))}
    </div>
  )
}

function AboutPage({ site }: { site: PreviewSiteData }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-2xl font-bold">About {site.businessName}</h3>
        <p className="text-slate-300 mt-3">{site.description}</p>
      </section>
      {site.customInfo.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {site.customInfo.map((item) => (
            <article key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h4 className="font-semibold">{item.label}</h4>
              <p className="text-slate-300 text-sm mt-2">{item.value}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function ContactPage({ site }: { site: PreviewSiteData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
      <h3 className="text-2xl font-bold">Contact</h3>
      <p className="text-slate-300">Phone: {site.phoneNumber}</p>
      <p className="text-slate-300">Email: {site.email}</p>
      <p className="text-slate-300">Service area: {site.address}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <input className="px-4 py-3 rounded-lg bg-slate-900 border border-white/20" placeholder="Name (demo)" />
        <input className="px-4 py-3 rounded-lg bg-slate-900 border border-white/20" placeholder="Email (demo)" />
        <textarea
          className="px-4 py-3 rounded-lg bg-slate-900 border border-white/20 md:col-span-2"
          rows={4}
          placeholder="How can we help? (demo)"
        />
      </div>
      <button type="button" className="px-5 py-2 rounded-lg bg-white/10 border border-white/20">
        Send request (demo)
      </button>
    </section>
  )
}

function PastJobsPage({ site }: { site: PreviewSiteData }) {
  return (
    <div className="space-y-4">
      {site.pastJobs.map((job) => (
        <article key={job.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">{job.title}</h3>
          <p className="text-slate-300 mt-2">{job.summary}</p>
          <p className="text-cyan-100 mt-2 text-sm">Outcome: {job.outcome}</p>
        </article>
      ))}
    </div>
  )
}

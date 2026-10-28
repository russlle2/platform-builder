import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'Wellness Website Checklist',
  description:
    'A practical checklist for therapy, coaching, and wellness practice websites — offer clarity, trust, booking paths, proof, and local SEO.',
  alternates: { canonical: '/wellness-website-checklist' },
  openGraph: {
    title: 'Wellness Website Checklist | DailyClarity',
    description:
      'A practical checklist for therapy, coaching, and wellness practice websites — offer clarity, trust, booking paths, proof, and local SEO.',
    url: '/wellness-website-checklist',
    type: 'website',
    images: ['/og-image.png'],
  },
}

const CHECKLIST_SECTIONS: { title: string; intro: string; items: string[] }[] = [
  {
    title: 'Clear offer',
    intro: 'Visitors should know what you do and who it is for within seconds.',
    items: [
      'Business name and practitioner title visible on the homepage',
      'Tagline says who you help and what you offer without promising results',
      'Description explains who you serve and how you work',
      'At least one service you actually offer, described clearly',
    ],
  },
  {
    title: 'Practitioner trust',
    intro: 'Wellness buyers look for credibility before they reach out.',
    items: [
      'Photo or human introduction on the about section',
      'Relevant experience or qualifications described accurately; credentials included only when applicable',
      'Approach or philosophy described in plain language',
      'Professional tone that matches your niche (clinical, warm, immersive, etc.)',
    ],
  },
  {
    title: 'Services & programs',
    intro: 'Structure helps visitors self-select the right fit.',
    items: [
      'Each service has a name, short description, and intended client',
      'Pricing or “starting at” guidance where appropriate',
      'Group vs private vs package options distinguished',
      'FAQs tied to common objections for your modality',
    ],
  },
  {
    title: 'Booking & contact path',
    intro: 'Make the next step obvious on every key page.',
    items: [
      'A monitored email address or phone number visible without digging',
      'Primary CTA above the fold on mobile',
      'A working contact route with clear response expectations; send a test enquiry if you use a form',
      'Telehealth or service-area note if you are not in-person only',
    ],
  },
  {
    title: 'Accurate claims & permission',
    intro: 'Every page should reflect your real practice and the permissions you have.',
    items: [
      'Example testimonials removed; real client quotes used only with permission and when appropriate for your profession',
      'Outcomes described realistically (no overpromising)',
      'Photos or logos only with permission',
      'Accurate practitioner information easy to find before someone enquires',
    ],
  },
  {
    title: 'Local SEO',
    intro: 'Help nearby clients and search engines understand where you work.',
    items: [
      'City and state (or “online + region”) on contact and footer',
      'Consistent business name across pages',
      'Page titles and headings that mention your specialty and area',
      'Mobile-friendly layout and fast contact taps',
    ],
  },
  {
    title: 'FAQ',
    intro: 'Answer questions that block booking before they email you.',
    items: [
      'First session or first visit expectations',
      'Fees, insurance, or package policies',
      'Cancellation and scheduling basics',
      'Modality-specific safety or contraindications where relevant',
    ],
  },
  {
    title: 'Mobile CTA',
    intro: 'Make the next step comfortable on a phone.',
    items: [
      'Click-to-call or tap-to-email on mobile',
      'Sticky or repeated CTA on long pages',
      'Readable text without horizontal scrolling',
      'If you use a form or connect a booking provider, test the full path on a small screen',
    ],
  },
]

export default function WellnessWebsiteChecklistPage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Free checklist</span>
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading leading-tight">
            Wellness website checklist: what to include before you launch
          </h1>
          <p className="text-lg dc-text-body max-w-2xl">
            Use this list to audit a therapy, coaching, or healing practice site — whether you build with
            DailyClarity or another tool. The goal is the same: help visitors trust you and take the next step.
          </p>
          <SeoCtaGroup demoHref="/demo/platform-builder" demoLabel="Watch Demo" accent="violet" />
        </div>

        <div className="space-y-8">
          {CHECKLIST_SECTIONS.map((section, index) => (
            <div key={section.title} className="glass-panel rounded-2xl p-8 space-y-4">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 dc-text-violet font-bold">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-2xl font-bold dc-text-heading">{section.title}</h2>
                  <p className="dc-text-muted mt-1">{section.intro}</p>
                </div>
              </div>
              <ul className="space-y-2 pl-14">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 dc-text-body">
                    <span className="text-violet-400 mt-0.5 shrink-0">□</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-4 border border-cyan-400/20">
          <h2 className="text-2xl font-bold dc-text-heading">Check your content in the preview wizard</h2>
          <p className="dc-text-body leading-relaxed">
            The “Your website details” panel in DailyClarity’s preview shows which practice details,
            contact information, service area, and design choices you’ve supplied. It helps you fill
            gaps in your introduction; it does not verify credentials, test booking, or predict enquiries.
            Its separate manual launch review adds questions for your type of practice, from therapy fees
            and online visits to sound bath preparation and access needs. Use these questions and the checklist
            above to review your finished site before publishing.
          </p>
          <Link href="/preview-your-business" className="dc-text-accent font-semibold hover:underline">
            Build My Preview →
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold dc-text-heading">Ready to build with structure included?</h2>
          <p className="dc-text-body max-w-xl mx-auto">
            Start a guided preview or watch how the platform assembles a wellness-ready site.
          </p>
          <SeoCtaGroup demoHref="/demo/platform-builder" demoLabel="Watch Demo" accent="violet" centered />
        </div>
      </section>
    </SeoPageShell>
  )
}

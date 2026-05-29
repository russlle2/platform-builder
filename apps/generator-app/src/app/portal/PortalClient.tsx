'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'

const onboardingSteps = [
  {
    title: 'Confirm business details',
    description: 'Review your business name, services, and contact info.',
    action: 'Review details',
    href: '/wizard?step=1',
  },
  {
    title: 'Select your template',
    description: 'Choose the layout that fits your market and positioning.',
    action: 'Pick template',
    href: '/wizard?step=5',
  },
  {
    title: 'Connect integrations',
    description: 'Postmark, Supabase, and Stripe get connected after checkout.',
    action: 'View integrations',
    href: '/portal#integrations',
  },
  {
    title: 'Review your launch',
    description: 'Approve the final site and we publish to your subdomain.',
    action: 'Approve launch',
    href: '/pricing',
  },
]

const integrationDefaults = [
  { name: 'Postmark', status: 'Checking...' },
  { name: 'Supabase', status: 'Checking...' },
  { name: 'Stripe', status: 'Checking...' },
  { name: 'Netlify', status: 'Checking...' },
]

const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function PortalClient() {
  const searchParams = useSearchParams()
  const initialSlug = useMemo(() => searchParams.get('slug') || '', [searchParams])
  const [slug, setSlug] = useState(initialSlug)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [publishNote, setPublishNote] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState(integrationDefaults)
  const [platformDomain, setPlatformDomain] = useState('dailyclarity.org')
  const [domainAffiliateUrl, setDomainAffiliateUrl] = useState<string | null>(null)
  const [customDomain, setCustomDomain] = useState('')
  const [domainInfo, setDomainInfo] = useState<{
    subdomain: string
    siteUrl: string
    customDomain: string | null
    dnsInstructions: string | null
  } | null>(null)
  const [domainStatus, setDomainStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [domainMessage, setDomainMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    phone: '',
    email: '',
    address: '',
    services: '',
  })

  useEffect(() => {
    if (!initialSlug) {
      return
    }
    loadSite(initialSlug)
  }, [initialSlug])

  useEffect(() => {
    fetch('/api/platform/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.platformDomain) setPlatformDomain(data.platformDomain)
        if (data?.domainAffiliateUrl) setDomainAffiliateUrl(data.domainAffiliateUrl)
      })
      .catch(() => {})
  }, [])

  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug])

  useEffect(() => {
    if (!normalizedSlug) {
      setDomainInfo(null)
      return
    }
    setDomainStatus('loading')
    fetch(`/api/sites/domain?slug=${encodeURIComponent(normalizedSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.subdomain) {
          setDomainInfo({
            subdomain: data.subdomain,
            siteUrl: data.siteUrl,
            customDomain: data.customDomain || null,
            dnsInstructions: data.dnsInstructions || null,
          })
          if (data.customDomain) setCustomDomain(data.customDomain)
        } else {
          setDomainInfo({
            subdomain: `${normalizedSlug}.${platformDomain}`,
            siteUrl: `https://${normalizedSlug}.${platformDomain}`,
            customDomain: null,
            dnsInstructions: null,
          })
        }
        setDomainStatus('idle')
      })
      .catch(() => {
        setDomainInfo({
          subdomain: `${normalizedSlug}.${platformDomain}`,
          siteUrl: `https://${normalizedSlug}.${platformDomain}`,
          customDomain: null,
          dnsInstructions: null,
        })
        setDomainStatus('idle')
      })
  }, [normalizedSlug, platformDomain])

  // Fetch live integration status
  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.integrations) {
          setIntegrations(
            data.integrations.map((i: { name: string; configured: boolean; detail: string }) => ({
              name: i.name,
              status: i.configured ? 'Connected' : 'Not configured',
            }))
          )
        }
      })
      .catch(() => {
        setIntegrations(integrationDefaults.map((i) => ({ ...i, status: 'Unknown' })))
      })
  }, [])

  const loadSite = async (targetSlug: string) => {
    const normalized = normalizeSlug(targetSlug)
    if (!normalized) {
      return
    }
    setStatus('loading')
    try {
      const response = await fetch(`/api/portal/site?slug=${encodeURIComponent(normalized)}`)
      const data = await response.json()
      const d = data?.site?.data
      if (response.ok && d) {
        // Canonical shape stores values under customerValues ({{TOKEN}} keys).
        // Fall back to legacy flat fields for older records.
        const cv = (d.customerValues || {}) as Record<string, string>
        setFormData({
          businessName: cv.BUSINESS_NAME || d.businessName || '',
          tagline: cv.TAGLINE || d.tagline || '',
          phone: cv.PHONE || cv.PHONE_NUMBER || d.phone || '',
          email: cv.EMAIL || d.email || '',
          address: cv.ADDRESS || d.address || '',
          services: cv.SERVICES || d.services || '',
        })
      }
      setStatus('idle')
    } catch (error) {
      setStatus('error')
    }
  }

  const saveSite = async () => {
    const normalized = normalizeSlug(slug)
    if (!normalized) {
      setStatus('error')
      return
    }
    setStatus('saving')
    setPublishNote(null)
    try {
      // Write back into the canonical {{TOKEN}} value map (with lowercase
      // aliases) so the redeploy hydrates templates the same way the preview did.
      const customerValues: Record<string, string> = {
        BUSINESS_NAME: formData.businessName,
        TAGLINE: formData.tagline,
        PHONE: formData.phone,
        PHONE_NUMBER: formData.phone,
        EMAIL: formData.email,
        ADDRESS: formData.address,
        SERVICES: formData.services,
        business_name: formData.businessName,
        tagline: formData.tagline,
        phone: formData.phone,
        phone_number: formData.phone,
        email: formData.email,
        address: formData.address,
        services: formData.services,
      }
      const response = await fetch('/api/portal/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: normalized, customerValues }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error('Failed')
      }
      setStatus('saved')
      setPublishNote(
        result?.republished
          ? 'Saved and published to your live site.'
          : 'Saved. Changes publish to your live site once it is provisioned.'
      )
      track('portal_saved', { slug: normalized, republished: !!result?.republished })
    } catch (error) {
      setStatus('error')
    }
  }

  const saveCustomDomain = async () => {
    if (!normalizedSlug || !customDomain.trim()) {
      setDomainStatus('error')
      setDomainMessage('Enter a valid domain name.')
      return
    }
    setDomainStatus('saving')
    setDomainMessage(null)
    try {
      const response = await fetch('/api/sites/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: normalizedSlug,
          customDomain: customDomain.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Domain setup failed')
      }
      setDomainInfo({
        subdomain: domainInfo?.subdomain || `${normalizedSlug}.${platformDomain}`,
        siteUrl: domainInfo?.siteUrl || `https://${normalizedSlug}.${platformDomain}`,
        customDomain: data.customDomain,
        dnsInstructions: data.dnsInstructions || null,
      })
      setDomainStatus('saved')
      setDomainMessage('Custom domain added. Follow the DNS steps below.')
      track('portal_domain_saved', { slug: normalizedSlug })
    } catch (error) {
      setDomainStatus('error')
      setDomainMessage(
        error instanceof Error ? error.message : 'Unable to configure domain.'
      )
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac space-y-10">
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="signal-chip">Portal</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Your platform command center
            </h1>
            <p className="text-slate-300 text-lg">
              Track launch progress, manage updates, and keep your HVAC platform performing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/wizard" className="cta-button">
                Continue intake
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 text-base font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
              >
                View subscription
              </Link>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white">Launch status</h2>
            <p className="text-slate-300 mt-2">Awaiting onboarding completion</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Checklist</p>
                <p className="text-3xl font-bold text-white">1/4</p>
              </div>
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ETA</p>
                <p className="text-3xl font-bold text-white">48 hrs</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
          <div className="glass-panel rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Portal edits</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {status === 'saved' ? 'Saved' : 'Draft'}
              </span>
            </div>
            <div className="space-y-4 mb-8">
              <label className="text-sm text-slate-300">Subdomain slug</label>
              <div className="flex gap-3">
                <input
                  value={slug}
                  onChange={(event) => setSlug(normalizeSlug(event.target.value))}
                  placeholder="your-slug"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={() => loadSite(slug)}
                  className="px-4 py-3 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10"
                >
                  Load
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={formData.businessName}
                onChange={(event) =>
                  setFormData({ ...formData, businessName: event.target.value })
                }
                placeholder="Business name"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <input
                value={formData.tagline}
                onChange={(event) => setFormData({ ...formData, tagline: event.target.value })}
                placeholder="Tagline"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <input
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="Phone"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <input
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="Email"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <input
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Service area"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2"
              />
              <textarea
                value={formData.services}
                onChange={(event) => setFormData({ ...formData, services: event.target.value })}
                placeholder="Services (comma-separated)"
                rows={3}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2"
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                type="button"
                onClick={saveSite}
                disabled={status === 'saving'}
                className="cta-button"
              >
                {status === 'saving' ? 'Saving...' : 'Save & publish'}
              </button>
              {status === 'error' && (
                <span className="text-sm text-red-200">Unable to save.</span>
              )}
              {status === 'saved' && publishNote && (
                <span className="text-sm text-emerald-200 self-center">{publishNote}</span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-6">Onboarding checklist</h2>
            <div className="space-y-4">
              {onboardingSteps.map((step, index) => {
                const stepHref =
                  step.title === 'Review your launch' && normalizeSlug(slug)
                    ? `/pricing?slug=${encodeURIComponent(normalizeSlug(slug))}`
                    : step.href

                return (
                  <div
                    key={step.title}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-400/20 text-cyan-200 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      <p className="text-slate-300 text-sm">{step.description}</p>
                    </div>
                    <Link href={stepHref} className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
                      {step.action}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div id="domain" className="glass-panel rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white">Your domain</h3>
              {normalizedSlug ? (
                <div className="mt-4 space-y-4 text-sm text-slate-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Included subdomain</p>
                    <a
                      href={domainInfo?.siteUrl || `https://${normalizedSlug}.${platformDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-200 hover:text-cyan-100 break-all"
                    >
                      {domainInfo?.subdomain || `${normalizedSlug}.${platformDomain}`}
                    </a>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400 block mb-2">
                      Custom domain (optional)
                    </label>
                    <input
                      value={customDomain}
                      onChange={(event) => setCustomDomain(event.target.value)}
                      placeholder="www.yourbusiness.com"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveCustomDomain}
                      disabled={domainStatus === 'saving' || domainStatus === 'loading'}
                      className="mt-3 w-full px-4 py-2 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-60"
                    >
                      {domainStatus === 'saving' ? 'Saving…' : 'Connect custom domain'}
                    </button>
                    {domainMessage && (
                      <p className={`mt-2 text-xs ${domainStatus === 'error' ? 'text-red-200' : 'text-emerald-200'}`}>
                        {domainMessage}
                      </p>
                    )}
                  </div>
                  {domainInfo?.dnsInstructions && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">DNS records</p>
                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {domainInfo.dnsInstructions}
                      </pre>
                    </div>
                  )}
                  {domainAffiliateUrl && (
                    <p className="text-xs text-slate-400">
                      Need a domain?{' '}
                      <a
                        href={domainAffiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-200 hover:text-cyan-100"
                      >
                        Register one here
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-300 text-sm mt-2">
                  Load your slug above after checkout to manage domains.
                </p>
              )}
            </div>

            <div id="integrations" className="glass-panel rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white">Integrations</h3>
              <div className="mt-4 space-y-3">
                {integrations.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm text-slate-200">
                    <span>{item.name}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Connected'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : item.status === 'Not configured'
                        ? 'bg-red-500/20 text-red-200'
                        : 'bg-white/10 text-slate-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white">Recent activity</h3>
              <p className="text-slate-300 text-sm mt-2">
                No activity yet. Complete onboarding to unlock your build timeline.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

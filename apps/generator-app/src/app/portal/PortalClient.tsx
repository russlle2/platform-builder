'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { CustomerImageLibrary } from '@/components/CustomerImageLibrary'
import { getOrCreateImageOwnerId } from '@/lib/image-swaps'
import {
  getStoredPortalToken,
  storePortalToken,
} from '@/lib/portal-token-client'

const onboardingSteps = [
  {
    title: 'Confirm business details',
    description: 'Review your business name, services, and contact info.',
    action: 'Review details',
    href: '/preview-your-business',
  },
  {
    title: 'Select your template',
    description: 'Choose the layout that fits your market and positioning.',
    action: 'Pick template',
    href: '/preview-your-business',
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
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [slug, setSlug] = useState(initialSlug)
  const [portalToken, setPortalToken] = useState('')
  const [portalAuthenticated, setPortalAuthenticated] = useState(false)
  const [publicSiteUrl, setPublicSiteUrl] = useState<string | null>(null)
  const [lookupInput, setLookupInput] = useState('')
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
  const [siteTemplate, setSiteTemplate] = useState<{ niche?: string; template?: string }>({})

  const loadSite = useCallback(async (targetSlug: string, tokenOverride?: string) => {
    const normalized = normalizeSlug(targetSlug)
    if (!normalized) {
      return
    }
    const token = tokenOverride || portalToken || getStoredPortalToken(normalized) || ''
    if (token) {
      setPortalToken(token)
      storePortalToken(normalized, token)
    }
    setStatus('loading')
    setPortalAuthenticated(false)
    setPublicSiteUrl(null)
    try {
      const query = new URLSearchParams({ slug: normalized })
      if (token) query.set('token', token)
      const response = await fetch(`/api/portal/customer?${query.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        setStatus('error')
        return
      }

      if (data.authenticated && data.site?.data) {
        const d = data.site.data as Record<string, unknown>
        const cv = (d.customerValues || {}) as Record<string, string>
        setFormData({
          businessName: cv.BUSINESS_NAME || (d.businessName as string) || '',
          tagline: cv.TAGLINE || (d.tagline as string) || '',
          phone: cv.PHONE || cv.PHONE_NUMBER || (d.phone as string) || '',
          email: cv.EMAIL || (d.email as string) || '',
          address: cv.ADDRESS || (d.address as string) || '',
          services: cv.SERVICES || (d.services as string) || '',
        })
        setSiteTemplate({
          niche: d.niche as string | undefined,
          template: d.template as string | undefined,
        })
        setPortalAuthenticated(true)
        getOrCreateImageOwnerId(normalized)
      } else if (data.site?.public) {
        setPublicSiteUrl(data.site.public.siteUrl || null)
        setSiteTemplate({
          niche: data.site.public.niche || undefined,
          template: data.site.public.template || undefined,
        })
        setPortalAuthenticated(false)
      } else {
        setPortalAuthenticated(false)
      }
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [portalToken])

  useEffect(() => {
    if (!initialSlug) return
    if (initialToken) {
      storePortalToken(normalizeSlug(initialSlug), initialToken)
      setPortalToken(initialToken)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', `${url.pathname}${url.search}`)
      }
    }
    loadSite(initialSlug, initialToken || getStoredPortalToken(normalizeSlug(initialSlug)) || undefined)
  }, [initialSlug, initialToken, loadSite])

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
    if (!normalizedSlug || !portalAuthenticated) {
      setDomainInfo(null)
      return
    }
    const token = portalToken || getStoredPortalToken(normalizedSlug)
    if (!token) return
    setDomainStatus('loading')
    fetch(
      `/api/sites/domain?slug=${encodeURIComponent(normalizedSlug)}&token=${encodeURIComponent(token)}`,
    )
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
  }, [normalizedSlug, platformDomain, portalAuthenticated, portalToken])

  // Integration status is admin-only — omit client-side fetch
  // (The integrations panel shows defaults from integrationDefaults)

  const saveSite = async () => {
    const normalized = normalizeSlug(slug)
    const token = portalToken || getStoredPortalToken(normalized)
    if (!normalized || !token) {
      setStatus('error')
      return
    }
    if (!portalAuthenticated) {
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
      const response = await fetch('/api/portal/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({ slug: normalized, customerValues, token }),
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
    const token = portalToken || getStoredPortalToken(normalizedSlug)
    if (!normalizedSlug || !customDomain.trim() || !token || !portalAuthenticated) {
      setDomainStatus('error')
      setDomainMessage('Enter a valid domain name.')
      return
    }
    setDomainStatus('saving')
    setDomainMessage(null)
    try {
      const response = await fetch('/api/sites/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({
          slug: normalizedSlug,
          customDomain: customDomain.trim(),
          token,
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

  // Show signed-out/lookup state when no slug is available
  if (!initialSlug && !slug) {
    return (
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-hvac">
          <div className="max-w-lg mx-auto space-y-8 py-20">
            <div className="space-y-4 text-center">
              <span className="signal-chip">Portal</span>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Access your website dashboard
              </h1>
              <p className="text-slate-300 text-lg">
                Use the secure link from your welcome email. Slug lookup alone cannot unlock edits.
              </p>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-sm text-slate-300 block">Site slug (read-only preview)</label>
                <input
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="your-site-slug"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && lookupInput.trim()) {
                      setSlug(normalizeSlug(lookupInput.trim()))
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (lookupInput.trim()) setSlug(normalizeSlug(lookupInput.trim()))
                }}
                className="w-full cta-button text-center"
              >
                Check site status
              </button>
              <p className="text-xs text-slate-400 text-center">
                After checkout, your welcome email includes a private portal link with an access token.
              </p>
            </div>
            <div className="text-center space-y-3">
              <Link
                href="/preview-your-business"
                className="block text-cyan-200 hover:text-cyan-100 font-semibold"
              >
                Preview a New Website →
              </Link>
              <p className="text-sm text-slate-400">
                Need help?{' '}
                <Link href="/contact" className="text-cyan-300 hover:text-cyan-200 underline">
                  Contact us
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const showDevPortalWarning =
    process.env.NODE_ENV !== 'production' && normalizedSlug && !portalAuthenticated

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac space-y-10">
        {showDevPortalWarning && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            <strong>Dev:</strong> Portal edits require a valid access token. Use{' '}
            <code className="text-amber-200">/portal?slug=…&amp;token=…</code> from test-purchase or set{' '}
            <code className="text-amber-200">PORTAL_TOKEN_SECRET</code> and provision{' '}
            <code className="text-amber-200">portal_token_hash</code> in Supabase.
          </div>
        )}
        {!portalAuthenticated && normalizedSlug && (
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {publicSiteUrl ? (
              <>
                Site found at{' '}
                <a href={publicSiteUrl} className="underline font-semibold" target="_blank" rel="noreferrer">
                  {publicSiteUrl}
                </a>
                . Open the secure link from your welcome email to edit and publish changes.
              </>
            ) : (
              <>This slug does not have portal access yet, or your access token is missing or invalid.</>
            )}
          </div>
        )}
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="signal-chip">Portal</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Your platform command center
            </h1>
            <p className="text-slate-300 text-lg">
              Track launch progress, manage updates, and keep your website platform performing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/preview-your-business" className="cta-button">
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
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!portalAuthenticated ? 'opacity-60 pointer-events-none' : ''}`}>
              <input
                value={formData.businessName}
                onChange={(event) =>
                  setFormData({ ...formData, businessName: event.target.value })
                }
                placeholder="Business name"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                value={formData.tagline}
                onChange={(event) => setFormData({ ...formData, tagline: event.target.value })}
                placeholder="Tagline"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="Phone"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="Email"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Service area"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2 disabled:cursor-not-allowed"
              />
              <textarea
                value={formData.services}
                onChange={(event) => setFormData({ ...formData, services: event.target.value })}
                placeholder="Services (comma-separated)"
                rows={3}
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                type="button"
                onClick={saveSite}
                disabled={status === 'saving' || !portalAuthenticated}
                className="cta-button disabled:opacity-50 disabled:cursor-not-allowed"
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

            {portalAuthenticated && normalizedSlug && (
              <CustomerImageLibrary owner={normalizedSlug} compact />
            )}

            {portalAuthenticated && siteTemplate.niche && siteTemplate.template && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white">Visual editor</h3>
                <p className="text-slate-300 text-sm mt-2">
                  Replace images and text on your live template, then purchase updates are applied on save from the editor checkout flow.
                </p>
                <Link
                  href={`/templates/${siteTemplate.niche}/${siteTemplate.template}?portalSlug=${encodeURIComponent(normalizedSlug)}`}
                  className="mt-4 inline-block text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  Open template editor →
                </Link>
              </div>
            )}

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

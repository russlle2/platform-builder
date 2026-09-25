'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { CustomerImageLibrary } from '@/components/CustomerImageLibrary'
import { DomainConnectCard } from '@/components/portal/DomainConnectCard'
import { getOrCreateImageOwnerId } from '@/lib/image-swaps'
import {
  getStoredPortalToken,
  storePortalToken,
} from '@/lib/portal-token-client'

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
  const [domainAffiliateUrl, setDomainAffiliateUrl] = useState<string | null>(null)
  const [domainSiteUrl, setDomainSiteUrl] = useState<string | null>(null)
  const [platformDomain, setPlatformDomain] = useState('dailyclarity.org')
  const [provisioningStatus, setProvisioningStatus] = useState<'pending' | 'active' | 'failed' | null>(null)
  const [provisioningError, setProvisioningError] = useState<string | null>(null)
  const [imageMigrationError, setImageMigrationError] = useState<string | null>(null)
  const [managedService, setManagedService] = useState(false)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    services: '',
  })
  const [siteTemplate, setSiteTemplate] = useState<{ niche?: string; template?: string }>({})
  const [hasCustomDomain, setHasCustomDomain] = useState(false)

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
      const headers: Record<string, string> = {}
      if (token) headers['x-portal-token'] = token
      const response = await fetch(
        `/api/portal/customer?slug=${encodeURIComponent(normalized)}`,
        { headers, cache: 'no-store' },
      )
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
          description: cv.DESCRIPTION || (d.description as string) || '',
          services: cv.SERVICES || (d.services as string) || '',
        })
        setSiteTemplate({
          niche: d.niche as string | undefined,
          template: d.template as string | undefined,
        })
        setPortalAuthenticated(true)
        getOrCreateImageOwnerId(normalized)
        // Extract and display provisioning status
        const siteStatus = (data.site?.status as string) || 'active'
        if (siteStatus === 'provisioning_failed') {
          setProvisioningStatus('failed')
          setProvisioningError((d.provisioning_error as string) || 'Unknown provisioning error')
        } else if (siteStatus === 'active') {
          setProvisioningStatus('active')
        } else {
          setProvisioningStatus('pending')
        }
        setHasCustomDomain(Boolean(d.custom_domain))
        setImageMigrationError((d.image_migration_error as string) || null)
        const plan = (d.plan as string) || ''
        setManagedService(Boolean(d.managed_service) || plan === 'security_ads' || plan === 'growth')
        setStripeCustomerId((d.stripe_customer_id as string) || null)
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
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null
    const fragmentToken = url?.hash.startsWith('#token=')
      ? new URLSearchParams(url.hash.slice(1)).get('token') || ''
      : ''
    const bootstrapToken = initialToken || fragmentToken
    if (bootstrapToken) {
      storePortalToken(normalizeSlug(initialSlug), bootstrapToken)
      setPortalToken(bootstrapToken)
      if (url) {
        url.searchParams.delete('token')
        if (fragmentToken) url.hash = ''
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    }
    loadSite(
      initialSlug,
      bootstrapToken || getStoredPortalToken(normalizeSlug(initialSlug)) || undefined,
    )
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

  // Dynamic checklist derived from loaded site data.
  const checklistItems = useMemo(() => [
    { label: 'Site published', done: provisioningStatus === 'active' },
    { label: 'Custom domain added', done: hasCustomDomain },
    { label: 'Required business details added', done: Boolean(formData.businessName && formData.email) },
  ], [provisioningStatus, hasCustomDomain, formData.businessName, formData.email])
  const completedCount = checklistItems.filter((i) => i.done).length

  // Show only states evidenced by the customer record. A published site does
  // not, by itself, prove that email delivery or a contact form was tested.
  const integrations = useMemo(() => {
    return [
      {
        name: 'Website publishing',
        status: provisioningStatus === 'active'
          ? 'Published'
          : provisioningStatus === 'failed'
            ? 'Needs attention'
            : 'Provisioning',
        tone: provisioningStatus === 'active'
          ? 'ready'
          : provisioningStatus === 'failed'
            ? 'error'
            : 'pending',
      },
      {
        name: 'Portal access',
        status: portalAuthenticated ? 'Authenticated' : 'Sign in required',
        tone: portalAuthenticated ? 'ready' : 'pending',
      },
      {
        name: 'Billing management',
        status: stripeCustomerId ? 'Available' : 'Not linked',
        tone: stripeCustomerId ? 'ready' : 'pending',
      },
    ]
  }, [portalAuthenticated, provisioningStatus, stripeCustomerId])

  const launchStatus = useMemo(() => {
    if (provisioningStatus === 'active') {
      return {
        summary: 'Your hosted site is published. Review it and send a test form submission before promoting it.',
        label: 'Published',
      }
    }
    if (provisioningStatus === 'failed') {
      return {
        summary: 'Publishing needs attention. Review the error below or contact support.',
        label: 'Needs attention',
      }
    }
    return {
      summary: 'Your site is being prepared. This page will show Published after deployment succeeds.',
      label: 'In progress',
    }
  }, [provisioningStatus])

  useEffect(() => {
    if (!normalizedSlug || !portalAuthenticated) {
      setDomainSiteUrl(null)
      return
    }
    const token = portalToken || getStoredPortalToken(normalizedSlug)
    const headers: Record<string, string> = {}
    if (token) headers['x-portal-token'] = token
    fetch(
      `/api/sites/domain?slug=${encodeURIComponent(normalizedSlug)}`,
      { headers, cache: 'no-store' },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.siteUrl) {
          setDomainSiteUrl(data.siteUrl)
        } else {
          setDomainSiteUrl(`https://${normalizedSlug}.${platformDomain}`)
        }
      })
      .catch(() => {
        setDomainSiteUrl(`https://${normalizedSlug}.${platformDomain}`)
      })
  }, [normalizedSlug, platformDomain, portalAuthenticated, portalToken])

  const saveSite = async () => {
    const normalized = normalizeSlug(slug)
    const token = portalToken || getStoredPortalToken(normalized)
    if (!normalized) {
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
        PRACTICE_NAME: formData.businessName,
        BRAND_NAME: formData.businessName,
        STUDIO_NAME: formData.businessName,
        TAGLINE: formData.tagline,
        PHONE: formData.phone,
        PHONE_NUMBER: formData.phone,
        CONTACT_PHONE: formData.phone,
        EMAIL: formData.email,
        CONTACT_EMAIL: formData.email,
        ADDRESS: formData.address,
        DESCRIPTION: formData.description,
        SERVICES: formData.services,
        business_name: formData.businessName,
        tagline: formData.tagline,
        phone: formData.phone,
        phone_number: formData.phone,
        email: formData.email,
        address: formData.address,
        description: formData.description,
        services: formData.services,
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['x-portal-token'] = token
      const response = await fetch('/api/portal/customer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          slug: normalized,
          customerValues,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok && result?.saved) {
        setStatus('saved')
        setPublishNote(result.error || 'Saved, but the live publish needs to be retried.')
        return
      }
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
                . Open the secure link from your welcome email or{' '}
                <Link
                  href={`/login?next=${encodeURIComponent(`/portal?slug=${normalizedSlug}`)}`}
                  className="underline font-semibold"
                >
                  sign in with the customer email
                </Link>{' '}
                to edit and publish changes.
              </>
            ) : (
              <>
                This slug does not have portal access yet, or your access token is missing or expired.{' '}
                <Link
                  href={`/login?next=${encodeURIComponent(`/portal?slug=${normalizedSlug}`)}`}
                  className="underline font-semibold"
                >
                  Sign in with the customer email
                </Link>{' '}
                or contact support if you still cannot open it.
              </>
            )}
          </div>
        )}
        {provisioningStatus && (
          <>
            {provisioningStatus === 'active' && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="font-semibold">🎉 Your website is live!</p>
                    <p className="text-emerald-100/80 mt-1">
                      Your site is now live and ready to receive visitors. Start promoting it!
                    </p>
                  </div>
                </div>
              </div>
            )}
            {provisioningStatus === 'pending' && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-6 py-4 text-sm text-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <div>
                    <p className="font-semibold">We&rsquo;re provisioning your website</p>
                    <p className="text-amber-100/80 mt-1">
                      Your website setup is in progress. We&rsquo;ll send you an email when it is live or if we need anything else from you.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {provisioningStatus === 'failed' && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-6 py-4 text-sm text-red-50">
                <div className="flex items-start gap-3">
                  <div className="text-xl">⚠️</div>
                  <div className="flex-1">
                    <p className="font-semibold">Site provisioning encountered an error</p>
                    <p className="text-red-100/80 mt-1">{provisioningError}</p>
                    <p className="text-red-100/70 mt-2">
                      Our team has been notified. Please{' '}
                      <Link href="/contact" className="underline font-semibold hover:text-red-50">
                        contact us
                      </Link>{' '}
                      if this isn&rsquo;t resolved within a few hours.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {imageMigrationError && (
              <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-6 py-4 text-sm text-orange-50">
                <div className="flex items-start gap-3">
                  <div className="text-xl">📸</div>
                  <div className="flex-1">
                    <p className="font-semibold">Image upload notice</p>
                    <p className="text-orange-100/80 mt-1">{imageMigrationError}</p>
                    <p className="text-orange-100/70 mt-2">
                      You can re-upload images anytime in the Images section below, or contact support for help.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {portalAuthenticated && managedService && (
          <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-6 py-5 text-sm text-cyan-50">
            <div className="flex items-start gap-3">
              <div className="text-xl">🛡️</div>
              <div className="flex-1">
                <p className="font-semibold text-base">Security + Ads — managed by our team</p>
                <p className="text-cyan-100/80 mt-1">
                  You&rsquo;re on our done-for-you plan. Our team will email you to confirm campaign
                  goals and the security and operations work included before managed work begins.
                </p>
                <p className="text-cyan-100/70 mt-2">
                  Want to brief us on goals or audiences?{' '}
                  <Link href="/contact" className="underline font-semibold hover:text-white">
                    Send us a note
                  </Link>
                  .
                </p>
              </div>
            </div>
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
            <p className="text-slate-300 mt-2">{launchStatus.summary}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Checklist</p>
                <p className="text-3xl font-bold text-white">{completedCount}/{checklistItems.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current state</p>
                <p className="text-xl font-bold text-white">{launchStatus.label}</p>
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
              <label htmlFor="portal-site-slug" className="text-sm text-slate-300">Subdomain slug</label>
              <div className="flex gap-3">
                <input
                  id="portal-site-slug"
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
                aria-label="Business name"
                value={formData.businessName}
                onChange={(event) =>
                  setFormData({ ...formData, businessName: event.target.value })
                }
                placeholder="Business name"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                aria-label="Tagline"
                value={formData.tagline}
                onChange={(event) => setFormData({ ...formData, tagline: event.target.value })}
                placeholder="Tagline"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                aria-label="Phone number"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="Phone"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                aria-label="Email address"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="Email"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:cursor-not-allowed"
              />
              <input
                aria-label="Service area"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Service area"
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2 disabled:cursor-not-allowed"
              />
              <textarea
                aria-label="Business description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Business description"
                rows={3}
                disabled={!portalAuthenticated}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white md:col-span-2 disabled:cursor-not-allowed"
              />
              <textarea
                aria-label="Services"
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
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/5 text-slate-500'
                  }`}>
                    {item.done ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${item.done ? 'text-emerald-200' : 'text-slate-300'}`}>
                    {item.label}
                  </p>
                </div>
              ))}
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
                      href={domainSiteUrl || `https://${normalizedSlug}.${platformDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-200 hover:text-cyan-100 break-all"
                    >
                      {normalizedSlug}.{platformDomain}
                    </a>
                  </div>
                  {portalAuthenticated && (
                    <DomainConnectCard
                      slug={normalizedSlug}
                      portalToken={portalToken || getStoredPortalToken(normalizedSlug) || undefined}
                    />
                  )}
                  {!portalAuthenticated && (
                    <p className="text-xs text-slate-400">
                      Sign in with your portal link to connect a custom domain.
                    </p>
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
                      item.tone === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : item.tone === 'error'
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
              <CustomerImageLibrary
                owner={normalizedSlug}
                portalToken={portalToken || getStoredPortalToken(normalizedSlug) || undefined}
                compact
              />
            )}

            {portalAuthenticated && siteTemplate.niche && siteTemplate.template && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white">Visual editor</h3>
                <p className="text-slate-300 text-sm mt-2">
                  Edit supported text and image fields in your selected template. Saving from the editor republishes the current site.
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
                Activity history is not available yet. Use the save confirmation and launch status above to verify current changes.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

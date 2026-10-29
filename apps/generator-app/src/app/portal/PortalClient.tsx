'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CustomerImageLibrary } from '@/components/CustomerImageLibrary'
import { DomainConnectCard } from '@/components/portal/DomainConnectCard'
import { CustomerInbox } from '@/components/portal/CustomerInbox'
import { WebsiteServices } from '@/components/portal/WebsiteServices'
import {
  getStoredPortalToken,
  storePortalToken,
} from '@/lib/portal-token-client'
import { getPlan } from '@/lib/plans'
import { UsageAllowanceCard } from '@/components/portal/UsageAllowanceCard'
import type { SiteUsageStatus } from '@/lib/usage-allowances'

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
const emptyForm = {
  businessName: '',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  description: '',
  services: '',
}
type Details = typeof emptyForm
type Site = {
  slug: string
  status: string
  data: { customerValues?: Record<string, string>; [key: string]: unknown }
}
const card =
  'scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-7'
const inputClass =
  'mt-2 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'
const button =
  'inline-flex items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50'

function safeSiteUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

function detailsFor(data: Site['data']): Details {
  const values = data.customerValues || {}
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    businessName: text(values.BUSINESS_NAME || data.businessName),
    tagline: text(values.TAGLINE || data.tagline),
    phone: text(values.PHONE || values.PHONE_NUMBER || data.phone),
    email: text(values.EMAIL || data.email),
    address: text(values.ADDRESS || data.address),
    description: text(values.DESCRIPTION || data.description),
    services: text(values.SERVICES || data.services),
  }
}

export default function PortalClient() {
  const searchParams = useSearchParams()
  const initialSlug = normalizeSlug(searchParams.get('slug') || '')
  const initialToken = searchParams.get('token') || ''
  const [lookup, setLookup] = useState(initialSlug)
  const [slug, setSlug] = useState(initialSlug)
  const [token, setToken] = useState('')
  const [site, setSite] = useState<Site | null>(null)
  const [usage, setUsage] = useState<SiteUsageStatus | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>(
    'idle',
  )
  const [error, setError] = useState('')
  const [form, setForm] = useState<Details>(emptyForm)
  const [savedForm, setSavedForm] = useState<Details>(emptyForm)
  const [publishState, setPublishState] = useState<
    'published' | 'pending' | 'failed' | null
  >(null)
  const [publishNote, setPublishNote] = useState('')
  const requestId = useRef(0)
  const saving = useRef(false)
  const publishAttempt = useRef<{ id: string; payload: string } | null>(null)
  const dirty =
    Boolean(site) && JSON.stringify(form) !== JSON.stringify(savedForm)
  const busy = status === 'loading' || status === 'saving'

  const loadSite = useCallback(
    async (target: string, tokenOverride?: string) => {
      const normalized = normalizeSlug(target)
      if (!normalized) return
      const id = ++requestId.current
      const credential = tokenOverride || getStoredPortalToken(normalized) || ''
      setSlug(normalized)
      setLookup(normalized)
      setToken(credential)
      setSite(null)
      setUsage(null)
      publishAttempt.current = null
      setForm(emptyForm)
      setSavedForm(emptyForm)
      setPublicUrl(null)
      setPublishState(null)
      setPublishNote('')
      setError('')
      setStatus('loading')
      try {
        const response = await fetch(
          `/api/portal/customer?slug=${encodeURIComponent(normalized)}`,
          {
            cache: 'no-store',
            headers: credential ? { 'x-portal-token': credential } : {},
          },
        )
        const result = await response.json()
        if (id !== requestId.current) return
        if (!response.ok)
          throw new Error('Your website could not be loaded. Please try again.')
        if (
          result.authenticated === true &&
          result.site?.slug === normalized &&
          result.site?.data
        ) {
          const loaded = result.site as Site
          setSite(loaded)
          setUsage(result.usage || null)
          setForm(detailsFor(loaded.data))
          setSavedForm(detailsFor(loaded.data))
        } else setPublicUrl(safeSiteUrl(result.site?.public?.siteUrl))
        setStatus('idle')
      } catch (problem) {
        if (id !== requestId.current) return
        setError(
          problem instanceof Error
            ? problem.message
            : 'Your website could not be loaded.',
        )
        setStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    if (!initialSlug) return
    const url = new URL(window.location.href)
    const fragment = url.hash.startsWith('#token=')
      ? new URLSearchParams(url.hash.slice(1)).get('token') || ''
      : ''
    const credential = initialToken || fragment
    if (credential) {
      storePortalToken(initialSlug, credential)
      url.searchParams.delete('token')
      if (fragment) url.hash = ''
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      )
    }
    void loadSite(initialSlug, credential)
    return () => {
      requestId.current += 1
    }
  }, [initialSlug, initialToken, loadSite])

  useEffect(() => {
    if (!dirty) return
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [dirty])

  function guardNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm('Leave without saving your website changes?'))
      event.preventDefault()
  }

  function lookupSite(event: FormEvent) {
    event.preventDefault()
    const next = normalizeSlug(lookup)
    if (
      !next ||
      busy ||
      (dirty &&
        !window.confirm('Discard your unsaved changes and open this website?'))
    )
      return
    // Never carry an existing site's credential or editable data to another slug.
    void loadSite(next)
    const url = new URL(window.location.href)
    url.searchParams.set('slug', next)
    url.searchParams.delete('token')
    url.hash = ''
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}`,
    )
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !site ||
      saving.current ||
      site.slug !== slug ||
      site.status === 'billing_suspended'
    )
      return
    if (!form.businessName.trim()) {
      setStatus('error')
      setError('Enter your business name before publishing.')
      return
    }
    saving.current = true
    const submitted = { ...form }
    setStatus('saving')
    setError('')
    setPublishNote('')
    const customerValues = {
      BUSINESS_NAME: submitted.businessName,
      PRACTICE_NAME: submitted.businessName,
      BRAND_NAME: submitted.businessName,
      STUDIO_NAME: submitted.businessName,
      TAGLINE: submitted.tagline,
      PHONE: submitted.phone,
      PHONE_NUMBER: submitted.phone,
      CONTACT_PHONE: submitted.phone,
      EMAIL: submitted.email,
      CONTACT_EMAIL: submitted.email,
      ADDRESS: submitted.address,
      DESCRIPTION: submitted.description,
      SERVICES: submitted.services,
      business_name: submitted.businessName,
      tagline: submitted.tagline,
      phone: submitted.phone,
      phone_number: submitted.phone,
      email: submitted.email,
      address: submitted.address,
      description: submitted.description,
      services: submitted.services,
    }
    const payload = JSON.stringify({ slug: site.slug, customerValues })
    if (publishAttempt.current?.payload !== payload) {
      publishAttempt.current = { id: crypto.randomUUID(), payload }
    }
    try {
      const response = await fetch('/api/portal/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-portal-token': token } : {}),
        },
        body: JSON.stringify({ slug: site.slug, customerValues, operationId: publishAttempt.current.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (result.usage) setUsage(result.usage)
      // Only a definite failure before provider submission is safe to retry
      // with a new reference. A lost or uncertain response retains its ID.
      if (result.code === 'publish_failed') publishAttempt.current = null
      if (!response.ok && !result.saved)
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'Changes could not be saved. Your edits are still here; please try again.',
        )
      setSavedForm(submitted)
      setStatus('idle')
      if (result.code === 'publish_pending') {
        setPublishState('pending')
        setPublishNote('Your changes are saved, but publication could not be confirmed. Contact support to verify the existing attempt before publishing again.')
      } else if (!response.ok || result.code === 'publish_failed') {
        setPublishState('failed')
        setPublishNote(
          'Your changes are saved, but your live website has not been updated. Retry publishing below.',
        )
      } else if (result.republished === true) {
        // A received success completes this attempt. A later explicit publish
        // must not replay this receipt after another editor changes the site.
        publishAttempt.current = null
        setPublishState('published')
        setPublishNote('Saved and published to your live site.')
      } else {
        setPublishState('pending')
        setPublishNote(
          'Changes saved. These changes are not confirmed live yet; publishing is still pending.',
        )
      }
    } catch (problem) {
      setStatus('error')
      setError(
        problem instanceof Error
          ? problem.message
          : 'Unable to save. Your edits are still here.',
      )
    } finally {
      saving.current = false
    }
  }

  const liveUrl = safeSiteUrl(site?.data.site_url)
  const plan = getPlan(
    typeof site?.data.plan === 'string' ? site.data.plan : null,
  )
  const suspended = site?.status === 'billing_suspended'
  const published = site?.status === 'active'
  const stateLabel = published
    ? 'Published'
    : suspended
      ? 'Billing needs attention'
      : site?.status === 'provisioning_failed'
        ? 'Publishing needs attention'
        : 'Preparing your website'
  const editorHref =
    site &&
    typeof site.data.niche === 'string' &&
    typeof site.data.template === 'string'
      ? `/templates/${encodeURIComponent(site.data.niche)}/${encodeURIComponent(site.data.template)}?portalSlug=${encodeURIComponent(site.slug)}`
      : null
  const serviceNames = form.services
    .split(/[,\n]+/)
    .map((name) => name.trim())
    .filter(Boolean)

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl space-y-3">
            <span className="signal-chip">Your website workspace</span>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              {site
                ? savedForm.businessName || site.slug
                : 'Your website, in your hands.'}
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              {site
                ? 'Update your content, review enquiries, and manage your published website from one place.'
                : 'Sign in with the email used at checkout, or open the private website link from your welcome email.'}
            </p>
          </div>
          <Link
            href={
              site
                ? `/dashboard?site=${encodeURIComponent(site.slug)}`
                : '/dashboard'
            }
            onClick={guardNavigation}
            className={button}
          >
            My websites & account
          </Link>
        </header>

        {!site && (
          <section className={card} aria-label="Open your website">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold">
                  Sign in to manage your website
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Your account shows only websites you own. A website address
                  alone does not grant editing access.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(slug ? `/portal?slug=${slug}` : '/dashboard')}`}
                  className="cta-button mt-5 inline-flex"
                >
                  Sign in to your account
                </Link>
              </div>
              <form onSubmit={lookupSite} className="space-y-3">
                <label
                  htmlFor="portal-lookup"
                  className="text-sm font-semibold text-slate-200"
                >
                  Site slug
                </label>
                <input
                  id="portal-lookup"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="your-site-slug"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={busy || !normalizeSlug(lookup)}
                  className={button}
                >
                  Check site status
                </button>
                <p className="text-xs leading-relaxed text-slate-400">
                  Use the first part of your site address. We will check whether
                  this browser already has access.
                </p>
              </form>
            </div>
            {status === 'loading' && (
              <p role="status" className="mt-5 text-cyan-200">
                Loading your website and checking access…
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="mt-5 text-amber-200">
                {error}
              </p>
            )}
            {slug && status === 'idle' && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-white/5 p-4 text-sm text-slate-300"
              >
                {publicUrl && (
                  <>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-200 underline"
                    >
                      View this website
                    </a>
                    .{' '}
                  </>
                )}
                Sign in with the customer email or use your private welcome link
                to unlock this website.
              </p>
            )}
          </section>
        )}

        {site && (
          <>
            <section
              aria-label="Website overview"
              className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/50 to-slate-900 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${published ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/30 bg-amber-400/10 text-amber-100'}`}
                  >
                    {stateLabel}
                  </p>
                  <p className="mt-3 break-all text-sm text-slate-300">
                    {liveUrl || `Website: ${site.slug}`}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {published
                      ? 'Review your live pages and send a test enquiry before sharing your website.'
                      : suspended
                        ? 'Resolve billing from your account before publishing more changes.'
                        : 'Prepare your content while publishing is completed.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {editorHref && (
                    <Link
                      href={editorHref}
                      onClick={guardNavigation}
                      className="cta-button"
                    >
                      Open visual editor
                    </Link>
                  )}
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={button}
                    >
                      View live website ↗
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !dirty ||
                        window.confirm(
                          'Discard your unsaved changes and refresh this website?',
                        )
                      )
                        void loadSite(site.slug)
                    }}
                    className={button}
                  >
                    Refresh website status
                  </button>
                </div>
              </div>
            </section>
            {Boolean(site.data.image_migration_error) && (
              <p
                role="status"
                className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"
              >
                Some uploaded images could not be moved to your website.
                Re-upload them in Website images below or contact support.
              </p>
            )}
            <nav
              aria-label="Website settings"
              className="flex flex-wrap gap-2 text-sm"
            >
              {[
                ['#details', 'Business details'],
                ['#services', 'Services'],
                ['#inbox', 'Enquiries'],
                ['#images', 'Images'],
                ['#domain', 'Domain'],
                ['#website-services', 'Website services'],
                ['#account', 'Plan & billing'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  {label}
                </a>
              ))}
            </nav>
            <WebsiteServices site={site} context="portal" onNavigate={guardNavigation} />
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-7">
                <form id="details" onSubmit={saveSite} className={card}>
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">Business details</h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        Edit supported fields on your website.
                      </p>
                    </div>
                    <span
                      role="status"
                      className={`rounded-full px-3 py-1 text-xs ${dirty ? 'bg-amber-400/10 text-amber-200' : 'bg-white/5 text-slate-400'}`}
                    >
                      {dirty ? 'Unsaved changes' : 'Saved details'}
                    </span>
                  </div>
                  <fieldset
                    disabled={busy || suspended}
                    onChange={() => {
                      setPublishNote('')
                      setError('')
                      if (status === 'error') setStatus('idle')
                    }}
                    className="space-y-5 disabled:opacity-60"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      {(
                        [
                          ['businessName', 'Business name', 'text', true, 200],
                          ['tagline', 'Tagline', 'text', false, 300],
                          ['phone', 'Phone number', 'tel', false, 60],
                          ['email', 'Email address', 'email', true, 254],
                        ] as const
                      ).map(([key, label, type, required, maxLength]) => (
                        <label
                          key={key}
                          className="text-sm font-semibold text-slate-200"
                        >
                          {label}
                          <input
                            value={form[key]}
                            onChange={(event) =>
                              setForm({ ...form, [key]: event.target.value })
                            }
                            type={type}
                            required={required}
                            maxLength={maxLength}
                            placeholder={label}
                            aria-describedby={
                              key === 'email' ? 'public-email-note' : undefined
                            }
                            className={inputClass}
                          />
                        </label>
                      ))}
                    </div>
                    <p
                      id="public-email-note"
                      className="text-xs leading-relaxed text-slate-400"
                    >
                      This email is public website content. Editing it does not
                      change your account email or the destination for enquiry
                      notifications.
                    </p>
                    <label className="block text-sm font-semibold text-slate-200">
                      Service area
                      <input
                        value={form.address}
                        onChange={(event) =>
                          setForm({ ...form, address: event.target.value })
                        }
                        maxLength={500}
                        placeholder="City, region, or online"
                        className={inputClass}
                      />
                    </label>
                    <div>
                      <label
                        htmlFor="portal-description"
                        className="block text-sm font-semibold text-slate-200"
                      >
                        Business description
                      </label>
                      <textarea
                        id="portal-description"
                        value={form.description}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                        rows={4}
                        maxLength={10000}
                        className={inputClass}
                      />
                    </div>
                    <section
                      id="services"
                      className="scroll-mt-24 border-t border-white/10 pt-6"
                    >
                      <h3 className="text-xl font-bold">Your services</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        List the services clients can read about. Use the visual
                        editor for other supported service text and links.
                      </p>
                      <label
                        htmlFor="portal-services"
                        className="mt-4 block text-sm font-semibold text-slate-200"
                      >
                        Services
                      </label>
                      <textarea
                        id="portal-services"
                        value={form.services}
                        onChange={(event) =>
                          setForm({ ...form, services: event.target.value })
                        }
                        rows={3}
                        maxLength={5000}
                        placeholder="Consultations, Group sessions, Online coaching"
                        aria-describedby="services-help"
                        className={inputClass}
                      />
                      <p
                        id="services-help"
                        className="mt-2 text-xs text-slate-400"
                      >
                        Separate services with commas or new lines. This updates
                        website copy; it does not activate scheduling or
                        customer payments.
                      </p>
                      {serviceNames.length > 0 && (
                        <ul
                          aria-label="Service names"
                          className="mt-3 flex flex-wrap gap-2"
                        >
                          {serviceNames.slice(0, 20).map((name, index) => (
                            <li
                              key={`${index}-${name}`}
                              className="max-w-full break-words rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs text-cyan-100"
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </fieldset>
                  <div className="mt-7 border-t border-white/10 pt-5">
                    {status === 'error' && (
                      <p
                        role="alert"
                        className="mb-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100"
                      >
                        {error}
                      </p>
                    )}
                    {publishNote && (
                      <p
                        role={publishState === 'failed' ? 'alert' : 'status'}
                        className={`mb-4 rounded-xl border p-4 text-sm ${publishState === 'published' ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'}`}
                      >
                        {publishNote}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={
                          busy ||
                          suspended ||
                          (!dirty && publishState !== 'failed')
                        }
                        className="cta-button disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status === 'saving'
                          ? 'Saving & publishing…'
                          : publishState === 'failed' && !dirty
                            ? 'Retry publishing'
                            : 'Save & publish'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !dirty}
                        onClick={() => {
                          setForm(savedForm)
                          setError('')
                          setStatus('idle')
                        }}
                        className={button}
                      >
                        Discard changes
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      Your changes appear live only after publishing succeeds.
                      Existing design and image edits are preserved.
                    </p>
                  </div>
                </form>
                <div id="inbox" className="scroll-mt-24">
                  <CustomerInbox
                    key={site.slug}
                    slug={site.slug}
                    portalToken={token || undefined}
                  />
                </div>
                <section id="images" className={card}>
                  <h2 className="mb-3 text-2xl font-bold">Website images</h2>
                  <p className="mb-5 text-sm leading-relaxed text-slate-400">
                    Upload photos here, then open the visual editor to place
                    them in supported image slots and publish.
                  </p>
                  <CustomerImageLibrary
                    key={site.slug}
                    owner={site.slug}
                    portalToken={token || undefined}
                  />
                </section>
              </div>
              <aside className="min-w-0 space-y-6">
                <section id="domain" className={card}>
                  <h2 className="text-xl font-bold">Your domain</h2>
                  <p className="mb-5 mt-2 text-sm leading-relaxed text-slate-400">
                    Connect your address, check DNS, and open the HTTPS website
                    before sharing it.
                  </p>
                  <DomainConnectCard
                    key={site.slug}
                    slug={site.slug}
                    currentDomain={
                      typeof site.data.custom_domain === 'string'
                        ? site.data.custom_domain
                        : undefined
                    }
                    portalToken={token || undefined}
                  />
                </section>
                <section id="account" className={card}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Your plan
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    {plan?.name || 'Website account'}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Manage your subscription, invoices, and payment method
                    through your signed-in account.
                  </p>
                  <UsageAllowanceCard usage={usage} />
                  <Link
                    href={`/dashboard?site=${encodeURIComponent(site.slug)}#billing`}
                    onClick={guardNavigation}
                    className={`${button} mt-5 w-full`}
                  >
                    Open account & billing
                  </Link>
                  {(plan?.managedService ||
                    site.data.managed_service === true) && (
                    <p className="mt-4 text-xs leading-relaxed text-slate-400">
                      Ads and security work is delivered by our team. Scope and
                      timing are confirmed by email before work begins.
                    </p>
                  )}
                </section>
                <section className={card}>
                  <h2 className="text-xl font-bold">
                    Before you share your site
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                    <li>Review desktop and phone layouts.</li>
                    <li>Check services and contact details.</li>
                    <li>Send a test enquiry and find it in your inbox.</li>
                    <li>Open your domain over HTTPS.</li>
                  </ul>
                  <p className="mt-4 text-xs leading-relaxed text-slate-400">
                    A published website does not prove email delivery, bookings,
                    or third-party payments are configured.
                  </p>
                  <Link
                    href="/contact"
                    onClick={guardNavigation}
                    className="mt-5 inline-block text-sm font-semibold text-cyan-200 underline underline-offset-4"
                  >
                    Get help with your website
                  </Link>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

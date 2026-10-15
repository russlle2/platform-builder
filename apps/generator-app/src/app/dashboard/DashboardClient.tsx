'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPlan } from '@/lib/plans'
import { WebsiteServices } from '@/components/portal/WebsiteServices'

export interface PortalSiteData {
  slug: string
  status: string
  owner_email: string | null
  data: {
    email?: string
    niche?: string
    template?: string
    colorScheme?: string
    plan?: string
    site_url?: string
    netlify_site_id?: string
    custom_domain?: string
    stripe_customer_id?: string
    customerValues?: Record<string, string>
  }
}
interface DashboardClientProps {
  userEmail: string
  site: PortalSiteData | null
  sites: { slug: string; name: string }[]
}
const card = 'rounded-2xl border border-white/10 bg-slate-900/70 p-6'
const button =
  'inline-flex items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-50'

export function safeDashboardSiteUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

export function isStripeBillingPortalUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'billing.stripe.com' &&
      !url.port &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export default function DashboardClient({
  userEmail,
  site,
  sites,
}: DashboardClientProps) {
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [accountError, setAccountError] = useState('')
  const billingRequest = useRef(false)
  const plan = getPlan(site?.data.plan ?? null)
  const siteUrl = safeDashboardSiteUrl(site?.data.site_url)
  const portalHref = site
    ? `/portal?slug=${encodeURIComponent(site.slug)}`
    : '/portal'
  const editorHref =
    site?.data.niche && site.data.template
      ? `/templates/${encodeURIComponent(site.data.niche)}/${encodeURIComponent(site.data.template)}?portalSlug=${encodeURIComponent(site.slug)}`
      : null
  const published = site?.status === 'active'
  const stateLabel = published
    ? 'Published'
    : site?.status === 'billing_suspended'
      ? 'Billing needs attention'
      : site?.status === 'provisioning_failed'
        ? 'Publishing needs attention'
        : 'Preparing your website'
  const checklist = site
    ? [
        { label: 'Website published', done: published },
        {
          label: 'Business name and contact email added',
          done: Boolean(
            site.data.customerValues?.BUSINESS_NAME &&
              site.data.customerValues?.EMAIL,
          ),
        },
        {
          label: 'Services described',
          done: Boolean(site.data.customerValues?.SERVICES?.trim()),
        },
        {
          label: 'Custom domain saved (optional)',
          done: Boolean(site.data.custom_domain),
        },
      ]
    : []

  async function handleManageBilling() {
    if (!site || billingRequest.current) return
    billingRequest.current = true
    setBillingLoading(true)
    setBillingError('')
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: site.slug }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'Billing could not be opened. Please try again.',
        )
      if (!isStripeBillingPortalUrl(result.url))
        throw new Error(
          'The secure Stripe billing link could not be verified. Please try again.',
        )
      window.location.assign(result.url)
    } catch (problem) {
      setBillingError(
        problem instanceof Error
          ? problem.message
          : 'Billing could not be opened. Please try again.',
      )
    } finally {
      billingRequest.current = false
      setBillingLoading(false)
    }
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    setAccountError('')
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      window.location.assign('/')
    } catch {
      setAccountError('Sign out could not be completed. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <span className="signal-chip">Your DailyClarity account</span>
            <h1 className="text-4xl font-bold sm:text-5xl">My websites</h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Your website, content, enquiries, and subscription. Choose what
              you want to work on.
            </p>
          </div>
          <div className="max-w-full space-y-2 text-right">
            <p className="break-all text-xs text-slate-400">{userEmail}</p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className={button}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        {accountError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"
          >
            {accountError}
          </p>
        )}
        {sites.length > 1 && (
          <nav aria-label="Your websites" className="flex flex-wrap gap-2">
            {sites.map((candidate) => (
              <Link
                key={candidate.slug}
                href={`/dashboard?site=${encodeURIComponent(candidate.slug)}`}
                aria-current={
                  candidate.slug === site?.slug ? 'page' : undefined
                }
                className={`max-w-full break-words rounded-xl border px-4 py-3 text-sm font-semibold ${candidate.slug === site?.slug ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-slate-300 hover:bg-white/10'}`}
              >
                {candidate.name}
              </Link>
            ))}
          </nav>
        )}

        {!site ? (
          <section className={`${card} py-12 text-center`}>
            <h2 className="text-3xl font-bold">
              Your next website starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              No websites are linked to this account yet. Build a free preview,
              or sign in with the email you used at checkout to find a purchased
              site.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/preview-your-business" className="cta-button">
                Create a free preview
              </Link>
              <Link href="/portal" className={button}>
                Open a welcome-email link
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section
              aria-label="Selected website"
              className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/50 to-slate-900 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Your website
                  </p>
                  <h2 className="mt-2 break-words text-3xl font-bold">
                    {site.data.customerValues?.BUSINESS_NAME || site.slug}
                  </h2>
                  {siteUrl ? (
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block break-all text-sm text-cyan-200 underline underline-offset-4"
                    >
                      {siteUrl} ↗
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      Your website address will appear after deployment is
                      confirmed.
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'}`}
                >
                  {stateLabel}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
                {site.status === 'billing_suspended'
                  ? 'Publishing is paused while billing needs attention. Review your payment method and invoices below.'
                  : published
                    ? 'Keep your content current, review new enquiries, and check changes on your live website.'
                    : 'Prepare your website content while publishing is completed. Contact support if setup needs attention.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={portalHref} className="cta-button">
                  Manage website
                </Link>
                {editorHref && (
                  <Link href={editorHref} className={button}>
                    Open visual editor
                  </Link>
                )}
              </div>
            </section>

            <section
              aria-label="Website tools"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[
                {
                  title: 'Business & services',
                  body: 'Update your public contact details, service descriptions, and website copy.',
                  anchor: 'details',
                  action: 'Edit website content',
                },
                {
                  title: 'Website enquiries',
                  body: 'Read saved contact-form messages, even when an email notification was not sent.',
                  anchor: 'inbox',
                  action: 'Open enquiries',
                },
                {
                  title: 'Images & design',
                  body: 'Upload your photos and place them in supported slots using the visual editor.',
                  anchor: 'images',
                  action: 'Manage website images',
                },
              ].map((item) => (
                <Link
                  key={item.anchor}
                  href={`${portalHref}#${item.anchor}`}
                  className={`${card} group transition hover:border-cyan-300/40 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300`}
                >
                  <h2 className="text-xl font-bold group-hover:text-cyan-200">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {item.body}
                  </p>
                  <span className="mt-5 inline-block text-sm font-semibold text-cyan-200">
                    {item.action} →
                  </span>
                </Link>
              ))}
            </section>

            <WebsiteServices site={site} context="dashboard" />

            <div className="grid gap-5 md:grid-cols-3">
              <section id="billing" className={`${card} scroll-mt-24`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Plan & billing
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  {plan?.name || 'Website subscription'}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Check current charges, trial terms, invoices, and your payment
                  method in Stripe.
                </p>
                {billingError && (
                  <p role="alert" className="mt-4 text-sm text-amber-200">
                    {billingError}{' '}
                    <Link href="/contact" className="underline underline-offset-4">
                      Contact support
                    </Link>
                  </p>
                )}
                {site.data.stripe_customer_id ? (
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className={`${button} mt-5 w-full`}
                  >
                    {billingLoading
                      ? 'Opening secure billing…'
                      : 'Manage billing'}
                  </button>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    Billing is not linked yet.{' '}
                    <Link href="/contact" className="text-cyan-200 underline">
                      Contact support
                    </Link>{' '}
                    for account help.
                  </p>
                )}
                {plan?.managedService && (
                  <p className="mt-4 text-xs leading-relaxed text-slate-400">
                    Managed ads and security work is scoped and delivered by our
                    team; timing is confirmed by email.
                  </p>
                )}
              </section>
              <section className={card}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Website address
                </p>
                <h2 className="mt-3 text-xl font-bold">Your domain</h2>
                <p className="mt-3 break-all text-sm text-slate-200">
                  {site.data.custom_domain ||
                    'Use your included address or connect your own domain.'}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Saving a domain does not confirm DNS or HTTPS. Check both
                  before sharing it.
                </p>
                <Link
                  href={`${portalHref}#domain`}
                  className={`${button} mt-5`}
                >
                  {site.data.custom_domain
                    ? 'Review domain setup'
                    : 'Connect a domain'}
                </Link>
              </section>
              <section className={card}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Website details
                </p>
                <h2 className="mt-3 text-xl font-bold">Your next steps</h2>
                <ul className="mt-4 space-y-3">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-start gap-2 text-sm leading-relaxed"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          item.done ? 'text-emerald-300' : 'text-slate-400'
                        }
                      >
                        {item.done ? '✓' : '○'}
                      </span>
                      <span className="text-slate-300">
                        <span className="sr-only">
                          {item.done ? 'Complete: ' : 'Not yet complete: '}
                        </span>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  Send a test enquiry from the live website to check message
                  collection and email notification separately.
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

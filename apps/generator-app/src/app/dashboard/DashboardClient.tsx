'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getPlan } from '@/lib/plans'

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
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    provisioning_failed: { label: 'Failed', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const config = map[status] ?? { label: status, className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
      {config.label}
    </span>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500/30' : 'bg-slate-700/60'}`}>
        {done ? (
          <svg className="w-3 h-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-500" />
        )}
      </span>
      <span className={`text-sm ${done ? 'text-slate-300 line-through decoration-slate-500' : 'text-slate-200'}`}>
        {label}
      </span>
    </li>
  )
}

export default function DashboardClient({ userEmail, site }: DashboardClientProps) {
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

  const plan = getPlan(site?.data.plan ?? null)
  const siteUrl = site?.data.site_url ?? `https://${site?.slug}.dailyclarity.org`
  const customDomain = site?.data.custom_domain ?? null

  const checklist = site
    ? [
        { label: 'Site published', done: site.status === 'active' },
        { label: 'Custom domain connected', done: Boolean(customDomain) },
        {
          label: 'Business info complete',
          done: Boolean(
            site.data.customerValues &&
              Object.values(site.data.customerValues).filter(Boolean).length >= 3,
          ),
        },
        { label: 'Contact form tested (log into your site to test)', done: false },
      ]
    : []

  async function handleManageBilling() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setBillingError(body.error ?? 'Unable to open billing portal')
        return
      }
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch {
      setBillingError('Network error — please try again.')
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="DailyClarity" width={36} height={36} className="h-8 w-8" />
            <span className="text-xl font-bold text-white tracking-[0.12em] uppercase hidden sm:block">
              Daily<span className="text-cyan-300">Clarity</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your DailyClarity website, billing, and settings.</p>
        </div>

        {!site ? (
          /* ── Empty state ── */
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">You don&apos;t have a site yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Get your professional wellness website live in minutes — no tech skills needed.
            </p>
            <Link
              href="/preview-your-business"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm uppercase tracking-[0.15em] transition-all"
            >
              Preview your business
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Site status card ── */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{site.data.customerValues?.BUSINESS_NAME ?? site.slug}</h2>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 mt-0.5 transition-colors"
                  >
                    {siteUrl}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <StatusBadge status={site.status} />
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                {site.data.niche && site.data.template && (
                  <Link
                    href={`/templates/${site.data.niche}/${site.data.template}?portalSlug=${site.slug}`}
                    className="inline-flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-lg border border-cyan-500/30 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit your site
                  </Link>
                )}
                <Link
                  href="/portal"
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-lg border border-white/10 transition-all"
                >
                  Open portal
                </Link>
              </div>
            </div>

            {/* ── Launch checklist ── */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Launch checklist</h2>
              <ul>
                {checklist.map((item) => (
                  <ChecklistItem key={item.label} done={item.done} label={item.label} />
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                {checklist.filter((i) => i.done).length}/{checklist.length} complete
              </p>
            </div>

            {/* ── Billing card ── */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Billing</h2>
              {plan ? (
                <>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 text-sm">/mo</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-4 font-medium">{plan.name} plan</p>
                  {billingError && (
                    <p className="text-red-300 text-xs mb-3">{billingError}</p>
                  )}
                  <button
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2.5 rounded-lg border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    {billingLoading ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : null}
                    Manage billing
                  </button>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Contact <a href="mailto:support@dailyclarity.org" className="text-cyan-400">support</a> to manage billing.</p>
              )}
            </div>

            {/* ── Custom domain card ── */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Custom domain</h2>
              {customDomain ? (
                <div>
                  <p className="text-white font-medium text-sm mb-1">{customDomain}</p>
                  <p className="text-slate-400 text-xs mb-4">Your custom domain is connected.</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm mb-4">No custom domain yet. Point your own domain to your DailyClarity site.</p>
                  <Link
                    href="/docs/custom-domain"
                    className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
                  >
                    Connect domain
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* ── Image library card ── */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Image library</h2>
              <p className="text-slate-400 text-sm mb-4">View and manage the photos on your website.</p>
              <Link
                href="/portal"
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
              >
                View &amp; manage images
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* ── Account settings ── */}
            <div className="lg:col-span-3 bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Account</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Signed in as</p>
                  <p className="text-white font-medium">{userEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

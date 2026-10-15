'use client'

import type { MouseEventHandler } from 'react'
import Link from 'next/link'

type ManagedSite = {
  slug: string
  data: {
    email?: unknown
    stripe_customer_id?: unknown
    customerValues?: Record<string, unknown>
  }
}

/** Match the contact handler's recipient precedence, without claiming delivery. */
export function savedNotificationRecipient(data: ManagedSite['data']): string | null {
  const value = typeof data.email === 'string'
    ? data.email
    : typeof data.customerValues?.EMAIL === 'string'
      ? data.customerValues.EMAIL
      : ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null
}

const action = 'inline-block text-sm font-semibold text-cyan-200 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'

/** Render only inside a dashboard or portal that has already authorized this site. */
export function WebsiteServices({ site, context, onNavigate }: {
  site: ManagedSite
  context: 'dashboard' | 'portal'
  onNavigate?: MouseEventHandler<HTMLAnchorElement>
}) {
  const workspace = context === 'portal' ? '' : `/portal?slug=${encodeURIComponent(site.slug)}`
  const billing = context === 'dashboard' ? '#billing' : `/dashboard?site=${encodeURIComponent(site.slug)}#billing`
  const billingLinked = typeof site.data.stripe_customer_id === 'string' && Boolean(site.data.stripe_customer_id.trim())
  const recipient = savedNotificationRecipient(site.data)

  return (
    <section id="website-services" aria-labelledby="website-services-title" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
      <h2 id="website-services-title" className="text-2xl font-bold">Website services</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
        DailyClarity manages your website data and notification services. You do not need separate provider accounts or API keys for these included services.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Stripe</p>
          <h3 className="mt-2 text-lg font-semibold">Subscription billing only</h3>
          <p className="mt-3 text-sm text-slate-200">{billingLinked ? 'Billing reference saved' : 'Billing reference not linked'}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Manage payment details and invoices for your DailyClarity plan. This does not set up payments from your own customers.
          </p>
          <Link href={billingLinked ? billing : '/contact'} onClick={onNavigate} className={`${action} mt-4`}>
            {billingLinked ? 'Review subscription billing' : 'Get billing help'}
          </Link>
        </article>
        <article className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Supabase</p>
          <h3 className="mt-2 text-lg font-semibold">Website records</h3>
          <p className="mt-3 text-sm text-slate-200">Your website record is available</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Edit your saved business details and read enquiries for this website. The enquiry inbox confirms which messages were saved.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3">
            <Link href={`${workspace}#details`} onClick={onNavigate} className={action}>Edit business details</Link>
            <Link href={`${workspace}#inbox`} onClick={onNavigate} className={action}>Open saved enquiries</Link>
          </div>
        </article>
        <article className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Postmark</p>
          <h3 className="mt-2 text-lg font-semibold">Email notifications</h3>
          <p className="mt-3 text-sm text-slate-200">{recipient ? 'Notification address saved' : 'Notification address needs attention'}</p>
          {recipient && <p className="mt-2 break-all text-sm text-slate-300">{recipient}</p>}
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Send a test enquiry from your live website, then check its notification result and your email inbox. A saved address does not confirm delivery.
          </p>
          <Link href={`${workspace}#inbox`} onClick={onNavigate} className={`${action} mt-4`}>Check notification results</Link>
        </article>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-400">
        To change the notification address or discuss taking payments from your customers,{' '}
        <Link href="/contact" onClick={onNavigate} className={action}>contact support</Link>.
        {' '}Editing your public website email does not change a separately saved notification address. Provider credentials are managed by DailyClarity.
      </p>
    </section>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Website & Account Help',
  description:
    'Find your DailyClarity website, publish edits, check enquiries, manage billing, and understand domains and content access.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Website & Account Help | DailyClarity',
    description:
      'Practical help with your website, account, billing, domain, and content.',
    url: '/help',
    type: 'website',
    images: ['/og-image.png'],
  },
}

const topics = [
  ['access', 'Find your website'],
  ['editing', 'Edit & publish'],
  ['enquiries', 'Check enquiries'],
  ['payment', 'Checkout & payment status'],
  ['billing', 'Billing & cancellation'],
  ['domains', 'Domains & hosting'],
  ['content', 'Your content & moving away'],
] as const

const sectionClass = 'scroll-mt-24 rounded-2xl border dc-border dc-surface p-6 sm:p-8'
const linkClass = 'font-medium dc-text-accent underline underline-offset-4 hover:dc-text-heading'

export default function HelpPage() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-5">
          <span className="signal-chip">Customer help</span>
          <h1 className="text-4xl font-bold leading-tight dc-text-heading sm:text-5xl">
            Your website, account, and next steps.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed dc-text-body">
            Find the right place to update your site, check a message, or manage your plan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="cta-button">Open My websites</Link>
            <Link href="/contact" className="inline-flex items-center rounded-lg border dc-border px-6 py-3 font-semibold dc-text-heading hover:dc-surface-soft">
              Contact support
            </Link>
          </div>
        </header>

        <nav aria-label="Help topics" className="rounded-2xl border dc-border dc-surface-soft p-5 sm:p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {topics.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={`inline-block py-1 ${linkClass}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="access" aria-labelledby="access-title" className={sectionClass}>
          <h2 id="access-title" className="text-2xl font-bold dc-text-heading">Find your website</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 leading-relaxed dc-text-body">
            <li>Open <Link href="/dashboard" className={linkClass}>My websites</Link> and sign in with the account email you entered in your website details.</li>
            <li>Follow the sign-in link sent to your inbox. If it has expired, request a new one from the sign-in page.</li>
            <li>Choose your website if your account lists more than one.</li>
          </ol>
          <p className="mt-4 leading-relaxed dc-text-body">
            You can also open the private website link from your welcome email. If your site is
            missing or you no longer have access to that email, <Link href="/contact" className={linkClass}>contact support</Link>.
            A website address by itself does not give editing access.
          </p>
        </section>

        <section id="editing" aria-labelledby="editing-title" className={sectionClass}>
          <h2 id="editing-title" className="text-2xl font-bold dc-text-heading">Edit and publish your details</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            In My websites, choose <strong className="dc-text-heading">Edit website content</strong>.
            Update supported business details, services, and public contact information, then
            choose <strong className="dc-text-heading">Save &amp; publish</strong>. For supported image
            and page edits, use the visual editor.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            Check the publishing result, then open your live site. A saved change is only
            confirmed live when publishing succeeds. If publishing fails, use the retry action;
            if it remains pending or fails again, contact support with your site address.
          </p>
          <p className="mt-4 rounded-xl border border-cyan-300/25 dc-bg-accent-soft p-4 leading-relaxed dc-text-body">
            Your public website email, account email, and enquiry-notification address serve
            different purposes. Editing your public email does not change the other two.
            Ask support about account or notification-address changes.
          </p>
        </section>

        <section id="enquiries" aria-labelledby="enquiries-title" className={sectionClass}>
          <h2 id="enquiries-title" className="text-2xl font-bold dc-text-heading">Check messages and notifications</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            Choose <strong className="dc-text-heading">Open enquiries</strong> in My websites to read
            saved contact-form messages. A saved enquiry and its email notification are separate:
            a message can be in your website inbox even if the notification did not arrive.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            Send a test enquiry from your live site using your own details. Check the saved
            message, its notification result, and your email inbox or spam folder. If something
            is missing, tell support which site you tested and approximately when.
          </p>
        </section>

        <section id="payment" aria-labelledby="payment-title" className={sectionClass}>
          <h2 id="payment-title" className="text-2xl font-bold dc-text-heading">Checkout and payment status</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            Payment opens in Stripe Checkout. You can pay by card without creating a Stripe Link account;
            other available payment methods appear there. Your bank may ask you to approve the payment.
            Complete that step only in the bank or payment provider’s own screen.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            The card statement name is <strong className="dc-text-heading">DAILYCLARITY.ORG</strong>.
            Your bank may abbreviate it. For monthly plans, invoices and payment-method updates are
            available through <strong className="dc-text-heading">Manage billing</strong> in My websites.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            If you submitted payment but the result is unclear, check the confirmation page again,
            your account, and your email before starting another purchase. A pending bank entry can
            be an authorization rather than a completed payment. If you still need help,{' '}
            <Link href="/contact" className={linkClass}>contact support</Link> with your account email,
            plan, and approximate payment time. Never send your full card number or a bank verification code.
          </p>
        </section>

        <section id="billing" aria-labelledby="billing-title" className={sectionClass}>
          <h2 id="billing-title" className="text-2xl font-bold dc-text-heading">Manage billing or cancel</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            Select your site in My websites, find <strong className="dc-text-heading">Plan &amp; billing</strong>,
            and choose <strong className="dc-text-heading">Manage billing</strong> to open Stripe.
            Review your payment method, invoices, trial dates, and available subscription controls there.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            To cancel, complete the cancellation steps in the billing portal and check the
            confirmation and effective date. If billing is not linked or the cancellation
            option is unavailable, <Link href="/contact" className={linkClass}>contact support</Link>.
            Plan changes are also requested through support.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            Cancel before a trial ends to avoid its first charge. Unless checkout states
            otherwise, cancellation stops future renewals and access continues through the
            paid period. See the <Link href="/refund-policy" className={linkClass}>cancellation and refund policy</Link> for
            subscriptions and custom builds. This billing account manages your DailyClarity plan;
            it does not collect payments from your own clients.
          </p>
        </section>

        <section id="domains" aria-labelledby="domains-title" className={sectionClass}>
          <h2 id="domains-title" className="text-2xl font-bold dc-text-heading">Understand your address and hosting</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            Hosted website plans include a subdomain and SSL. To connect an existing custom
            domain, choose <strong className="dc-text-heading">Connect a domain</strong> from My websites.
            Enter your domain, add the displayed DNS records at your domain provider, then use
            <strong className="dc-text-heading"> Check DNS Status</strong>. Open the website over HTTPS
            before sharing the address; saving a domain alone does not confirm it is working.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            Connecting a domain does not transfer its registration to DailyClarity. You manage
            registration and renewal with your domain provider unless your purchase expressly
            includes a different arrangement. For an already configured domain that needs
            changing or removing, <Link href="/contact" className={linkClass}>contact support</Link>.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            If you plan to move your site, confirm hosting and domain arrangements before your
            paid period ends. For a custom build, use the hosting scope agreed for your project.
          </p>
        </section>

        <section id="content" aria-labelledby="content-title" className={sectionClass}>
          <h2 id="content-title" className="text-2xl font-bold dc-text-heading">Your content and moving away</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            You retain ownership of the content you submit. The platform, templates, and other
            DailyClarity materials have separate usage terms. See <Link href="/terms" className={linkClass}>Your content and DailyClarity rights in the terms</Link>.
            Keep your original copy and image files.
          </p>
          <p className="mt-4 leading-relaxed dc-text-body">
            The customer workspace currently has no self-service download of a complete website.
            To request a content copy or discuss moving elsewhere, <Link href="/contact" className={linkClass}>ask support what can be provided for your site</Link> before
            relying on an export or transfer. For access to or deletion of personal information,
            follow the <Link href="/privacy" className={linkClass}>privacy-request instructions</Link>.
          </p>
        </section>

        <aside aria-labelledby="support-title" className="rounded-2xl border border-cyan-300/30 dc-bg-accent-soft p-6 sm:p-8">
          <h2 id="support-title" className="text-2xl font-bold dc-text-heading">Help us find the right site</h2>
          <p className="mt-4 leading-relaxed dc-text-body">
            Include your website address or business name, the email used at checkout, and
            what you were trying to do. Copy any error message. Keep passwords, full payment-card
            details, and private sign-in or welcome links out of your message.
          </p>
          <Link href="/contact" className={`mt-5 inline-block ${linkClass}`}>Send a support message</Link>
        </aside>
      </div>
    </main>
  )
}

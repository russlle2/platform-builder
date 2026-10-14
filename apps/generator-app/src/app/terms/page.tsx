import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalList, LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing access to and use of DailyClarity services.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms govern your use of DailyClarity. Please read them before creating an account, beginning a trial, purchasing a build, or publishing a website."
    >
      <LegalSection title="1. Agreement and eligibility">
        <p>
          By accessing or using DailyClarity, you agree to these Terms and our Privacy Policy. You
          must be able to form a binding contract and, if you act for a business or organization,
          have authority to bind it. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          DailyClarity provides website templates, hosted websites, editing and publishing tools,
          account and customer portals, and optional managed or custom-build services. The exact
          features, scope, price, and timing for a purchase are the ones presented at checkout or
          confirmed in writing for that project.
        </p>
        <p>
          You are responsible for reviewing your site before publication and for ensuring that
          your business content, claims, accessibility, licenses, notices, and practices comply
          with laws and professional rules that apply to you. DailyClarity does not provide legal,
          medical, tax, or regulatory advice.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and access">
        <p>
          Magic links and other access credentials are personal to you. Keep your email account
          secure, provide accurate information, and promptly tell us if you suspect unauthorized
          access. You are responsible for activity performed through your account unless caused by
          our failure to use reasonable security measures.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain ownership of content you submit. You give DailyClarity a non-exclusive,
          worldwide license to host, copy, format, display, and otherwise use that content only as
          needed to provide, secure, support, and improve the requested service. You represent that
          you have the necessary rights and permissions for submitted text, images, trademarks,
          contact lists, and other materials, including any personal information they contain.
        </p>
      </LegalSection>

      <LegalSection title="5. Plans, trials, and payment">
        <LegalList>
          <li>
            Prices, billing intervals, included features, taxes, and any trial are shown before you
            confirm checkout. Stripe processes payments under its own terms.
          </li>
          <li>
            A recurring plan renews automatically at the disclosed interval until canceled. A
            trial converts to a paid subscription at its end unless you cancel before billing
            begins.
          </li>
          <li>
            You authorize the disclosed charges and agree to keep payment information current.
            Taxes may be added where required.
          </li>
          <li>
            A custom build covers the agreed scope. Material additions or third-party expenses may
            require a separate written approval and payment.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Cancellation and refunds">
        <p>
          You may cancel a recurring plan through the available billing portal or by contacting
          support. Unless checkout states otherwise, access continues through the paid billing
          period. Cancel before a trial ends to avoid the first charge. Refund eligibility is
          described in our{' '}
          <Link href="/refund-policy" className="text-cyan-300 underline underline-offset-4">
            Refund Policy
          </Link>
          , which is part of these Terms. Nothing here limits non-waivable consumer rights.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <p>You may not use DailyClarity to:</p>
        <LegalList>
          <li>break the law, infringe another person&apos;s rights, or mislead or defraud anyone;</li>
          <li>publish malware, abusive content, unlawful health claims, or regulated content without required authorization;</li>
          <li>probe, disrupt, overload, scrape, or bypass security or access controls;</li>
          <li>send spam or collect, use, or disclose personal information without a lawful basis; or</li>
          <li>resell or reverse engineer the service except where the law expressly permits it.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Third-party services and domains">
        <p>
          The service may connect to providers such as payment processors, registrars, analytics,
          email, or social platforms. Their services and fees are governed by their own terms.
          Unless a purchase expressly says otherwise, you remain responsible for third-party
          accounts, domain registration and renewal, advertising spend, and paid plugins.
        </p>
      </LegalSection>

      <LegalSection title="9. DailyClarity rights">
        <p>
          DailyClarity and its licensors own the service, software, templates, branding, and other
          materials we provide, excluding your content. We grant you a limited, revocable,
          non-transferable right to use the service while your account or applicable deliverable is
          active and in compliance with these Terms. Feedback may be used without restriction or
          payment to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Availability and termination">
        <p>
          We work to keep DailyClarity reliable, but features may change and interruptions may
          occur. We may suspend or terminate access when reasonably necessary to address security,
          nonpayment, unlawful use, material breach, or risk to the service or others. Where
          practical, we will provide notice and an opportunity to resolve the issue.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers and liability">
        <p>
          To the extent permitted by law, the service is provided “as is” and “as available,” and
          we disclaim implied warranties that cannot reasonably apply to an online service. We do
          not guarantee specific traffic, revenue, search ranking, advertising, or business
          results. To the extent permitted by law, DailyClarity is not liable for indirect,
          incidental, special, consequential, or punitive damages, or for losses caused by content
          you provide or third-party services you choose. Rights and remedies that cannot legally
          be limited remain unaffected.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes and general terms">
        <p>
          We may update these Terms as the service changes. We will post the updated version and
          give any additional notice required by law. If one provision is unenforceable, the rest
          remain effective. A delay in enforcement is not a waiver. You may not transfer these
          Terms without our consent; we may transfer them as part of a business reorganization or
          sale. Before starting a formal dispute, please contact us so we can try to resolve it.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

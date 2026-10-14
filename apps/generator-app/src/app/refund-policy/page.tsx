import type { Metadata } from 'next'
import { LegalList, LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Cancellation and refund terms for DailyClarity plans and custom website builds.',
  alternates: { canonical: '/refund-policy' },
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      summary="This policy explains how cancellations and refund requests work for DailyClarity subscriptions, trials, custom builds, and third-party costs."
    >
      <LegalSection title="1. Trials and subscriptions">
        <LegalList>
          <li>
            If checkout includes a free trial, cancel before the displayed trial end to avoid the
            first subscription charge.
          </li>
          <li>
            You may cancel a paid subscription at any time through the available billing portal or
            by contacting support. Unless checkout states otherwise, cancellation stops future
            renewals and access continues through the current paid period.
          </li>
          <li>
            Subscription charges already billed are generally non-refundable, except where
            required by law or when we determine that a billing error or material service failure
            warrants a refund.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. Custom website builds">
        <p>
          A custom-build payment reserves review and production capacity for a project scoped from
          your submitted brief. If you request cancellation before work begins, we will refund the
          custom-build payment. Once work has begun, refunds are not guaranteed; we will assess the
          completed work, committed costs, and undelivered scope and respond with any refund we can
          reasonably provide. A refund does not include work or assets already delivered and kept
          by you unless we agree otherwise in writing.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-party costs">
        <p>
          Domain registrations, advertising spend, paid plugins, stock assets, and other
          third-party purchases are governed by the provider&apos;s policy and are not refundable by
          DailyClarity once committed, unless the provider refunds the cost to us.
        </p>
      </LegalSection>

      <LegalSection title="4. Requesting a refund">
        <p>
          Email support@dailyclarity.org from the address used for your purchase. Include the
          purchase date, the relevant site or project name, and why you are requesting a refund.
          Please do not send complete card or bank details. We may request information needed to
          locate and verify the transaction.
        </p>
        <p>
          We will review the request and tell you the outcome by email. Approved refunds go back to
          the original payment method when possible; posting time is controlled by the payment
          processor and your financial institution.
        </p>
      </LegalSection>

      <LegalSection title="5. Billing problems and legal rights">
        <p>
          Contact us promptly if you believe a charge is duplicated, unauthorized, or incorrect so
          we can investigate. This policy does not limit refund, cancellation, or other rights that
          cannot be waived under applicable law.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

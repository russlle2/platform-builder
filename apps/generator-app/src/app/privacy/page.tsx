import type { Metadata } from 'next'
import { LegalList, LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How DailyClarity collects, uses, shares, and protects personal information.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains what information DailyClarity collects, why we use it, and the choices available to customers, site visitors, and people who contact a DailyClarity-powered business."
    >
      <LegalSection title="1. Scope">
        <p>
          This policy applies to dailyclarity.org, our account dashboard and customer portal,
          checkout and project-intake experiences, and websites we host for customers. A
          customer may have its own privacy obligations for information collected through its
          website. When you submit a form to a customer&apos;s site, that customer also receives and
          controls the information you provide.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <LegalList>
          <li>
            <strong className="text-white">Information you provide:</strong> name, email address,
            phone number, business details, website content, project instructions, uploaded
            files, support messages, and form submissions.
          </li>
          <li>
            <strong className="text-white">Account and transaction information:</strong> account
            identifiers, plan, purchase and subscription status, and payment-related references.
            Stripe processes card details; DailyClarity does not receive complete card numbers.
          </li>
          <li>
            <strong className="text-white">Technical and usage information:</strong> IP address,
            browser and device information, timestamps, referring pages, application logs, and
            interactions needed to secure, operate, and improve the service.
          </li>
          <li>
            <strong className="text-white">Cookies and similar technologies:</strong> essential
            cookies support sign-in, security, and preferences. We may use analytics when
            configured to understand aggregate service usage.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <LegalList>
          <li>Provide, host, personalize, maintain, and secure the service.</li>
          <li>Create accounts, process orders, manage subscriptions, and provide support.</li>
          <li>Build and publish the website or other deliverables a customer requests.</li>
          <li>Deliver form submissions and service messages to the appropriate recipient.</li>
          <li>
            Respond to optional assistant-chat questions using an artificial-intelligence service
            provider. Do not enter sensitive information in the assistant.
          </li>
          <li>Detect abuse, troubleshoot problems, measure performance, and improve features.</li>
          <li>Meet legal obligations and enforce our agreements.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. When we share information">
        <p>We share information only as reasonably needed for the purposes above, including with:</p>
        <LegalList>
          <li>
            service providers that support hosting, database and authentication, payment
            processing, email delivery, monitoring, and analytics;
          </li>
          <li>
            DailyClarity customers when a visitor contacts or transacts with that customer&apos;s
            hosted website;
          </li>
          <li>
            advisers, authorities, or other parties when required by law or reasonably necessary
            to protect rights, safety, and service integrity; and
          </li>
          <li>
            a successor in connection with a merger, financing, acquisition, reorganization, or
            sale of relevant business assets, subject to appropriate protections.
          </li>
        </LegalList>
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title="5. Retention and security">
        <p>
          We retain information for as long as reasonably necessary to provide the service,
          maintain business and transaction records, resolve disputes, prevent abuse, and meet
          legal obligations. Retention depends on the type of information and why it was
          collected. We use administrative, technical, and organizational safeguards designed to
          protect information, but no online system can guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices and privacy rights">
        <p>
          You may update certain account and website information through your dashboard or portal,
          cancel a subscription through the available billing tools, and unsubscribe using any
          link included in a promotional email. Depending on where you live, you may also have the
          right to request access, correction, deletion, restriction, portability, or an objection
          to certain processing.
        </p>
        <p>
          To make a privacy request, email support@dailyclarity.org from the address associated
          with your information. We may need to verify your identity and may retain information
          where required or permitted by law. If your request concerns a form submitted to a
          customer&apos;s site, contacting that business directly may be the fastest route.
        </p>
      </LegalSection>

      <LegalSection title="7. Children and international processing">
        <p>
          DailyClarity is a business service and is not directed to children. We do not knowingly
          collect personal information from children under 13. Information may be processed in
          countries other than the one where it was collected, with protections required by
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this policy">
        <p>
          We may update this policy as the service or legal requirements change. We will post the
          revised policy here, change the effective date, and provide additional notice when an
          update materially affects your rights and the law requires notice.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

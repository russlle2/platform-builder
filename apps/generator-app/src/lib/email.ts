/**
 * Email service powered by Postmark.
 *
 * Every outbound email in the platform flows through this module so that
 * the transport logic (Postmark) is isolated from API routes.
 *
 * Required env vars:
 *   POSTMARK_SERVER_TOKEN  – obtained from your Postmark server settings
 *   EMAIL_FROM_ADDRESS     – the verified sender, e.g. hello@yourdomain.com
 */

const POSTMARK_API = 'https://api.postmarkapp.com/email'

interface SendEmailOptions {
  to: string
  subject: string
  htmlBody: string
  textBody?: string
  /** Override the default "From" address for this message */
  from?: string
  /** Optional reply-to address */
  replyTo?: string
  /** Postmark message stream (default: "outbound") */
  messageStream?: string
}

interface PostmarkResponse {
  To: string
  SubmittedAt: string
  MessageID: string
  ErrorCode: number
  Message: string
}

/**
 * Send a single transactional email via the Postmark API.
 *
 * Throws if `POSTMARK_SERVER_TOKEN` is missing or if Postmark returns an error.
 */
export async function sendEmail(options: SendEmailOptions): Promise<PostmarkResponse> {
  const token = process.env.POSTMARK_SERVER_TOKEN
  const defaultFrom = process.env.EMAIL_FROM_ADDRESS

  if (!token) {
    throw new Error('POSTMARK_SERVER_TOKEN is not configured.')
  }
  if (!defaultFrom && !options.from) {
    throw new Error('EMAIL_FROM_ADDRESS is not configured and no "from" was provided.')
  }

  const body = {
    From: options.from || defaultFrom,
    To: options.to,
    Subject: options.subject,
    HtmlBody: options.htmlBody,
    TextBody: options.textBody || stripHtml(options.htmlBody),
    ReplyTo: options.replyTo || undefined,
    MessageStream: options.messageStream || 'outbound',
  }

  const response = await fetch(POSTMARK_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify(body),
  })

  const data: PostmarkResponse = await response.json()

  if (!response.ok || data.ErrorCode !== 0) {
    throw new Error(`Postmark error ${data.ErrorCode}: ${data.Message}`)
  }

  return data
}

/**
 * Send order confirmation email immediately after purchase.
 */
export async function sendOrderConfirmationEmail(
  to: string,
  businessName: string,
  slug: string,
  portalAccessToken?: string,
) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://dailyclarity.org'
  const portalUrl = portalAccessToken
    ? `${base.replace(/\/$/, '')}/portal?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(portalAccessToken)}`
    : `${base.replace(/\/$/, '')}/portal?slug=${encodeURIComponent(slug)}`
  const platformDomain =
    process.env.PLATFORM_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    'dailyclarity.org'
  const siteUrl = `https://${slug}.${platformDomain}`

  return sendEmail({
    to,
    subject: `Your order is confirmed — we're building your site now`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e293b;">Your order is confirmed, ${escapeHtml(businessName)}!</h1>
        <p style="font-size: 1.1rem; color: #334155;">Thank you for your purchase. We've received your order and are provisioning your website now.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #0891b2; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #075985;"><strong>Your site will be live at:</strong></p>
          <p style="margin: 8px 0 0 0; color: #0891b2;"><strong>${escapeHtml(siteUrl)}</strong></p>
        </div>

        <h2 style="color: #334155; margin-top: 24px;">What's happening right now</h2>
        <ul style="color: #475569;">
          <li>Provisioning your subdomain at <strong>${escapeHtml(slug)}.${escapeHtml(platformDomain)}</strong></li>
          <li>Deploying your customized template</li>
          <li>Connecting your email and integrations</li>
          <li>Setting up SSL certificates</li>
        </ul>
        
        <p style="color: #475569; margin-top: 16px;"><strong>Expected time:</strong> Your site should be live within 48 hours. We'll send you a follow-up email as soon as it's ready!</p>

        <p style="margin-top: 24px;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background: #0891b2; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Visit your portal
          </a>
        </p>
        <p style="color: #64748b; font-size: 0.875rem; margin-top: 12px;">
          ${portalAccessToken ? 'This link includes your private portal access token. Keep it safe!' : 'You can access your portal anytime with your email and slug.'}
        </p>
        <p style="color: #64748b; font-size: 0.875rem;">Questions? Reply to this email and we'll help.</p>
      </div>
    `,
  })
}

/**
 * Send website live notification when provisioning completes.
 */
export async function sendWebsiteLiveEmail(
  to: string,
  businessName: string,
  slug: string,
  portalAccessToken?: string,
) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://dailyclarity.org'
  const portalUrl = portalAccessToken
    ? `${base.replace(/\/$/, '')}/portal?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(portalAccessToken)}`
    : `${base.replace(/\/$/, '')}/portal?slug=${encodeURIComponent(slug)}`
  const platformDomain =
    process.env.PLATFORM_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    'dailyclarity.org'
  const siteUrl = `https://${slug}.${platformDomain}`

  return sendEmail({
    to,
    subject: `🎉 Your website is live!`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">🎉 Your website is live!</h1>
        <p style="font-size: 1.1rem; color: #334155;">Congratulations, ${escapeHtml(businessName)}! Your website is now live and ready to start attracting clients.</p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #166534;"><strong>Your website is now live at:</strong></p>
          <p style="margin: 8px 0 0 0; color: #059669;"><a href="${siteUrl}" style="color: #059669; font-weight: bold; text-decoration: none; font-size: 1.05rem;">${escapeHtml(siteUrl)}</a></p>
        </div>

        <h2 style="color: #334155; margin-top: 24px;">What you can do now</h2>
        <ul style="color: #475569;">
          <li>📱 View your live website</li>
          <li>✏️ Edit your content anytime in the portal</li>
          <li>📧 Set up custom domain (optional)</li>
          <li>📊 Start tracking contact form submissions</li>
        </ul>

        <p style="margin-top: 24px;">
          <a href="${siteUrl}" style="display: inline-block; padding: 12px 32px; background: #059669; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 12px;">
            View your website
          </a>
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background: #0891b2; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Go to portal
          </a>
        </p>
        
        <p style="color: #64748b; font-size: 0.875rem; margin-top: 16px;">
          Share your website URL with colleagues, add it to your email signature, and start promoting it!
        </p>
        <p style="color: #64748b; font-size: 0.875rem;">Need help? Reply to this email anytime.</p>
      </div>
    `,
  })
}

/**
 * Send the welcome email to a new customer after checkout. (Deprecated - replaced by two-stage emails)
 * Kept for backwards compatibility.
 */
export async function sendWelcomeEmail(
  to: string,
  businessName: string,
  slug: string,
  portalAccessToken?: string,
) {
  // Call the order confirmation email instead
  return sendOrderConfirmationEmail(to, businessName, slug, portalAccessToken)
}

/**
 * Notify the platform owner that a Security + Ads ($80) customer needs the
 * manually delivered premium service (ads + security) kicked off.
 */
export async function sendManualServiceAlert(options: {
  ownerEmail: string
  businessName: string
  slug: string
  customerEmail: string
  plan: string
}) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://dailyclarity.org'
  const portalDeepLink = `${base.replace(/\/$/, '')}/portal?slug=${encodeURIComponent(options.slug)}`

  return sendEmail({
    to: options.ownerEmail,
    subject: `New Security + Ads customer — manual setup needed (${options.businessName})`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Action needed: Security + Ads setup</h2>
        <p style="color: #334155;">A customer just subscribed to the <strong>Security + Ads</strong> tier. Their site is automated, but the done-for-you ad campaign and security hardening are delivered by hand.</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Business</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(options.businessName)}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Slug</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(options.slug)}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Customer email</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${escapeHtml(options.customerEmail)}">${escapeHtml(options.customerEmail)}</a></td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Plan</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(options.plan)}</td></tr>
        </table>
        <p style="margin-top: 16px;"><a href="${portalDeepLink}" style="color: #0891b2;">Open their site in the portal</a></p>
        <p style="color: #64748b; font-size: 0.875rem;">This task was also added to your <code>manual_service_tasks</code> queue.</p>
      </div>
    `,
  })
}

/**
 * Send a notification to the site owner when a visitor submits a contact form.
 */
export async function sendContactNotification(options: {
  ownerEmail: string
  visitorName: string
  visitorEmail: string
  visitorPhone?: string
  message: string
  siteName: string
}) {
  return sendEmail({
    to: options.ownerEmail,
    subject: `New message from ${options.visitorName} — ${options.siteName}`,
    replyTo: options.visitorEmail,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">New contact form submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Name</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(options.visitorName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Email</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
              <a href="mailto:${escapeHtml(options.visitorEmail)}">${escapeHtml(options.visitorEmail)}</a>
            </td>
          </tr>
          ${
            options.visitorPhone
              ? `<tr>
            <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Phone</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(options.visitorPhone)}</td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;" colspan="2">Message</td>
          </tr>
          <tr>
            <td style="padding: 12px; background: #f8fafc;" colspan="2">${escapeHtml(options.message).replace(/\n/g, '<br>')}</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 0.875rem; margin-top: 16px;">
          You can reply directly to this email to respond to ${escapeHtml(options.visitorName)}.
        </p>
      </div>
    `,
  })
}

/**
 * Send a confirmation to the visitor that their message was received.
 */
export async function sendContactConfirmation(options: {
  visitorEmail: string
  visitorName: string
  siteName: string
}) {
  return sendEmail({
    to: options.visitorEmail,
    subject: `We received your message — ${options.siteName}`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Thanks for reaching out, ${escapeHtml(options.visitorName)}!</h2>
        <p>We received your message and will get back to you as soon as possible — typically within one business day.</p>
        <p style="color: #64748b; font-size: 0.875rem;">— The ${escapeHtml(options.siteName)} team</p>
      </div>
    `,
  })
}

/* ---------- helpers ---------- */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

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
 * Send the welcome email to a new customer after checkout.
 */
export async function sendWelcomeEmail(
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
    subject: `Welcome to the platform, ${businessName}!`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e293b;">Welcome aboard, ${escapeHtml(businessName)}!</h1>
        <p>Your subscription is active and we're provisioning your website now.</p>
        <p>Your included address: <a href="${siteUrl}">${escapeHtml(siteUrl)}</a></p>
        <h2 style="color: #334155;">What happens next</h2>
        <ol>
          <li><strong>Your site</strong> — We're deploying your template to <strong>${escapeHtml(slug)}.${escapeHtml(platformDomain)}</strong>.</li>
          <li><strong>Email</strong> — Contact forms on your site can notify you via Postmark.</li>
          <li><strong>Custom domain</strong> — Add your own domain anytime in the portal.</li>
        </ol>
        <p>
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background: #0891b2; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Open your secure portal
          </a>
        </p>
        <p style="color: #64748b; font-size: 0.875rem;">
          ${portalAccessToken ? 'This link includes your private portal access token. Do not share it publicly.' : 'Check your email for your secure portal access link.'}
        </p>
        <p style="color: #64748b; font-size: 0.875rem;">If you have any questions, just reply to this email.</p>
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

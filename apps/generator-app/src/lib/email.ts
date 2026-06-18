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
  niche?: string,
) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://dailyclarity.org'
  const baseClean = base.replace(/\/$/, '')
  const portalUrl = portalAccessToken
    ? `${baseClean}/portal?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(portalAccessToken)}`
    : `${baseClean}/portal?slug=${encodeURIComponent(slug)}`
  const nicheLabel = niche ? ` ${escapeHtml(niche)}` : ''

  return sendEmail({
    to,
    subject: `Your DailyClarity website is being built now`,
    htmlBody: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="padding:28px 40px;background:#ffffff;border-bottom:1px solid #e2e8f0;text-align:center;">
          <img src="https://dailyclarity.org/logo.png" alt="DailyClarity" width="44" height="44" style="display:block;margin:0 auto 10px;border-radius:8px;" />
          <span style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">DailyClarity</span>
        </td>
      </tr>

      <!-- HERO -->
      <tr>
        <td style="padding:48px 40px 44px;background:#0f172a;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">Your website is being built, ${escapeHtml(businessName)}!</h1>
          <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">You'll hear from us within a few minutes when it's live.</p>
        </td>
      </tr>

      <!-- STEPS -->
      <tr>
        <td style="padding:40px;background:#f8fafc;">
          <p style="margin:0 0 24px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">What's happening now</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;height:36px;min-width:36px;background:#0f172a;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#ffffff;">1</td>
                <td style="padding-left:16px;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1e293b;">We're building your site</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Your custom${nicheLabel} website is being assembled now</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;height:36px;min-width:36px;background:#0f172a;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#ffffff;">2</td>
                <td style="padding-left:16px;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1e293b;">You'll get a link</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Check your inbox — we'll email your live site URL and portal access link</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;height:36px;min-width:36px;background:#0f172a;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#ffffff;">3</td>
                <td style="padding-left:16px;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1e293b;">Edit anytime</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Log in to your dashboard at dailyclarity.org/dashboard to make changes</p>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:36px 40px;text-align:center;background:#ffffff;">
          <a href="${portalUrl}" style="display:inline-block;padding:14px 36px;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Go to My Dashboard</a>
          <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Or use your portal direct access link:<br>
            <a href="${portalUrl}" style="color:#10b981;text-decoration:underline;word-break:break-all;">Access My Site Portal &rarr;</a>
          </p>
        </td>
      </tr>

      <!-- DOMAIN TIP -->
      <tr>
        <td style="padding:20px 40px;background:#f0fdf4;border-top:1px solid #d1fae5;border-bottom:1px solid #d1fae5;">
          <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
            <strong>Want a custom domain?</strong> Point your DNS and get a professional address.&nbsp;
            <a href="https://dailyclarity.org/help/custom-domain" style="color:#059669;text-decoration:underline;">Learn how &rarr;</a>
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:28px 40px;background:#f8fafc;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">DailyClarity — Wellness websites for wellness professionals</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">Questions? Reply to this email or visit <a href="https://dailyclarity.org/contact" style="color:#64748b;text-decoration:underline;">dailyclarity.org/contact</a></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`,
  })
}

/**
 * Send website live notification when provisioning completes.
 * @param siteUrlOverride – the actual deployed Netlify URL (e.g. https://amazing-abc.netlify.app)
 */
export async function sendWebsiteLiveEmail(
  to: string,
  businessName: string,
  slug: string,
  portalAccessToken?: string,
  siteUrlOverride?: string,
) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://dailyclarity.org'
  const baseClean = base.replace(/\/$/, '')
  const portalUrl = portalAccessToken
    ? `${baseClean}/portal?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(portalAccessToken)}`
    : `${baseClean}/portal?slug=${encodeURIComponent(slug)}`
  const platformDomain =
    process.env.PLATFORM_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    'dailyclarity.org'
  const siteUrl = siteUrlOverride || `https://${slug}.${platformDomain}`

  return sendEmail({
    to,
    subject: `🎉 Your website is live!`,
    htmlBody: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="padding:28px 40px;background:#ffffff;border-bottom:1px solid #e2e8f0;text-align:center;">
          <img src="https://dailyclarity.org/logo.png" alt="DailyClarity" width="44" height="44" style="display:block;margin:0 auto 10px;border-radius:8px;" />
          <span style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">DailyClarity</span>
        </td>
      </tr>

      <!-- HERO -->
      <tr>
        <td style="padding:48px 40px 44px;background:#0f172a;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">🎉 Your website is live!</h1>
          <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">Congratulations, ${escapeHtml(businessName)}! Your site is ready for the world.</p>
        </td>
      </tr>

      <!-- SITE URL CALLOUT -->
      <tr>
        <td style="padding:32px 40px;background:#f0fdf4;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.08em;">Your live site</p>
          <a href="${escapeHtml(siteUrl)}" style="font-size:17px;font-weight:700;color:#059669;text-decoration:none;word-break:break-all;">${escapeHtml(siteUrl)}</a>
        </td>
      </tr>

      <!-- PRIMARY CTA -->
      <tr>
        <td style="padding:32px 40px 20px;text-align:center;background:#ffffff;">
          <a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:14px 36px;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;margin-bottom:12px;">Visit My Live Site</a>
        </td>
      </tr>

      <!-- SECONDARY CTA -->
      <tr>
        <td style="padding:0 40px 32px;text-align:center;background:#ffffff;">
          <a href="${portalUrl}" style="display:inline-block;padding:12px 28px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">Edit My Site</a>
          <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
            Direct portal link: <a href="${portalUrl}" style="color:#10b981;text-decoration:underline;word-break:break-all;">Access My Site Portal &rarr;</a>
          </p>
        </td>
      </tr>

      <!-- DOMAIN TIP -->
      <tr>
        <td style="padding:20px 40px;background:#f0fdf4;border-top:1px solid #d1fae5;border-bottom:1px solid #d1fae5;">
          <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
            <strong>Want a custom domain?</strong> Point your DNS and get a professional address.&nbsp;
            <a href="https://dailyclarity.org/help/custom-domain" style="color:#059669;text-decoration:underline;">Learn how &rarr;</a>
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:28px 40px;background:#f8fafc;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">DailyClarity — Wellness websites for wellness professionals</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">Questions? Reply to this email or visit <a href="https://dailyclarity.org/contact" style="color:#64748b;text-decoration:underline;">dailyclarity.org/contact</a></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`,
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

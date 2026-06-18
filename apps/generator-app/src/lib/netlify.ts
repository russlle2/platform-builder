/**
 * Netlify Site Provisioning Service
 *
 * Automates:
 *  1. Creating a Netlify site with a subdomain (slug.yourdomain.com)
 *  2. Deploying client site files to it
 *  3. Adding custom domains
 *  4. Provisioning SSL certificates (automatic via Netlify)
 *
 * Required env vars:
 *   NETLIFY_ACCESS_TOKEN        – personal access token from Netlify
 *   NETLIFY_TEAM_SLUG           – your Netlify team slug (account slug)
 *   PLATFORM_DOMAIN             – your root domain, e.g. "myplatform.com"
 *   NETLIFY_TEMPLATE_SITE_ID    – (optional) site ID of a deployed client-template
 *                                  used as a deploy source
 */

const NETLIFY_API = 'https://api.netlify.com/api/v1'

interface NetlifySite {
  id: string
  name: string
  ssl_url: string
  url: string
  custom_domain: string | null
  default_domain: string
  admin_url: string
}

interface ProvisionResult {
  siteId: string
  subdomain: string
  siteUrl: string
  adminUrl: string
}

function getToken(): string {
  const token = process.env.NETLIFY_ACCESS_TOKEN
  if (!token) throw new Error('NETLIFY_ACCESS_TOKEN is not configured.')
  return token
}

function getDomain(): string {
  return process.env.PLATFORM_DOMAIN || 'yourdomain.com'
}

async function netlifyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(`${NETLIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/* ------------------------------------------------------------------ */
/*  1.  Create a new Netlify site with subdomain                       */
/* ------------------------------------------------------------------ */

/**
 * Creates a Netlify site configured as `slug.yourdomain.com`.
 *
 * The subdomain is achieved via:
 *  - custom_domain set to `slug.platformdomain.com`
 *  - You'll add a wildcard DNS record: *.platformdomain.com → Netlify
 *    (or individual CNAME records per slug)
 */
export async function provisionSite(slug: string): Promise<ProvisionResult> {
  const domain = getDomain()
  const subdomain = `${slug}.${domain}`
  const teamSlug = process.env.NETLIFY_TEAM_SLUG

  const body: Record<string, unknown> = {
    name: `platform-${slug}`,
    custom_domain: subdomain,
  }

  const endpoint = teamSlug
    ? `/${teamSlug}/sites`
    : '/sites'

  const response = await netlifyFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Netlify site creation failed (${response.status}): ${errBody}`)
  }

  const site: NetlifySite = await response.json()

  return {
    siteId: site.id,
    subdomain,
    siteUrl: site.ssl_url || site.url,
    adminUrl: site.admin_url,
  }
}

/* ------------------------------------------------------------------ */
/*  2.  Deploy files to a Netlify site (direct file upload)            */
/* ------------------------------------------------------------------ */

import crypto from 'crypto'

/**
 * Deploy a set of files directly to a Netlify site using the
 * file-digest deploy API. No git repo or build hook required.
 *
 * @param siteId  – Netlify site ID
 * @param files   – Map of path → content, e.g. { "index.html": "<html>...", "about.html": "..." }
 * @returns       – The deploy ID and URL
 */
export async function deploySiteFiles(
  siteId: string,
  files: Record<string, string>,
): Promise<{ deployId: string; deployUrl: string }> {
  const token = getToken()

  // Step 1: Calculate SHA1 digests for each file
  const fileDigests: Record<string, string> = {}
  const digestToPath: Record<string, string> = {}
  const digestToContent: Record<string, string> = {}

  for (const [filePath, content] of Object.entries(files)) {
    const sha1 = crypto.createHash('sha1').update(content).digest('hex')
    const normalizedPath = '/' + filePath.replace(/^\/+/, '')
    fileDigests[normalizedPath] = sha1
    digestToPath[sha1] = normalizedPath
    digestToContent[sha1] = content
  }

  // Step 2: Create a deploy with file digests
  const deployRes = await netlifyFetch(`/sites/${siteId}/deploys`, {
    method: 'POST',
    body: JSON.stringify({
      files: fileDigests,
    }),
  })

  if (!deployRes.ok) {
    const errBody = await deployRes.text()
    throw new Error(`Netlify deploy creation failed (${deployRes.status}): ${errBody}`)
  }

  const deploy = await deployRes.json()
  const deployId = deploy.id as string
  const required: string[] = deploy.required || []

  // Step 3: Upload any files Netlify needs (ones it doesn't already have)
  for (const sha1 of required) {
    const content = digestToContent[sha1]
    if (!content) continue

    const uploadRes = await fetch(`${NETLIFY_API}/deploys/${deployId}/files${digestToPath[sha1]}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    })

    if (!uploadRes.ok) {
      console.error(`Failed to upload file ${digestToPath[sha1]}: ${uploadRes.status}`)
    }
  }

  return {
    deployId,
    deployUrl: deploy.ssl_url || deploy.url || `https://${deploy.subdomain}.netlify.app`,
  }
}

/**
 * Triggers a new deploy on an existing Netlify site.
 * Uses the deploy-from-repo approach (a build hook) or direct file deploy.
 *
 * For simplicity, we create a build hook and trigger it.
 */
export async function triggerDeploy(siteId: string): Promise<{ deployId: string }> {
  // Create a build hook if one doesn't exist
  const hookRes = await netlifyFetch(`/sites/${siteId}/build_hooks`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'platform-auto-deploy',
      branch: 'main',
    }),
  })

  if (!hookRes.ok) {
    throw new Error(`Failed to create build hook: ${await hookRes.text()}`)
  }

  const hook = await hookRes.json()

  // Trigger the build
  const triggerRes = await fetch(hook.url, { method: 'POST' })
  if (!triggerRes.ok) {
    throw new Error(`Failed to trigger deploy: ${triggerRes.status}`)
  }

  return { deployId: hook.id }
}

/* ------------------------------------------------------------------ */
/*  3.  Add / set custom domain on an existing site                   */
/* ------------------------------------------------------------------ */

/**
 * Configure a custom domain on a Netlify site.
 *
 * The customer points their DNS (CNAME or A record) to Netlify,
 * and this tells Netlify to accept traffic for that domain.
 *
 * SSL is provisioned automatically by Netlify (Let's Encrypt).
 */
export async function setCustomDomain(
  siteId: string,
  customDomain: string
): Promise<{ domain: string; sslUrl: string }> {
  // Update the site's custom domain
  const response = await netlifyFetch(`/sites/${siteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ custom_domain: customDomain }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Failed to set custom domain (${response.status}): ${errBody}`)
  }

  const site: NetlifySite = await response.json()

  // Provision SSL via Netlify
  await netlifyFetch(`/sites/${siteId}/ssl`, {
    method: 'POST',
    body: JSON.stringify({ certificate: '', key: '', ca_certificates: '' }),
  }).catch(() => {
    // SSL provisioning may already be in progress — Netlify handles this automatically
  })

  return {
    domain: customDomain,
    sslUrl: site.ssl_url || `https://${customDomain}`,
  }
}

/* ------------------------------------------------------------------ */
/*  4.  Get DNS instructions for a custom domain                      */
/* ------------------------------------------------------------------ */

export function getCustomDomainInstructions(customDomain: string, siteSubdomain: string): string {
  return [
    `To point "${customDomain}" to your site:`,
    '',
    'Option A — CNAME record (recommended for subdomains like www):',
    `  Type:  CNAME`,
    `  Name:  ${customDomain.startsWith('www.') ? 'www' : customDomain.split('.')[0]}`,
    `  Value: ${siteSubdomain}`,
    '',
    'Option B — A record + ALIAS (for apex/root domains):',
    `  Type:  A`,
    `  Name:  @`,
    `  Value: 75.2.60.5  (Netlify load balancer)`,
    '',
    'After DNS propagates (usually 5-30 minutes), Netlify will automatically',
    'provision a free SSL certificate via Let\'s Encrypt.',
    '',
    'You can verify the status in your Netlify dashboard:',
    '  Site Settings → Domain Management → HTTPS',
  ].join('\n')
}

export interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT'
  name: string
  value: string
  ttl?: string
  purpose: string
}

export function getDomainDnsRecords(
  customDomain: string,
  netlifyUrl: string,
): {
  records: DnsRecord[]
  isApexDomain: boolean
  hasWww: boolean
  warnings: string[]
} {
  // Extract the bare hostname from the Netlify URL so we always emit a valid
  // CNAME target (e.g. "amazing-abc.netlify.app" rather than the full https:// URL
  // or the platform subdomain like "mysite.dailyclarity.org").
  let netlifyHostname: string
  try {
    netlifyHostname = new URL(netlifyUrl).hostname
  } catch {
    // Already a bare hostname or fallback value — use as-is
    netlifyHostname = netlifyUrl
  }

  const isApex = !customDomain.startsWith('www.')
  const records: DnsRecord[] = []

  if (customDomain.startsWith('www.') || !isApex) {
    records.push({
      type: 'CNAME',
      name: 'www',
      value: netlifyHostname,
      ttl: '3600',
      purpose: 'Points www subdomain to your DailyClarity site',
    })
  }

  if (isApex) {
    records.push({
      type: 'A',
      name: '@',
      value: '75.2.60.5',
      ttl: '3600',
      purpose: 'Points root domain to Netlify load balancer',
    })
    records.push({
      type: 'CNAME',
      name: 'www',
      value: netlifyHostname,
      ttl: '3600',
      purpose: 'Optional: also add www redirect',
    })
  }

  return {
    records,
    isApexDomain: isApex,
    hasWww: customDomain.startsWith('www.'),
    warnings: isApex
      ? [
          'For root/apex domains, use an A record pointing to 75.2.60.5',
          'If using Cloudflare, disable the orange proxy cloud during initial setup',
        ]
      : [],
  }
}

/* ------------------------------------------------------------------ */
/*  5.  Check certificate / SSL status                                */
/* ------------------------------------------------------------------ */

export async function checkSslStatus(siteId: string): Promise<{
  state: string
  domains: string[]
  expiresAt: string | null
}> {
  const response = await netlifyFetch(`/sites/${siteId}/ssl`)

  if (!response.ok) {
    return { state: 'unknown', domains: [], expiresAt: null }
  }

  const ssl = await response.json()
  return {
    state: ssl.state || 'unknown',
    domains: ssl.domains || [],
    expiresAt: ssl.expires_at || null,
  }
}

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
  domain_aliases?: string[]
  default_domain: string
  admin_url: string
}

interface ProvisionResult {
  siteId: string
  subdomain: string
  siteUrl: string
  defaultDomain: string
  adminUrl: string
}

function getToken(): string {
  const token = process.env.NETLIFY_ACCESS_TOKEN
  if (!token) throw new Error('NETLIFY_ACCESS_TOKEN is not configured.')
  return token
}

function getDomain(): string {
  const domain = process.env.PLATFORM_DOMAIN?.trim().toLowerCase()
  if (!domain) throw new Error('PLATFORM_DOMAIN is not configured.')
  return domain
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
    signal: options.signal || AbortSignal.timeout(20_000),
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
  const siteName = `platform-${slug}`
  const teamSlug = process.env.NETLIFY_TEAM_SLUG

  // The deterministic Netlify hostname closes the crash window between site
  // creation and our database checkpoint: a retry discovers and reuses the
  // already-created external resource instead of orphaning a second site.
  const existingResponse = await netlifyFetch(`/sites/${encodeURIComponent(`${siteName}.netlify.app`)}`)
  if (existingResponse.ok) {
    const existing: NetlifySite = await existingResponse.json()
    const boundDomains = new Set([
      existing.custom_domain,
      ...(existing.domain_aliases || []),
    ].filter((value): value is string => Boolean(value)))
    if (existing.name !== siteName || !boundDomains.has(subdomain)) {
      throw new Error('The deterministic Netlify site name is already bound to another domain.')
    }
    return {
      siteId: existing.id,
      subdomain,
      siteUrl: `https://${subdomain}`,
      defaultDomain: existing.default_domain || `${siteName}.netlify.app`,
      adminUrl: existing.admin_url,
    }
  }
  if (existingResponse.status !== 404) {
    throw new Error(`Netlify site lookup failed (${existingResponse.status}).`)
  }

  const body: Record<string, unknown> = {
    name: siteName,
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
    // `ssl_url` is commonly the Netlify-owned fallback hostname. The product
    // promises the branded wildcard hostname, so canonical metadata, customer
    // email, and the portal must all use that URL and wait for its TLS endpoint.
    siteUrl: `https://${subdomain}`,
    defaultDomain: site.default_domain || `${siteName}.netlify.app`,
    adminUrl: site.admin_url,
  }
}

/** Delete a staging/test customer site. Callers must enforce their own scope boundary. */
export async function deleteSite(siteId: string): Promise<void> {
  if (!/^[A-Za-z0-9-]{3,100}$/.test(siteId)) throw new Error('Invalid Netlify site ID.')
  const response = await netlifyFetch(`/sites/${encodeURIComponent(siteId)}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Netlify site deletion failed (${response.status}): ${await response.text()}`)
  }
}

/* ------------------------------------------------------------------ */
/*  2.  Deploy files to a Netlify site (direct file upload)            */
/* ------------------------------------------------------------------ */

import crypto from 'crypto'
import { parse as parseDomain } from 'tldts'

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
  files: Record<string, string | Buffer>,
): Promise<{ deployId: string; deployUrl: string }> {
  const token = getToken()

  // Step 1: Calculate SHA1 digests for each file
  const fileDigests: Record<string, string> = {}
  const digestToPath: Record<string, string> = {}
  const digestToContent: Record<string, string | Buffer> = {}

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
    if (content === undefined) {
      throw new Error(`Netlify requested an unknown file digest: ${sha1}`)
    }

    const encodedPath = digestToPath[sha1]
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')

    const uploadRes = await fetch(`${NETLIFY_API}/deploys/${deployId}/files${encodedPath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: typeof content === 'string' ? content : Uint8Array.from(content).buffer,
      signal: AbortSignal.timeout(30_000),
    })

    if (!uploadRes.ok) {
      const detail = await uploadRes.text()
      throw new Error(
        `Netlify file upload failed for ${digestToPath[sha1]} (${uploadRes.status}): ${detail}`,
      )
    }
  }

  // A successful PUT means Netlify has the bytes, not necessarily that the
  // atomic deploy is live. Wait for the documented `ready` state and fail the
  // fulfillment attempt on terminal/timeout states so Stripe can retry.
  let deployState = String(deploy.state || '')
  for (let attempt = 0; deployState !== 'ready' && attempt < 20; attempt++) {
    if (deployState === 'error' || deployState === 'rejected') {
      throw new Error(`Netlify deploy ${deployId} entered terminal state: ${deployState}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    const statusResponse = await netlifyFetch(`/deploys/${deployId}`)
    if (!statusResponse.ok) {
      throw new Error(`Netlify deploy status failed (${statusResponse.status})`)
    }
    const status = await statusResponse.json()
    deployState = String(status.state || '')
  }
  if (deployState !== 'ready') {
    throw new Error(`Netlify deploy ${deployId} was not ready before the verification timeout.`)
  }

  return {
    deployId,
    deployUrl: deploy.ssl_url || deploy.url || `https://${deploy.subdomain}.netlify.app`,
  }
}

export interface PublishedSiteVerificationOptions {
  attempts?: number
  delayMs?: number
  timeoutMs?: number
  cacheKey?: string
}

/**
 * Verify the exact customer-facing HTTPS hostname after Netlify reports the
 * deploy ready. This catches wildcard-DNS, certificate, and edge-publication
 * failures before a site is marked active or announced to the customer.
 */
export async function verifyPublishedSite(
  siteUrl: string,
  options: PublishedSiteVerificationOptions = {},
): Promise<void> {
  const target = new URL(siteUrl)
  if (target.protocol !== 'https:' || target.username || target.password) {
    throw new Error('Published site verification requires a credential-free HTTPS URL.')
  }

  const attempts = Math.max(1, Math.min(60, Math.floor(options.attempts ?? 18)))
  const delayMs = Math.max(0, Math.min(30_000, Math.floor(options.delayMs ?? 5_000)))
  const timeoutMs = Math.max(1_000, Math.min(30_000, Math.floor(options.timeoutMs ?? 10_000)))
  if (options.cacheKey) target.searchParams.set('__dc_verify', options.cacheKey.slice(0, 128))

  let lastFailure = 'unknown response'
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(target, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        headers: { accept: 'text/html' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.ok) {
        const html = await response.text()
        if (/<!doctype\s+html|<html[\s>]/i.test(html)) return
        lastFailure = `HTTP ${response.status} returned non-HTML content`
      } else {
        lastFailure = `HTTP ${response.status}`
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : 'network failure'
    }

    if (attempt < attempts && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw new Error(
    `Published site did not become reachable over HTTPS after ${attempts} attempts (${lastFailure}).`,
  )
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
  const triggerRes = await fetch(hook.url, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
  })
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
  customDomain: string,
  retainedAliases: readonly string[] = [],
): Promise<{ domain: string; sslUrl: string }> {
  // `domain_aliases` is replaced as a complete set. Deliberately do not carry
  // forward Netlify's current aliases: a prior customer domain must be
  // detached when the customer switches domains, otherwise the database can
  // release that hostname while Netlify still routes it to the old site.
  const domainAliases = [...new Set([
    ...retainedAliases,
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value) && value !== customDomain))]

  // Promote the customer domain while explicitly retaining the branded
  // DailyClarity hostname as an alias. The Netlify-owned default domain remains
  // the stable DNS target and is never replaced.
  const response = await netlifyFetch(`/sites/${siteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ custom_domain: customDomain, domain_aliases: domainAliases }),
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

function domainDnsShape(customDomain: string): {
  isApex: boolean
  recordName: string
} {
  const normalized = customDomain.toLowerCase().replace(/\.$/, '')
  const parsed = parseDomain(normalized)
  const isApex = Boolean(parsed.domain && parsed.domain === normalized)
  const recordName = !isApex && parsed.domain && normalized.endsWith(`.${parsed.domain}`)
    ? normalized.slice(0, -(parsed.domain.length + 1))
    : '@'
  return { isApex, recordName }
}

export function isApexCustomDomain(customDomain: string): boolean {
  return domainDnsShape(customDomain).isApex
}

function hostnameFromUrlOrHost(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return value.replace(/^\/+|\/+$/g, '')
  }
}

export function getCustomDomainInstructions(customDomain: string, siteSubdomain: string): string {
  const { isApex, recordName } = domainDnsShape(customDomain)
  const target = hostnameFromUrlOrHost(siteSubdomain)
  const recordLines = isApex
    ? [
        'Add this record for the root domain:',
        '  Type:  A',
        '  Name:  @',
        '  Value: 75.2.60.5  (Netlify load balancer)',
      ]
    : [
        'Add this record for the subdomain:',
        '  Type:  CNAME',
        `  Name:  ${recordName}`,
        `  Value: ${target}`,
      ]
  return [
    `To point "${customDomain}" to your site:`,
    '',
    ...recordLines,
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
  const netlifyHostname = hostnameFromUrlOrHost(netlifyUrl)
  const { isApex, recordName } = domainDnsShape(customDomain)
  const records: DnsRecord[] = []

  if (!isApex) {
    records.push({
      type: 'CNAME',
      name: recordName,
      value: netlifyHostname,
      ttl: '3600',
      purpose: `Points ${customDomain} to your DailyClarity site`,
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

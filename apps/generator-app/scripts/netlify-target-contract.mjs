export const PRODUCTION_NETLIFY_SITE_ID = '4a98d266-bb9f-44ab-bf27-30597d741705'

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Fail closed unless the authenticated Netlify response is the exact site,
 * account, and hostname approved for this protected GitHub environment.
 */
export function assertNetlifyTarget(site, config) {
  const environment = normalized(config.environment)
  const configuredSiteId = normalized(config.configuredSiteId)
  const expectedSiteId = normalized(config.expectedSiteId)
  const expectedHostname = normalized(config.expectedHostname)
  const expectedAccountSlug = normalized(config.expectedAccountSlug)

  if (!['staging', 'production'].includes(environment)) {
    throw new Error('Netlify target environment must be staging or production.')
  }
  if (!configuredSiteId || !expectedSiteId || !expectedHostname || !expectedAccountSlug) {
    throw new Error('Netlify target identity configuration is incomplete.')
  }
  if (configuredSiteId !== expectedSiteId || normalized(site?.id) !== expectedSiteId) {
    throw new Error('Netlify site ID does not match the protected environment identity.')
  }
  if (environment === 'production' && expectedSiteId !== PRODUCTION_NETLIFY_SITE_ID) {
    throw new Error('Production is pinned to the reviewed DailyClarity Netlify site.')
  }
  if (environment === 'staging' && expectedSiteId === PRODUCTION_NETLIFY_SITE_ID) {
    throw new Error('Staging may not target the production DailyClarity Netlify site.')
  }

  const boundHostnames = new Set([
    site?.default_domain,
    site?.custom_domain,
    normalized(site?.name) ? `${normalized(site.name)}.netlify.app` : '',
    hostnameFromUrl(site?.url),
    hostnameFromUrl(site?.ssl_url),
    ...(Array.isArray(site?.domain_aliases) ? site.domain_aliases : []),
  ].map(normalized).filter(Boolean))
  if (!boundHostnames.has(expectedHostname)) {
    throw new Error('Netlify hostname does not match the protected environment identity.')
  }
  if (normalized(site?.account_slug) !== expectedAccountSlug) {
    throw new Error('Netlify account does not match the protected environment identity.')
  }
}

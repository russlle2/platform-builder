export const PRODUCTION_NETLIFY_SITE_ID = '4a98d266-bb9f-44ab-bf27-30597d741705'
const PRODUCTION_HOSTNAMES = new Set(['dailyclarity.org', 'www.dailyclarity.org'])

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

function normalizedUrl(value) {
  try {
    const url = new URL(value)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    return ''
  }
}

function contextValue(variable, context) {
  const values = Array.isArray(variable?.values) ? variable.values : []
  const exact = values.find((entry) => normalized(entry?.context) === context)
  const fallback = values.find((entry) => normalized(entry?.context) === 'all')
  return (exact ?? fallback)?.value?.trim() || ''
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
  if (
    environment === 'staging' &&
    [...boundHostnames].some((hostname) => PRODUCTION_HOSTNAMES.has(hostname))
  ) {
    throw new Error('Staging may not bind a production DailyClarity hostname.')
  }
  if (normalized(site?.account_slug) !== expectedAccountSlug) {
    throw new Error('Netlify account does not match the protected environment identity.')
  }

}

/**
 * Prove that the exact Netlify site is configured for the same database that
 * passed the GitHub schema gate. Identity values are deliberately non-secret;
 * runtime credentials remain secret and are proved by the post-deploy probe.
 */
export function assertNetlifyRuntimeEnvironment(environmentVariables, config) {
  if (!Array.isArray(environmentVariables)) {
    throw new Error('Netlify environment response is invalid.')
  }

  const context = normalized(config.context) || 'production'
  const expectedUrl = normalizedUrl(config.expectedSupabaseUrl)
  const expectedRef = normalized(config.expectedSupabaseProjectRef)
  const expectedDeploymentEnvironment = normalized(config.expectedDeploymentEnvironment)
  if (!expectedUrl || !expectedRef) {
    throw new Error('Expected Netlify Supabase identity is incomplete.')
  }
  if (!['staging', 'production'].includes(expectedDeploymentEnvironment)) {
    throw new Error('Expected Netlify deployment environment is incomplete.')
  }

  const required = new Map([
    ['NEXT_PUBLIC_SUPABASE_URL', expectedUrl],
    ['DAILYCLARITY_SUPABASE_PROJECT_REF', expectedRef],
  ])
  for (const [key, expected] of required) {
    const variable = environmentVariables.find((entry) => entry?.key === key)
    if (!variable) throw new Error(`Netlify site is missing ${key}.`)
    if (variable.is_secret) {
      throw new Error(`${key} must remain readable as a non-secret deployment identity.`)
    }
    const scopes = new Set(Array.isArray(variable.scopes) ? variable.scopes : [])
    if (!scopes.has('builds') || !scopes.has('functions')) {
      throw new Error(`${key} must be available to Netlify builds and functions.`)
    }
    const actual = key === 'NEXT_PUBLIC_SUPABASE_URL'
      ? normalizedUrl(contextValue(variable, context))
      : normalized(contextValue(variable, context))
    if (actual !== expected) {
      throw new Error(`Netlify ${key} does not match the protected database identity.`)
    }
  }

  const deploymentEnvironment = environmentVariables.find(
    (entry) => entry?.key === 'DAILYCLARITY_ENVIRONMENT',
  )
  if (!deploymentEnvironment || deploymentEnvironment.is_secret) {
    throw new Error('Netlify DAILYCLARITY_ENVIRONMENT must be a readable deployment identity.')
  }
  const deploymentScopes = new Set(
    Array.isArray(deploymentEnvironment.scopes) ? deploymentEnvironment.scopes : [],
  )
  if (!deploymentScopes.has('builds') || !deploymentScopes.has('functions')) {
    throw new Error('DAILYCLARITY_ENVIRONMENT must be available to Netlify builds and functions.')
  }
  if (normalized(contextValue(deploymentEnvironment, context)) !== expectedDeploymentEnvironment) {
    throw new Error('Netlify DAILYCLARITY_ENVIRONMENT does not match the protected environment.')
  }

  const serviceRole = environmentVariables.find(
    (entry) => entry?.key === 'SUPABASE_SERVICE_ROLE_KEY',
  )
  if (!serviceRole?.is_secret) {
    throw new Error('Netlify SUPABASE_SERVICE_ROLE_KEY must exist and be marked secret.')
  }
  const serviceScopes = new Set(
    Array.isArray(serviceRole.scopes) ? serviceRole.scopes : [],
  )
  if (!serviceScopes.has('functions')) {
    throw new Error('Netlify SUPABASE_SERVICE_ROLE_KEY must be available to functions.')
  }
}

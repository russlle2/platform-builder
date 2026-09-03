#!/usr/bin/env node

import {
  assertNetlifyRuntimeEnvironment,
  assertNetlifyTarget,
} from './netlify-target-contract.mjs'

const token = process.env.NETLIFY_AUTH_TOKEN?.trim()
const siteId = process.env.NETLIFY_SITE_ID?.trim()
if (!token || !siteId) throw new Error('Netlify API credentials are incomplete.')

const response = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}`, {
  headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  signal: AbortSignal.timeout(15_000),
})
if (!response.ok) {
  throw new Error(`Netlify target verification failed (${response.status}).`)
}

const site = await response.json()
assertNetlifyTarget(site, {
  environment: process.env.DEPLOY_ENVIRONMENT,
  configuredSiteId: siteId,
  expectedSiteId: process.env.NETLIFY_EXPECTED_SITE_ID,
  expectedHostname: process.env.NETLIFY_EXPECTED_SITE_HOSTNAME,
  expectedAccountSlug: process.env.NETLIFY_EXPECTED_ACCOUNT_SLUG,
})

const accountSlug = site?.account_slug?.trim()
if (!accountSlug) throw new Error('Authenticated Netlify site has no account identity.')
const envResponse = await fetch(
  `https://api.netlify.com/api/v1/accounts/${encodeURIComponent(accountSlug)}/env?site_id=${encodeURIComponent(siteId)}&context_name=production`,
  {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  },
)
if (!envResponse.ok) {
  throw new Error(`Netlify runtime environment verification failed (${envResponse.status}).`)
}
assertNetlifyRuntimeEnvironment(await envResponse.json(), {
  context: 'production',
  expectedSupabaseUrl: process.env.NETLIFY_EXPECTED_SUPABASE_URL,
  expectedSupabaseProjectRef: process.env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF,
})

console.log(
  `[deploy-gate] Verified the ${process.env.DEPLOY_ENVIRONMENT} Netlify site and database binding.`,
)

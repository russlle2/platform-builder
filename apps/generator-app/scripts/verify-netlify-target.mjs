#!/usr/bin/env node

import { assertNetlifyTarget } from './netlify-target-contract.mjs'

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

assertNetlifyTarget(await response.json(), {
  environment: process.env.DEPLOY_ENVIRONMENT,
  configuredSiteId: siteId,
  expectedSiteId: process.env.NETLIFY_EXPECTED_SITE_ID,
  expectedHostname: process.env.NETLIFY_EXPECTED_SITE_HOSTNAME,
  expectedAccountSlug: process.env.NETLIFY_EXPECTED_ACCOUNT_SLUG,
})
console.log(`[deploy-gate] Verified the ${process.env.DEPLOY_ENVIRONMENT} Netlify site identity.`)

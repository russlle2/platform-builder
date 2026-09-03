#!/usr/bin/env node

const hostname = process.env.NETLIFY_EXPECTED_SITE_HOSTNAME?.trim().toLowerCase()
const expectedSiteId = process.env.NETLIFY_EXPECTED_SITE_ID?.trim().toLowerCase()
const expectedProjectRef = process.env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF?.trim().toLowerCase()
const expectedReleaseSha = process.env.NETLIFY_EXPECTED_RELEASE_SHA?.trim().toLowerCase()
const adminToken = process.env.INTERNAL_ADMIN_TOKEN?.trim()

if (!hostname || !expectedSiteId || !expectedProjectRef || !expectedReleaseSha || !adminToken) {
  throw new Error('Deployed-runtime attestation configuration is incomplete.')
}

const origin = `https://${hostname}`
const response = await fetch(`${origin}/api/integrations/status`, {
  headers: {
    authorization: `Bearer ${adminToken}`,
    accept: 'application/json',
  },
  cache: 'no-store',
  signal: AbortSignal.timeout(20_000),
})
if (!response.ok) {
  throw new Error(`Deployed runtime attestation failed (${response.status}).`)
}

const readiness = await response.json()
if (readiness?.deploymentSiteId?.trim().toLowerCase() !== expectedSiteId) {
  throw new Error('Deployed runtime is not executing on the expected Netlify site.')
}
if (readiness?.supabaseProjectRef?.trim().toLowerCase() !== expectedProjectRef) {
  throw new Error('Deployed runtime is not connected to the schema-gated Supabase project.')
}
if (readiness?.supabaseSchemaVersion !== '20260903.3' || readiness?.supabaseSchemaReady !== true) {
  throw new Error('Deployed runtime could not execute the required Supabase schema sentinel.')
}
if (readiness?.deploymentReleaseSha?.trim().toLowerCase() !== expectedReleaseSha) {
  throw new Error('Deployed runtime does not contain the reviewed release SHA.')
}

console.log(
  `[runtime-gate] Verified Netlify site ${expectedSiteId} against Supabase ${expectedProjectRef} at schema ${readiness.supabaseSchemaVersion}.`,
)

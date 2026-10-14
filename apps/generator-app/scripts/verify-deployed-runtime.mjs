#!/usr/bin/env node
import { assertDeployedRuntime } from './deployed-runtime-contract.mjs'

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
assertDeployedRuntime(readiness, { siteId: expectedSiteId, projectRef: expectedProjectRef, releaseSha: expectedReleaseSha,
  catalogProfile: process.env.NETLIFY_EXPECTED_CATALOG_PROFILE, catalogHash: process.env.NETLIFY_EXPECTED_CATALOG_HASH,
  manifestHash: process.env.NETLIFY_EXPECTED_MANIFEST_HASH, certificationHash: process.env.NETLIFY_EXPECTED_CERTIFICATION_HASH })

console.log(
  `[runtime-gate] Verified Netlify site ${expectedSiteId} against Supabase ${expectedProjectRef} at schema ${readiness.supabaseSchemaVersion}.`,
)

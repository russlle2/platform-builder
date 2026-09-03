#!/usr/bin/env node

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const expectedRef = process.env.DAILYCLARITY_SUPABASE_PROJECT_REF?.trim().toLowerCase()

if (!url || !serviceKey || !expectedRef) {
  throw new Error('Supabase schema verification configuration is incomplete.')
}

let actualRef
try {
  actualRef = new URL(url).hostname.toLowerCase().match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1]
} catch {
  actualRef = null
}
if (!actualRef || actualRef !== expectedRef) {
  throw new Error('Supabase project reference does not match the deployment safety pin.')
}

const response = await fetch(`${url}/rest/v1/rpc/launch_schema_readiness`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
  },
  body: '{}',
  signal: AbortSignal.timeout(15_000),
})
if (!response.ok) {
  throw new Error(`Launch schema sentinel failed (${response.status}). Apply and verify all migrations first.`)
}
const readiness = await response.json()
if (readiness?.schemaVersion !== '20260903.2' || readiness?.ready !== true) {
  throw new Error('Launch schema sentinel reported an incompatible or incomplete database.')
}
console.log(`[schema-gate] Supabase ${actualRef} is ready at schema ${readiness.schemaVersion}.`)

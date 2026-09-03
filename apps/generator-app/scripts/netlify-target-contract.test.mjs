import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRODUCTION_NETLIFY_SITE_ID,
  assertNetlifyRuntimeEnvironment,
  assertNetlifyTarget,
} from './netlify-target-contract.mjs'

const productionSite = {
  id: PRODUCTION_NETLIFY_SITE_ID,
  account_slug: 'christopherlake96',
  default_domain: 'keen-buttercream-c3c10a.netlify.app',
  custom_domain: 'dailyclarity.org',
  domain_aliases: ['www.dailyclarity.org'],
}

test('accepts only the pinned production site identity', () => {
  assert.doesNotThrow(() => assertNetlifyTarget(productionSite, {
    environment: 'production',
    configuredSiteId: PRODUCTION_NETLIFY_SITE_ID,
    expectedSiteId: PRODUCTION_NETLIFY_SITE_ID,
    expectedHostname: 'dailyclarity.org',
    expectedAccountSlug: 'christopherlake96',
  }))
})

test('staging cannot target production even when all environment secrets are crossed', () => {
  assert.throws(() => assertNetlifyTarget(productionSite, {
    environment: 'staging',
    configuredSiteId: PRODUCTION_NETLIFY_SITE_ID,
    expectedSiteId: PRODUCTION_NETLIFY_SITE_ID,
    expectedHostname: 'dailyclarity.org',
    expectedAccountSlug: 'christopherlake96',
  }), /Staging may not target/)
})

test('accepts a separate staging site using its authenticated Netlify URL', () => {
  assert.doesNotThrow(() => assertNetlifyTarget({
    id: 'staging-site-id',
    name: 'dailyclarity-staging',
    ssl_url: 'https://dailyclarity-staging.netlify.app',
    account_slug: 'christopherlake96',
  }, {
    environment: 'staging',
    configuredSiteId: 'staging-site-id',
    expectedSiteId: 'staging-site-id',
    expectedHostname: 'dailyclarity-staging.netlify.app',
    expectedAccountSlug: 'christopherlake96',
  }))
})

test('rejects site, hostname, and account mismatches', () => {
  const base = {
    environment: 'staging',
    configuredSiteId: 'staging-site-id',
    expectedSiteId: 'staging-site-id',
    expectedHostname: 'staging.example.netlify.app',
    expectedAccountSlug: 'christopherlake96',
  }
  assert.throws(() => assertNetlifyTarget({ ...productionSite, id: 'other' }, base), /site ID/)
  assert.throws(() => assertNetlifyTarget({
    ...productionSite,
    id: 'staging-site-id',
  }, base), /hostname/)
  assert.throws(() => assertNetlifyTarget({
    ...productionSite,
    id: 'staging-site-id',
    default_domain: 'staging.example.netlify.app',
    account_slug: 'another-account',
  }, base), /account/)
})

const runtimeEnvironment = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    scopes: ['builds', 'functions'],
    values: [{ context: 'all', value: 'https://stagingref.supabase.co/' }],
    is_secret: false,
  },
  {
    key: 'DAILYCLARITY_SUPABASE_PROJECT_REF',
    scopes: ['builds', 'functions'],
    values: [
      { context: 'all', value: 'wrong' },
      { context: 'production', value: 'stagingref' },
    ],
    is_secret: false,
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    scopes: ['functions'],
    values: [{ context: 'production', value: '' }],
    is_secret: true,
  },
]

test('binds Netlify build and function scopes to the schema-gated database', () => {
  assert.doesNotThrow(() => assertNetlifyRuntimeEnvironment(runtimeEnvironment, {
    context: 'production',
    expectedSupabaseUrl: 'https://stagingref.supabase.co',
    expectedSupabaseProjectRef: 'stagingref',
  }))
})

test('rejects crossed, hidden, under-scoped, or unprotected Netlify database values', () => {
  const config = {
    context: 'production',
    expectedSupabaseUrl: 'https://stagingref.supabase.co',
    expectedSupabaseProjectRef: 'stagingref',
  }
  assert.throws(() => assertNetlifyRuntimeEnvironment(
    runtimeEnvironment.map((entry) => entry.key === 'NEXT_PUBLIC_SUPABASE_URL'
      ? { ...entry, values: [{ context: 'all', value: 'https://production.supabase.co' }] }
      : entry),
    config,
  ), /does not match/)
  assert.throws(() => assertNetlifyRuntimeEnvironment(
    runtimeEnvironment.map((entry) => entry.key === 'NEXT_PUBLIC_SUPABASE_URL'
      ? { ...entry, is_secret: true }
      : entry),
    config,
  ), /non-secret deployment identity/)
  assert.throws(() => assertNetlifyRuntimeEnvironment(
    runtimeEnvironment.map((entry) => entry.key === 'DAILYCLARITY_SUPABASE_PROJECT_REF'
      ? { ...entry, scopes: ['functions'] }
      : entry),
    config,
  ), /builds and functions/)
  assert.throws(() => assertNetlifyRuntimeEnvironment(
    runtimeEnvironment.map((entry) => entry.key === 'SUPABASE_SERVICE_ROLE_KEY'
      ? { ...entry, is_secret: false }
      : entry),
    config,
  ), /must exist and be marked secret/)
})

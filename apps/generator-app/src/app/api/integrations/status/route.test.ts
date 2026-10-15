import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const mocks = vi.hoisted(() => ({ readiness: vi.fn(), issues: vi.fn(), schema: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({ requireInternalAdminOrThrow: () => null }))
vi.mock('@/lib/platform-config', () => ({ getPlatformDomain: () => 'dailyclarity.org' }))
vi.mock('@/lib/stripe-runtime', () => ({
  getTemplateFulfillmentConfigIssues: mocks.issues,
  isDedicatedSupabaseProjectConfigured: () => true,
}))
vi.mock('@/lib/templates/niche-registry', () => ({ getTemplateCatalogReadiness: mocks.readiness }))
vi.mock('@/lib/release-schema', () => ({
  EXPECTED_LAUNCH_SCHEMA_VERSION: '20260903.4', EXPECTED_BOOKING_KIT_SCHEMA_VERSION: '20260925.2',
  inspectReleaseSchema: mocks.schema,
}))

beforeEach(() => {
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_BASIC', 'STRIPE_PRICE_GROWTH',
    'STRIPE_PRICE_CUSTOM_BUILD', 'STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID', 'POSTMARK_SERVER_TOKEN',
    'EMAIL_FROM_ADDRESS', 'SUPABASE_SERVICE_ROLE_KEY', 'NETLIFY_ACCESS_TOKEN', 'PLATFORM_DOMAIN', 'PORTAL_TOKEN_SECRET']) {
    vi.stubEnv(key, 'test-fixture')
  }
  vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', 'x'.repeat(32))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co')
  vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'test-project')
  vi.stubEnv('DAILYCLARITY_SALES_PAUSED', 'false')
  vi.stubEnv('BOOKING_KIT_ENABLED', 'true')
  mocks.issues.mockReturnValue([])
  mocks.schema.mockResolvedValue({ ready: true, schemaVersion: '20260903.4', kitSchemaVersion: '20260925.2' })
  mocks.readiness.mockResolvedValue({
    ready: true, actualTotal: 60, expectedTotal: 60, actualByNiche: {}, expectedByNiche: {}, issues: [],
    profile: 'launch', catalogHash: 'a'.repeat(64), manifestHash: 'b'.repeat(64), curatedReportHash: 'c'.repeat(64),
    certificationHash: null, catalogueReleaseSha: null,
  })
})

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

async function status() {
  return (await GET(new NextRequest('https://dailyclarity.org/api/integrations/status'))).json()
}

it('reports the validated runtime launch evidence without fabricating certification', async () => {
  expect(await status()).toMatchObject({
    templateCatalogReady: true, templateCatalogProfile: 'launch', publishedTemplateCount: 60,
    templateCatalogHash: 'a'.repeat(64), templateManifestHash: 'b'.repeat(64),
    templateCuratedReportHash: 'c'.repeat(64), templateCertificationHash: null, templateCatalogueReleaseSha: null,
  })
})

it('pauses new sales while keeping configured fulfillment readiness distinct', async () => {
  vi.stubEnv('DAILYCLARITY_SALES_PAUSED', 'true')
  expect(await status()).toMatchObject({
    salesPaused: true, checkoutReady: false, templateCheckoutReady: false,
    customBuildCheckoutReady: false, bookingKitSalesEnabled: false,
    fulfillmentReady: true, missingRequirements: ['paid_sales_paused'],
  })
  mocks.issues.mockReturnValue(['POSTMARK_SERVER_TOKEN'])
  expect(await status()).toMatchObject({ fulfillmentReady: false, checkoutReady: false })
  mocks.issues.mockReturnValue([])
  mocks.schema.mockResolvedValue({ ready: false, schemaVersion: null, kitSchemaVersion: null })
  expect(await status()).toMatchObject({ fulfillmentReady: false, checkoutReady: false })
})

it('reports no hashes or fulfillment readiness when the catalogue cannot be validated', async () => {
  mocks.readiness.mockResolvedValue({
    ready: false, actualTotal: 0, expectedTotal: 60, actualByNiche: {}, expectedByNiche: {}, issues: ['Unavailable'],
  })
  expect(await status()).toMatchObject({
    templateCatalogReady: false, templateCatalogHash: null, templateManifestHash: null,
    templateCuratedReportHash: null, templateCertificationHash: null, fulfillmentReady: false,
  })
})

it('preserves rehabilitation certification and snapshot fields without adding curated evidence', async () => {
  mocks.readiness.mockResolvedValue({
    ready: true, actualTotal: 5486, expectedTotal: 5486, actualByNiche: {}, expectedByNiche: {}, issues: [],
    profile: 'rehab-certified', catalogHash: 'a'.repeat(64), manifestHash: 'b'.repeat(64),
    certificationHash: 'd'.repeat(64), catalogueReleaseSha: 'e'.repeat(40),
  })
  expect(await status()).toMatchObject({
    templateCatalogProfile: 'rehab-certified', publishedTemplateCount: 5486, templateCuratedReportHash: null,
    templateCatalogHash: 'a'.repeat(64), templateManifestHash: 'b'.repeat(64),
    templateCertificationHash: 'd'.repeat(64), templateCatalogueReleaseSha: 'e'.repeat(40),
  })
})

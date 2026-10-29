export const EXPECTED_LAUNCH_SCHEMA_VERSION = '20260903.4'
export const EXPECTED_BOOKING_KIT_SCHEMA_VERSION = '20260925.2'
export const EXPECTED_BILLING_LIFECYCLE_SCHEMA_VERSION = '20261029.1'
export const EXPECTED_SITE_USAGE_SCHEMA_VERSION = '20261029.1'

/** Keep legacy certified versions pinned and require the additive billing/usage contracts. */
export async function inspectReleaseSchema(url: string | undefined, serviceKey: string | undefined, expectedRef: string | undefined) {
  const unavailable = { ready: false, schemaVersion: null, kitSchemaVersion: null, billingSchemaVersion: null, usageSchemaVersion: null }
  if (!url || !serviceKey || !expectedRef) return unavailable
  try {
    const origin = new URL(url)
    if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.hostname !== `${expectedRef}.supabase.co` || origin.port ||
      origin.pathname !== '/' || origin.search || origin.hash) return unavailable
    const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' }
    const [launch, kit, billing, usage] = await Promise.all(['launch_schema_readiness', 'booking_kit_schema_version', 'billing_lifecycle_schema_readiness', 'site_usage_schema_readiness'].map(rpc =>
      fetch(`${origin.origin}/rest/v1/rpc/${rpc}`, { method: 'POST', headers, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10_000) }),
    ))
    if (!launch.ok || !kit.ok || !billing.ok || !usage.ok) return unavailable
    const [launchResult, kitVersion, billingResult, usageResult] = await Promise.all([launch.json(), kit.json(), billing.json(), usage.json()])
    return {
      ready: launchResult?.ready === true && launchResult?.schemaVersion === EXPECTED_LAUNCH_SCHEMA_VERSION && kitVersion === EXPECTED_BOOKING_KIT_SCHEMA_VERSION
        && billingResult?.ready === true && billingResult?.schemaVersion === EXPECTED_BILLING_LIFECYCLE_SCHEMA_VERSION
        && usageResult?.ready === true && usageResult?.schemaVersion === EXPECTED_SITE_USAGE_SCHEMA_VERSION,
      schemaVersion: typeof launchResult?.schemaVersion === 'string' ? launchResult.schemaVersion : null,
      kitSchemaVersion: typeof kitVersion === 'string' ? kitVersion : null,
      billingSchemaVersion: typeof billingResult?.schemaVersion === 'string' ? billingResult.schemaVersion : null,
      usageSchemaVersion: typeof usageResult?.schemaVersion === 'string' ? usageResult.schemaVersion : null,
    }
  } catch {
    return unavailable
  }
}

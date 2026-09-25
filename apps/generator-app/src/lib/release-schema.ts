export const EXPECTED_LAUNCH_SCHEMA_VERSION = '20260903.4'
export const EXPECTED_BOOKING_KIT_SCHEMA_VERSION = '20260925.2'

/** Probe both schemas before a worker that requires payment evidence is deployed. */
export async function inspectReleaseSchema(url: string | undefined, serviceKey: string | undefined, expectedRef: string | undefined) {
  const unavailable = { ready: false, schemaVersion: null, kitSchemaVersion: null }
  if (!url || !serviceKey || !expectedRef) return unavailable
  try {
    const origin = new URL(url)
    if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.hostname !== `${expectedRef}.supabase.co` || origin.port ||
      origin.pathname !== '/' || origin.search || origin.hash) return unavailable
    const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' }
    const [launch, kit] = await Promise.all(['launch_schema_readiness', 'booking_kit_schema_version'].map(rpc =>
      fetch(`${origin.origin}/rest/v1/rpc/${rpc}`, { method: 'POST', headers, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10_000) }),
    ))
    if (!launch.ok || !kit.ok) return unavailable
    const [launchResult, kitVersion] = await Promise.all([launch.json(), kit.json()])
    return {
      ready: launchResult?.ready === true && launchResult?.schemaVersion === EXPECTED_LAUNCH_SCHEMA_VERSION && kitVersion === EXPECTED_BOOKING_KIT_SCHEMA_VERSION,
      schemaVersion: typeof launchResult?.schemaVersion === 'string' ? launchResult.schemaVersion : null,
      kitSchemaVersion: typeof kitVersion === 'string' ? kitVersion : null,
    }
  } catch {
    return unavailable
  }
}

/**
 * Reversible provider control. This is deliberately disconnected from the
 * scheduler until an isolated fixture establishes a real disable/readback/
 * restore contract. A generic Netlify Site.state is not a suspension signal.
 */
export interface HostingSiteBinding {
  siteId: string
  accountId: string
  siteName: string
  defaultDomain: string
  customDomains: string[]
  deploymentId: string
}
export interface HostingOperation {
  id: string
  action: 'disable' | 'enable'
  binding: HostingSiteBinding
  /** An enable may restore only the latest confirmed disable owned by us. */
  ownedSuspension?: { operationId: string; phase: 'confirmed'; binding: HostingSiteBinding }
}
export interface HostingControlJournal {
  requested(operation: HostingOperation): Promise<void>
  complete(id: string, phase: 'confirmed' | 'unknown' | 'rejected', code: string | null): Promise<void>
}
export interface VerifiedHostingReadback {
  fixtureSiteId: string
  accountId: string
  evidenceId: string
  /** A concrete fixture-tested observer; never infer from an undocumented enum. */
  observe(binding: HostingSiteBinding): Promise<'enabled' | 'disabled' | 'unknown'>
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const same = (a: HostingSiteBinding, b: HostingSiteBinding) =>
  a.siteId === b.siteId && a.accountId === b.accountId && a.siteName === b.siteName
  && a.defaultDomain === b.defaultDomain && a.deploymentId === b.deploymentId
  && [...a.customDomains].sort().join('\n') === [...b.customDomains].sort().join('\n')

export function matchesHostingSiteBinding(value: unknown, expected: HostingSiteBinding): boolean {
  const site = record(value)
  const aliases = site?.domain_aliases
  if (!site || !Array.isArray(aliases) || aliases.some(v => typeof v !== 'string')) return false
  const domains = [...new Set([site.custom_domain, ...aliases].filter((v): v is string => typeof v === 'string' && !!v))].sort()
  return site.id === expected.siteId && site.account_id === expected.accountId
    && site.name === expected.siteName && site.default_domain === expected.defaultDomain
    && record(site.published_deploy)?.id === expected.deploymentId
    && domains.join('\n') === [...new Set(expected.customDomains)].sort().join('\n')
}

export function canSuspendHosting(evidence: {
  kind: string; subscriptionStatus: string; validThrough: string | null;
  verifiedAt: string | null; lastError: string | null;
}, now = Date.now()): boolean {
  const end = evidence.validThrough ? Date.parse(evidence.validThrough) : NaN
  const verified = evidence.verifiedAt ? Date.parse(evidence.verifiedAt) : NaN
  return evidence.kind === 'none' && ['canceled', 'unpaid', 'incomplete_expired'].includes(evidence.subscriptionStatus)
    && Number.isFinite(end) && end <= now && Number.isFinite(verified)
    && verified <= now && now - verified <= 5 * 60_000 && evidence.lastError === null
}

/**
 * The caller must claim a durable operation and bind the current entitlement
 * generation before invoking this adapter. Timeouts are unknown, never success;
 * an unknown disable must be reviewed rather than auto-enabled or blindly retried.
 */
export async function executeNetlifyHostingControl(
  operation: HostingOperation,
  journal: HostingControlJournal,
  readback: VerifiedHostingReadback,
  options: { enabled: boolean; accessToken: string; fetch?: typeof fetch },
): Promise<'confirmed' | 'unknown' | 'rejected'> {
  if (!options.enabled) throw new Error('hosting_control_not_activated')
  const { binding, action } = operation
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(binding.siteId) || !binding.accountId || !binding.deploymentId
    || !binding.siteName || binding.defaultDomain !== `${binding.siteName}.netlify.app`
    || !operation.id || !options.accessToken || !readback.evidenceId || !readback.fixtureSiteId
    || readback.accountId !== binding.accountId || readback.fixtureSiteId === binding.siteId) {
    throw new Error('hosting_control_binding_unverified')
  }
  if (action === 'enable' && (!operation.ownedSuspension?.operationId
    || operation.ownedSuspension.phase !== 'confirmed' || !same(operation.ownedSuspension.binding, binding))) {
    throw new Error('hosting_control_not_platform_suspended')
  }
  const request = options.fetch || fetch
  const api = `https://api.netlify.com/api/v1/sites/${encodeURIComponent(binding.siteId)}`
  const headers = { authorization: `Bearer ${options.accessToken}` }
  const preflight = await request(api, { headers, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  if (!preflight.ok || !matchesHostingSiteBinding(await preflight.json(), binding)) throw new Error('hosting_control_target_changed')
  const before = await readback.observe(binding)
  if (before !== (action === 'disable' ? 'enabled' : 'disabled')) throw new Error('hosting_control_preflight_unknown')
  // The journal must commit BEFORE the provider request. If this write fails,
  // no external change occurs, preserving a recoverable audit boundary.
  await journal.requested(operation)
  let phase: 'confirmed' | 'unknown' | 'rejected' = 'unknown'
  let code: string | null = 'provider_outcome_unknown'
  try {
    const endpoint = action === 'disable'
      ? `${api}/disable?reason=${encodeURIComponent(`DailyClarity subscription ended; operation ${operation.id}`)}`
      : `${api}/enable`
    const response = await request(endpoint, { method: 'PUT', headers, signal: AbortSignal.timeout(15_000) })
    if (response.status === 204) {
      const after = await readback.observe(binding)
      if (after === (action === 'disable' ? 'disabled' : 'enabled')) { phase = 'confirmed'; code = null }
      else code = 'provider_readback_unknown'
    } else if (response.status === 422) {
      phase = 'rejected'; code = 'provider_suspension_cannot_be_restored'
    } else code = `provider_response_${response.status}`
  } catch { /* Keep the recorded request unknown after network/readback failure. */ }
  await journal.complete(operation.id, phase, code)
  return phase
}

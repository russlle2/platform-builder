import { describe, expect, it, vi } from 'vitest'
import { canSuspendHosting, executeNetlifyHostingControl, matchesHostingSiteBinding, type HostingOperation } from './netlify-hosting-control'
const binding = { siteId: 'site-fixture', accountId: 'account-owner', siteName: 'calm-site', defaultDomain: 'calm-site.netlify.app', customDomains: [], deploymentId: 'deploy-current' }
const site = { id: binding.siteId, account_id: binding.accountId, name: binding.siteName, default_domain: binding.defaultDomain, custom_domain: null, domain_aliases: [], published_deploy: { id: binding.deploymentId } }
function fixture(action: 'disable' | 'enable' = 'disable') {
  const operation: HostingOperation = { id: 'operation-one', action, binding }
  const journal = { requested: vi.fn().mockResolvedValue(undefined), complete: vi.fn().mockResolvedValue(undefined) }
  const readback = { fixtureSiteId: 'isolated-control-fixture', accountId: binding.accountId, evidenceId: 'verified-fixture-evidence', observe: vi.fn().mockResolvedValueOnce(action === 'disable' ? 'enabled' : 'disabled').mockResolvedValueOnce(action === 'disable' ? 'disabled' : 'enabled') }
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(site))).mockResolvedValueOnce(new Response(null, { status: 204 }))
  return { operation, journal, readback, options: { enabled: true, accessToken: 'fixture-token', fetch } }
}
describe('reversible Netlify hosting control safety boundary', () => {
  it('is inert by default and never contacts a provider without activation', async () => {
    const f = fixture(); f.options.enabled = false
    await expect(executeNetlifyHostingControl(f.operation, f.journal, f.readback, f.options)).rejects.toThrow('not_activated')
    expect(f.options.fetch).not.toHaveBeenCalled()
  })
  it('requires exact provider account, site, domains and deployment', () => {
    expect(matchesHostingSiteBinding(site, binding)).toBe(true)
    expect(matchesHostingSiteBinding({ ...site, account_id: 'other' }, binding)).toBe(false)
    expect(matchesHostingSiteBinding({ ...site, published_deploy: { id: 'other' } }, binding)).toBe(false)
    expect(matchesHostingSiteBinding({ ...site, custom_domain: 'unrecognized.example' }, binding)).toBe(false)
  })
  it('journals before reversible disable, then requires verified readback', async () => {
    const f = fixture()
    expect(await executeNetlifyHostingControl(f.operation, f.journal, f.readback, f.options)).toBe('confirmed')
    expect(f.journal.requested.mock.invocationCallOrder[0]).toBeLessThan(f.options.fetch.mock.invocationCallOrder[1])
    expect(f.options.fetch.mock.calls[1][0]).toContain('/disable?reason=')
    expect(f.options.fetch.mock.calls[1][1].method).toBe('PUT')
    expect(f.journal.complete).toHaveBeenCalledWith('operation-one', 'confirmed', null)
  })
  it('does not enable suspension that this platform has not confirmed owning', async () => {
    const f = fixture('enable')
    await expect(executeNetlifyHostingControl(f.operation, f.journal, f.readback, f.options)).rejects.toThrow('not_platform_suspended')
    expect(f.options.fetch).not.toHaveBeenCalled()
  })
  it('records timeouts and uncertain readback for review, never as a successful disable', async () => {
    const f = fixture()
    f.options.fetch.mockReset().mockResolvedValueOnce(new Response(JSON.stringify(site))).mockRejectedValueOnce(new Error('timeout'))
    expect(await executeNetlifyHostingControl(f.operation, f.journal, f.readback, f.options)).toBe('unknown')
    expect(f.journal.complete).toHaveBeenCalledWith('operation-one', 'unknown', 'provider_outcome_unknown')
  })
  it('retains hosting for unknown evidence, outages and prepaid time', () => {
    const now = Date.now()
    const e = { kind: 'none', subscriptionStatus: 'canceled', validThrough: new Date(now - 1000).toISOString(), verifiedAt: new Date(now - 1000).toISOString(), lastError: null }
    expect(canSuspendHosting(e, now)).toBe(true)
    expect(canSuspendHosting({ ...e, kind: 'unknown' }, now)).toBe(false)
    expect(canSuspendHosting({ ...e, validThrough: new Date(now + 1000).toISOString() }, now)).toBe(false)
    expect(canSuspendHosting({ ...e, lastError: 'provider_unavailable' }, now)).toBe(false)
    expect(canSuspendHosting({ ...e, verifiedAt: new Date(now - 600_000).toISOString() }, now)).toBe(false)
  })
})

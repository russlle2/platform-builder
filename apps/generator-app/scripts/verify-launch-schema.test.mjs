import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const scriptUrl = new URL('./verify-launch-schema.mjs', import.meta.url).href
const launchRpc = 'https://stagingref.supabase.co/rest/v1/rpc/launch_schema_readiness'
const kitRpc = 'https://stagingref.supabase.co/rest/v1/rpc/booking_kit_schema_version'

function verify({ launch = { ready: true, schemaVersion: '20260903.4' }, kit = '20260925.2', status = 200, env = {} } = {}) {
  const program = `
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push(url);
      if (options.method !== 'POST' || options.headers.apikey !== 'fixture-secret') throw new Error('Unexpected probe contract');
      return new Response(JSON.stringify(url.endsWith('launch_schema_readiness') ? ${JSON.stringify(launch)} : ${JSON.stringify(kit)}), { status: ${status} });
    };
    try { await import(${JSON.stringify(scriptUrl)}); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
    console.log(JSON.stringify({ calls }));
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
    encoding: 'utf8',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'https://stagingref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'fixture-secret', DAILYCLARITY_SUPABASE_PROJECT_REF: 'stagingref', ...env },
  })
  assert.ifError(result.error)
  const calls = JSON.parse(result.stdout.trim().split('\n').at(-1)).calls
  return { ...result, calls }
}

test('deployment schema gate accepts the latest migration and checks both RPCs', () => {
  const result = verify()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.calls, [launchRpc, kitRpc])
  assert.match(result.stdout, /schemas 20260903\.4 and 20260925\.2/)
})

test('deployment schema gate rejects old or incomplete launch schemas', () => {
  for (const launch of [{ ready: true, schemaVersion: '20260903.3' }, { ready: false, schemaVersion: '20260903.4' }]) {
    const result = verify({ launch })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /incompatible or incomplete database/)
    assert.deepEqual(result.calls, [launchRpc])
  }
})

test('deployment schema gate rejects missing durable payment evidence', () => {
  const result = verify({ kit: '20260925.1' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /durable payment-evidence migration/)
  assert.deepEqual(result.calls, [launchRpc, kitRpc])
})

test('deployment schema gate rejects provider failures', () => {
  const result = verify({ status: 503 })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /sentinel failed \(503\)/)
  assert.deepEqual(result.calls, [launchRpc])
})

test('deployment schema gate never sends its credential to an unpinned origin', () => {
  for (const url of ['https://other.supabase.co', 'http://stagingref.supabase.co', 'https://stagingref.supabase.co/path', 'https://user@stagingref.supabase.co']) {
    const result = verify({ env: { NEXT_PUBLIC_SUPABASE_URL: url } })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /deployment safety pin/)
    assert.deepEqual(result.calls, [])
  }
})

test('deployment schema gate fails closed without a configured credential', () => {
  const result = verify({ env: { SUPABASE_SERVICE_ROLE_KEY: '' } })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /configuration is incomplete/)
  assert.match(result.stderr, /Missing: SUPABASE_SERVICE_ROLE_KEY\./)
  assert.doesNotMatch(result.stderr, /fixture-secret|stagingref\.supabase\.co/)
  assert.deepEqual(result.calls, [])
})

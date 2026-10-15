import test from 'node:test'
import assert from 'node:assert/strict'
import { getStore } from '@netlify/blobs'
import { createReleaseReadAccess, createReleaseDiagnostics, ReleaseHttpError, safeReleaseError } from './release-read-retry.mjs'

const siteID = 'e5f283c4-d2f2-4fc9-965d-f67f9875c074'
const noWait = async () => {}
const sdkStore = access => access.store(getStore({ name: 'offline-fixture', siteID, token: 'offline-fixture-token', fetch: access.fetch }))

test('actual installed SDK retries the whole read after a signing 503, without exposing provider headers', async () => {
  const calls = [], retries = [], delays = []
  const access = createReleaseReadAccess({
    fetch: async (url, options) => {
      calls.push({ host: new URL(url).host, method: options.method })
      if (calls.length === 1) return new Response('', { status: 503, headers: { 'x-nf-error': 'PRIVATE SIGNED URL AND TOKEN' } })
      if (calls.length === 2) return Response.json({ url: 'https://example.invalid/private-signed-payload?secret=hidden' })
      return new Response('intact bytes')
    }, sleep: async value => { delays.push(value) }, onRetry: value => retries.push(value),
  })
  assert.equal(Buffer.from(await sdkStore(access).get('index.html', { type: 'arrayBuffer' })).toString(), 'intact bytes')
  assert.equal(calls.length, 3)
  assert.deepEqual(delays, [1000])
  assert.equal(retries[0].status, 503)
  assert.equal(retries[0].errorClass, 'BlobsInternalError')
  assert.equal(JSON.stringify(retries).includes('PRIVATE'), false)
  assert.equal(JSON.stringify(retries).includes('secret'), false)
})

test('signing failures stop after exactly three read attempts', async () => {
  let calls = 0
  const delays = []
  const access = createReleaseReadAccess({ fetch: async () => { calls++; return new Response('', { status: 503 }) }, sleep: async ms => { delays.push(ms) } })
  await assert.rejects(sdkStore(access).get('index.html'), error => error.name === 'BlobsInternalError' && error.status === 503)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [1000, 3000])
})

test('terminal signing HTTP failures and missing metadata are never retried', async () => {
  for (const status of [400, 401, 403, 404, 409, 422, 501]) {
    let calls = 0
    const access = createReleaseReadAccess({ fetch: async () => { calls++; return new Response('', { status }) }, sleep: () => assert.fail('terminal response retried') })
    await assert.rejects(sdkStore(access).get('missing'), error => error.status === status)
    assert.equal(calls, 1)
  }
  let calls = 0
  const access = createReleaseReadAccess({ fetch: async () => { calls++; return new Response('', { status: 404 }) }, sleep: () => assert.fail('missing object retried') })
  assert.equal(await sdkStore(access).getMetadata('missing'), null)
  assert.equal(calls, 1)
})

test('all write methods preserve binding and execute once even on a transient-looking error', async () => {
  const source = { calls: 0 }
  for (const method of ['set', 'setJSON', 'delete']) source[method] = async function () { this.calls++; throw new ReleaseHttpError(503) }
  const wrapped = createReleaseReadAccess({ sleep: () => assert.fail('write retried') }).store(source)
  for (const method of ['set', 'setJSON', 'delete']) await assert.rejects(wrapped[method]('key', 'value'), error => error.status === 503)
  assert.equal(source.calls, 3)
})

test('concurrent reads keep terminal and transient HTTP statuses isolated', async () => {
  const counts = { denied: 0, transient: 0 }
  let releaseDenied
  const gate = new Promise(resolve => { releaseDenied = resolve })
  const access = createReleaseReadAccess({ sleep: noWait, fetch: async url => {
    const u = new URL(url)
    if (u.host === 'example.invalid') return new Response('ok')
    if (u.pathname.endsWith('/denied')) { counts.denied++; await gate; return new Response('', { status: 403 }) }
    counts.transient++
    if (counts.transient === 1) { releaseDenied(); return new Response('', { status: 503 }) }
    return Response.json({ url: 'https://example.invalid/payload' })
  } })
  const store = sdkStore(access)
  const [denied, transient] = await Promise.allSettled([store.get('denied'), store.get('transient')])
  assert.equal(denied.status, 'rejected'); assert.equal(denied.reason.status, 403)
  assert.equal(transient.status, 'fulfilled'); assert.equal(transient.value, 'ok')
  assert.deepEqual(counts, { denied: 1, transient: 2 })
})

test('only allowlisted transport failures retry; invariants, JSON errors, cancellation and unknown failures stop', async () => {
  for (const code of ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_SOCKET']) {
    let calls = 0
    const access = createReleaseReadAccess({ sleep: noWait })
    assert.equal(await access.read(async () => { if (++calls === 1) throw new TypeError('private URL', { cause: { code } }); return 'ok' }), 'ok')
    assert.equal(calls, 2)
  }
  const terminal = [new Error('private URL'), new SyntaxError('private body'), new DOMException('cancelled', 'AbortError'), Object.assign(new Error('TLS'), { code: 'CERT_HAS_EXPIRED' }), Object.assign(new Error('Previous certified snapshot is incomplete'), { status: 503 })]
  for (const error of terminal) {
    let calls = 0
    await assert.rejects(createReleaseReadAccess({ sleep: () => assert.fail('terminal failure retried') }).read(async () => { calls++; throw error }))
    assert.equal(calls, 1)
  }
})

test('fixed invariant reason codes and allowlisted scalar diagnostics cannot reflect arbitrary secrets', () => {
  const safe = safeReleaseError(Object.assign(new Error('Previous certified object is missing or corrupt: https://private.invalid/?token=SECRET'), { name: 'SECRET-NAME', code: 'SECRET-CODE', status: '503', stack: 'SECRET-STACK' }))
  assert.deepEqual(safe, { errorClass: 'Error', status: null, code: null, reasonCode: 'snapshot_object_missing_or_corrupt' })
  assert.equal(safeReleaseError(new Error('Previous certified file bytes differ from the sealed receipt')).reasonCode, 'snapshot_file_evidence_mismatch')
  assert.equal(safeReleaseError(new Error('prefix Previous certified snapshot is incomplete')).reasonCode, null)
  assert.equal(JSON.stringify(safe).includes('SECRET'), false)
  for (const [message, expected] of [
    ['Existing staging certification differs from the approved reuse identity', 'reuse_identity_mismatch'],
    ['Existing staging catalogue evidence differs from the candidate', 'reuse_evidence_mismatch'],
    ['Immutable staging certification conflicts', 'immutable_certification_conflict'],
    ['Staging certification durable readback failed', 'certification_readback_failed'],
  ]) assert.equal(safeReleaseError(new Error(message)).reasonCode, expected)
})

test('phase failures preserve the failing deploy phase across successful finally binding and throttle counters', async () => {
  const events = []; let now = 0
  const diagnostics = createReleaseDiagnostics('staging-catalogue', { emit: event => events.push(event), now: () => now })
  diagnostics.phase('verify-snapshot', { expectedFiles: 129521 })
  for (let i = 0; i < 100; i++) diagnostics.read({ method: 'get' })
  assert.equal(events.length, 1)
  now = 30_000; diagnostics.read({ method: 'getMetadata' })
  assert.deepEqual(events[1].completedReads, { get: 100, getMetadata: 1 })
  const original = new Error('SECRET raw provider body')
  try { try { await diagnostics.run('deploy-application', async () => { throw original }) } finally { await diagnostics.run('bind-deployment', async () => {}) } } catch (error) { diagnostics.failure(error) }
  assert.equal(events.at(-1).phase, 'deploy-application')
  assert.equal(events.at(-1).event, 'failure')
  assert.equal(JSON.stringify(events).includes('SECRET'), false)
  assert.throws(() => diagnostics.phase('PRIVATE-PHASE'), /Unknown/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib'
import { mediaSpecification, assertDraftOrigin, assertMediaOrigin, browserReadAllowed, readMediaAsset, assertMediaReport } from './verify-demo-maintenance-media.mjs'

const manifest = JSON.parse(readFileSync(new URL('./demo-maintenance-release.json', import.meta.url), 'utf8'))
const deploymentId = '1234567890abcdef12345678'
const origin = `https://${deploymentId}--dailyclarity.netlify.app`
const recordHash = 'a'.repeat(64)
const expected = { manifest, origin, sourceSha: manifest.sourceSha, deploymentId, recordHash }

test('media manifest requires the complete fixed 24-file set without duplicates or unrelated files', () => {
  assert.equal(mediaSpecification(manifest).length, 24)
  for (const changed of [
    { ...manifest, files: manifest.files.slice(1) },
    { ...manifest, files: [...manifest.files, manifest.files[0]] },
    { ...manifest, files: manifest.files.map((file, index) => index === 0 ? { ...file, path: 'apps/generator-app/public/demo-videos/foreign.mp4' } : file) },
    { ...manifest, mediaVersion: 'good\nBAD=value' },
  ]) assert.throws(() => mediaSpecification(changed))
})

test('browser reads cannot escape the authenticated immutable draft or issue mutations', () => {
  assert.equal(assertDraftOrigin(origin, deploymentId), origin)
  for (const url of ['https://dailyclarity.org', 'http://dailyclarity.org', `${origin}/path`, `${origin}?x=1`, origin.replace(deploymentId, 'f'.repeat(24)), `https://user:password@${new URL(origin).hostname}`]) {
    assert.throws(() => assertDraftOrigin(url, deploymentId))
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(browserReadAllowed(`${origin}/api/checkout`, method, origin), false)
  assert.equal(browserReadAllowed('https://analytics.example/events', 'GET', origin), false)
  assert.equal(browserReadAllowed('data:text/plain,example', 'GET', origin), false)
  assert.equal(browserReadAllowed(`${origin}/demo-videos/a.mp4?v=1`, 'GET', origin), true)
  assert.equal(browserReadAllowed(`${origin}/demo`, 'HEAD', origin), true)
})

test('published verification is explicit and cannot replace draft certification', () => {
  assert.equal(assertMediaOrigin('https://dailyclarity.org', deploymentId, 'published'), 'https://dailyclarity.org')
  for (const candidate of ['https://www.dailyclarity.org', 'https://dailyclarity.org/', 'http://dailyclarity.org', origin]) assert.throws(() => assertMediaOrigin(candidate, deploymentId, 'published'))
  assert.throws(() => assertMediaOrigin('https://dailyclarity.org', deploymentId))
  assert.throws(() => assertMediaOrigin(origin, deploymentId, 'other'))
  const report = { ...syntheticReportForContractTest(), origin: 'https://dailyclarity.org' }
  const productionExpected = { ...expected, origin: 'https://dailyclarity.org' }
  assert.throws(() => assertMediaReport(report, productionExpected))
  assert.equal(assertMediaReport(report, { ...productionExpected, mode: 'published' }), report)
})

test('asset reader checks actual bytes, MIME and sizes with manual redirects and an exact GET URL', async () => {
  const body = Buffer.from('test-only transcript\n')
  const file = { path: '/demo-videos/example.txt', bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), contentType: 'text/plain' }
  let calls = 0
  const result = await readMediaAsset(origin, file, 'test-version', async (url, options) => {
    calls++
    assert.equal(url.href, `${origin}/demo-videos/example.txt?v=test-version`)
    assert.equal(options.method, 'GET')
    assert.equal(options.redirect, 'manual')
    assert.equal(Object.keys(options.headers).some(key => /authorization|cookie/i.test(key)), false)
    return new Response(body, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': String(body.length) } })
  })
  assert.equal(calls, 1)
  assert.equal(result.sha256, file.sha256)
  for (const response of [
    new Response(body, { status: 302, headers: { location: 'https://example.com' } }),
    new Response(body, { headers: { 'content-type': 'text/html' } }),
    new Response(body, { headers: { 'content-type': 'text/plain', 'content-length': String(body.length + 1) } }),
    new Response(Buffer.from('wrong bytes'), { headers: { 'content-type': 'text/plain' } }),
    new Response(Buffer.concat([body, body]), { headers: { 'content-type': 'text/plain' } }),
  ]) await assert.rejects(readMediaAsset(origin, file, 'test-version', async () => response))
})

test('real compressed HTTP transfers retain exact decoded byte and hash checks', async () => {
  const body = Buffer.from('A longer captioned customer walkthrough transcript.\n'.repeat(100))
  const file = { path: '/demo-videos/example.txt', bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), contentType: 'text/plain' }
  let content = body, encoding = 'gzip'
  const compressors = { gzip: gzipSync, br: brotliCompressSync, deflate: deflateSync }
  const server = createServer((_request, response) => {
    const coded = compressors[encoding](content)
    response.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': encoding, 'content-length': String(coded.length) })
    response.end(coded)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const localOrigin = `http://127.0.0.1:${server.address().port}`
  try {
    for (encoding of Object.keys(compressors)) {
      content = body
      assert.notEqual(compressors[encoding](body).length, file.bytes)
      assert.equal((await readMediaAsset(localOrigin, file, 'test-version')).sha256, file.sha256)
      for (content of [Buffer.from('x'.repeat(body.length)), body.subarray(1), Buffer.concat([body, Buffer.from('x')])]) {
        await assert.rejects(readMediaAsset(localOrigin, file, 'test-version'), /Media bytes differ|exceeds its sealed size/)
      }
    }
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})

function syntheticReportForContractTest() {
  const paths = ['/demo/platform-builder', '/demo/aromatherapy', '/demo/holistic_medicine', '/demo/private_practice_therapist', '/demo/sound_bath', '/demo/wellness_coach']
  return {
    version: 1, checkedAt: '2026-10-20T00:00:00.000Z', origin, sourceSha: manifest.sourceSha, recordHash, deploymentId, mediaVersion: manifest.mediaVersion, passed: true,
    assetChecks: mediaSpecification(manifest).map(({ path, bytes, sha256, contentType }) => ({ path, bytes, sha256, contentType, status: 200 })),
    routeChecks: ['desktop', 'mobile'].flatMap(viewport => ['/', '/demo', ...paths].map(path => ({ path, viewport, status: 200, headingVisible: true, videoVisible: true, controls: true, playsInline: true, sourceMatched: true, posterMatched: true, captionsMatched: true, transcriptMatched: true, noHorizontalOverflow: true }))),
    playbackChecks: ['desktop', 'mobile'].flatMap(viewport => paths.map(path => ({ path, viewport, played: true, seeked: true, captionsLoaded: true, transcriptMatched: true, duration: 60, playedSeconds: 0.3, seekTarget: 33, seekTime: 33, captionCues: 10, videoWidth: 1920, videoHeight: 1080 }))),
  }
}

test('report contract rejects partial playback, missing mobile coverage and mismatched prepared identity', () => {
  const valid = syntheticReportForContractTest()
  assert.equal(assertMediaReport(valid, expected), valid)
  const mutations = [
    report => { report.sourceSha = 'b'.repeat(40) },
    report => { report.recordHash = 'b'.repeat(64) },
    report => { report.passed = false },
    report => { report.assetChecks[0].sha256 = 'b'.repeat(64) },
    report => { report.assetChecks[1] = report.assetChecks[0] },
    report => { report.routeChecks.pop() },
    report => { report.routeChecks[0].captionsMatched = false },
    report => { report.playbackChecks.pop() },
    report => { report.playbackChecks[0].playedSeconds = 0 },
    report => { report.playbackChecks[0].seekTime = 0 },
    report => { report.playbackChecks[0].captionCues = 0 },
    report => { report.playbackChecks[0].transcriptMatched = false },
  ]
  for (const mutate of mutations) {
    const report = structuredClone(valid)
    mutate(report)
    assert.throws(() => assertMediaReport(report, expected))
  }
})

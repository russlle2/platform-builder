import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyDemoUploadFailure } from './demo-maintenance-diagnostics.mjs'

const secret = 'nfp_FAKE_ONLY_SECRET_123456789'
const email = 'private-fixture@example.invalid'
const url = 'https://private.example.invalid/invoice?token=FAKE_ONLY_TOKEN'
const privatePath = 'C:/private-account/fixture-token-secret/project'
const output = stderr => classifyDemoUploadFailure({ status: 1, stderr: Buffer.from(stderr), stdout: Buffer.alloc(0) })
const noLeak = result => {
  const serialized = JSON.stringify(result)
  for (const value of [secret, email, url, privatePath, 'FAKE_ONLY_TOKEN', 'private-account']) assert.ok(!serialized.includes(value))
  assert.ok(serialized.length < 700)
}

test('pinned CLI context rejection is recognized with its ANSI/platform stderr formatting', () => {
  const result = output('\u001b[31m ›   Error:\u001b[39m --context flag is only available when using the --build flag\n')
  assert.equal(result.category, 'unsupported-context-without-build')
  assert.equal(result.exitCode, 1)
  assert.equal(result.outputTruncated, false)
})

test('fixed directory messages classify without returning their private path', () => {
  const cases = [
    [`The deploy directory "${privatePath}" has not been found. Did you forget to run 'netlify build'?`, 'deploy-directory-missing'],
    ['Permission error when trying to access deploy folder', 'deploy-directory-permission'],
    ['Deploy target must be a path to a directory', 'deploy-target-not-directory'],
    ['Permission error when trying to access functions folder', 'functions-directory-permission'],
    ['Functions folder must be a path to a directory', 'functions-target-not-directory'],
  ]
  for (const [message, category] of cases) {
    const result = output(` » Error: ${message}\n${secret}\n${email}\n${url}`)
    assert.equal(result.category, category)
    noLeak(result)
  }
})

test('exact authentication and edge failure messages classify but unknown provider text does not', () => {
  for (const message of [
    'Authentication required. NETLIFY_AUTH_TOKEN is not set and `netlify login --request <message>` can be used to authenticate.',
    'Authentication required. NETLIFY_AUTH_TOKEN is not set and `netlify status` also informs us that you need to use `netlify login --request <message>` as a next step.',
  ]) assert.equal(output(`› Error: ${message}`).category, 'authentication-required')
  assert.equal(output('Deploy aborted due to error while bundling edge functions').category, 'edge-bundle-failed')
  const unknown = output(`Request denied for ${email} ${secret} ${url}; billing 402 account 403`)
  assert.equal(unknown.category, 'unknown')
  assert.equal(unknown.httpStatus, null)
  noLeak(unknown)
})

test('pinned configuration errors classify without retaining configuration contents or paths', () => {
  const cases = [
    ['Configuration file does not exist', 'config-file-missing'],
    ['Could not parse configuration file', 'config-parse-failed'],
    ['Could not read configuration file', 'config-read-failed'],
    [`Configuration property "build.publish" "${privatePath}" must be inside the repository root directory.`, 'config-path-outside-repo'],
    [`Base directory does not exist: ${privatePath}`, 'config-base-missing'],
    [`Option 'cwd' points to a non-existing directory: ${privatePath}`, 'config-option-directory-missing'],
  ]
  for (const [message, category] of cases) {
    const result = output(`› Error: When resolving config:\n${message}\n${secret} ${email} ${url}`)
    assert.equal(result.category, category)
    noLeak(result)
  }
})

test('bounded JSON error envelopes preserve only fixed categories and finite HTTP integers', () => {
  const result = output(JSON.stringify({ error: { name: 'JSONHTTPError', statusCode: 422, message: secret, request: { url }, account: email }, headers: { authorization: secret } }))
  assert.equal(result.category, 'cli-http-error')
  assert.equal(result.httpStatus, 422)
  assert.equal(result.jsonErrorObserved, true)
  noLeak(result)
  const message = 'Permission error when trying to access deploy folder'
  assert.equal(output(JSON.stringify({ error: message, privatePath })).category, 'deploy-directory-permission')
  assert.equal(output(`› Error: ${JSON.stringify({ name: 'Error', message })}`).category, 'deploy-directory-permission')
})

test('JSON error status does not imply an invented provider cause', () => {
  const result = output(JSON.stringify({ error: secret, status: 403, message: `account ${email} ${url}` }))
  assert.equal(result.category, 'unknown')
  assert.equal(result.httpStatus, 403)
  noLeak(result)
  for (const status of ['403', 403.5, 99, 600, null, true]) {
    assert.equal(output(JSON.stringify({ name: 'JSONHTTPError', message: secret, status })).httpStatus, null)
  }
  const success = output(JSON.stringify({ deploy_id: secret, status: 403, url }))
  assert.equal(success.jsonErrorObserved, false)
  assert.equal(success.httpStatus, null)
  noLeak(success)
})

test('conflicting errors and HTTP values remain explicitly ambiguous', () => {
  const result = output('Permission error when trying to access deploy folder\nDeploy target must be a path to a directory')
  assert.equal(result.category, 'unknown')
  assert.equal(result.ambiguousCategory, true)
  const http = output(JSON.stringify({ name: 'JSONHTTPError', status: 403, statusCode: 422, message: secret }))
  assert.equal(http.httpStatus, null)
  assert.equal(http.ambiguousHttpStatus, true)
  noLeak(http)
})

test('oversized streams are not partially classified and retain bounded numeric sizes only', () => {
  const stderr = Buffer.from('Permission error when trying to access deploy folder\n' + secret.repeat(6000))
  const result = classifyDemoUploadFailure({ status: 1, stderr, stdout: 'Deploy target must be a path to a directory' })
  assert.equal(result.outputTruncated, true)
  assert.equal(result.category, 'unknown')
  assert.equal(result.stderrBytes, stderr.length)
  noLeak(result)
  const text = 'é'.repeat(70_000)
  const unicode = classifyDemoUploadFailure({ stderr: text })
  assert.equal(unicode.stderrBytes, 140_000)
  assert.equal(unicode.outputTruncated, true)
})

test('unsupported stream types and arbitrary process fields never get stringified', () => {
  const result = classifyDemoUploadFailure({ status: 999, code: secret, signal: email, stdout: { toString() { throw Error('must not run') } }, stderr: 'Permission error when trying to access deploy folder', message: url, stack: privatePath })
  assert.equal(result.unsupportedOutputType, true)
  assert.equal(result.stdoutBytes, null)
  assert.equal(result.category, 'unknown')
  assert.equal(result.exitCode, null)
  assert.equal(result.errorCode, null)
  assert.equal(result.signal, null)
  noLeak(result)
})

test('safe process metadata is allowlisted independently of missing or truncated output', () => {
  const result = classifyDemoUploadFailure({ status: null, code: 'ETIMEDOUT', signal: 'SIGTERM' })
  assert.equal(result.errorCode, 'ETIMEDOUT')
  assert.equal(result.signal, 'SIGTERM')
  assert.equal(result.category, 'unknown')
  assert.equal(result.stdoutBytes, 0)
  assert.equal(result.stderrBytes, 0)
  assert.equal(classifyDemoUploadFailure(null).category, 'unknown')
})

test('message and stack are never inspected and accessor properties are not invoked', () => {
  const cause = { status: 1, message: 'Permission error when trying to access deploy folder', stack: secret }
  Object.defineProperty(cause, 'stderr', { get() { throw Error('must not run') } })
  assert.equal(classifyDemoUploadFailure(cause).category, 'unknown')
})

test('partial and malformed messages, quoted code, and truncated JSON do not become known causes', () => {
  for (const text of ['Permission error when trying to access deploy', 'const msg = "Deploy target must be a path to a directory"', '{"name":"JSONHTTPError","status":403', `Deploy target must be a path to a directory ${secret}`]) {
    assert.equal(output(text).category, 'unknown')
    noLeak(output(text))
  }
})

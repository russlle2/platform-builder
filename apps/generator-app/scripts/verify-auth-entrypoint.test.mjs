import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { verifyAuthEntrypoint, verifyRenderedSignIn, safeAuthProbeFailure } from './verify-auth-entrypoint.mjs'

const origin = 'https://dailyclarity-staging.netlify.app'
const form = '<form><label for="email">Email address</label><input id="email" type="email"><button type="submit">Continue with email</button></form>'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })
function fixtureBrowser(html) {
  let context, mutationsReachedFixture = 0
  return {
    launchBrowser: async () => ({
      async newContext(options) {
        assert.equal(options.serviceWorkers, 'block')
        context = await browser.newContext(options)
        await context.route('**/*', async route => {
          if (!['GET', 'HEAD'].includes(route.request().method())) mutationsReachedFixture++
          await route.fulfill({ status: 200, contentType: 'text/html', body: html })
        })
        return context
      },
      close: async () => { await context?.close() },
    }),
    mutations: () => mutationsReachedFixture,
  }
}
const responses = () => [
  new Response(null, { status: 307, headers: { location: '/login?next=%2Fdashboard%3Fsite%3Drelease-check' } }),
  new Response(null, { status: 307, headers: { location: '/login?error=auth_callback_failed' } }),
  new Response(null, { status: 307, headers: { location: '/login?error=auth_callback_failed' } }),
  new Response('<html><title>Sign In</title><div>Loading</div></html>', { headers: { 'content-type': 'text/html' } }),
]

test('a valid Suspense shell is accepted only after independent rendered-form verification', async () => {
  const queue = responses(), calls = []
  const result = await verifyAuthEntrypoint(origin, async (url, options) => {
    calls.push({ pathname: new URL(url).pathname, redirect: options.redirect })
    return queue.shift()
  }, { render: async checkedOrigin => { assert.equal(checkedOrigin, origin); return { signInForm: true, blockedMutationRequests: 0, emailSent: false } } })
  assert.equal(result.signInForm, true); assert.equal(result.emailSent, false)
  assert.deepEqual(calls, ['/dashboard', '/auth/callback', '/auth/callback', '/login'].map(pathname => ({ pathname, redirect: 'manual' })))
})

test('wrong hosting redirect or HTTP failure stops before any browser check', async () => {
  for (const [index, response] of [
    [0, new Response(null, { status: 500 })],
    [0, new Response(null, { status: 307, headers: { location: 'https://unrelated.example/login' } })],
    [1, new Response(null, { status: 307, headers: { location: '/dashboard' } })],
    [2, new Response(null, { status: 307, headers: { location: '/login?error=auth_callback_failed&code=invalid-release-probe' } })],
    [3, new Response(null, { status: 503 })],
  ]) {
    const queue = responses(); queue[index] = response
    await assert.rejects(verifyAuthEntrypoint(origin, async () => queue.shift(), { render: async () => assert.fail('must not render after failed redirect') }))
  }
})

test('real browser waits for a delayed client-rendered form instead of initial HTML text', async () => {
  const fixture = fixtureBrowser(`<html><body><div id="root">Loading</div><script>setTimeout(()=>{document.getElementById('root').innerHTML=${JSON.stringify(form)}},75)</script></body></html>`)
  const phases = []
  const result = await verifyRenderedSignIn(origin, { ...fixture, onPhase: phase => phases.push(phase), timeoutMs: 2000 })
  assert.equal(result.signInForm, true); assert.equal(fixture.mutations(), 0)
  assert.deepEqual(phases, ['browser_launch', 'login_navigation', 'email_control', 'submit_control', 'login_origin'])
})

test('raw label text without a hydrated email control does not pass', async () => {
  const fixture = fixtureBrowser('<html><body>Email address<div>Loading</div></body></html>')
  let phase
  await assert.rejects(verifyRenderedSignIn(origin, { ...fixture, onPhase: value => { phase = value }, timeoutMs: 200 }))
  assert.equal(phase, 'email_control')
})

test('disabled or incorrectly typed controls do not pass the rendered login check', async () => {
  for (const html of [form.replace('type="email"', 'type="text"'), form.replace('id="email"', 'id="email" disabled'), form.replace('type="submit"', 'type="submit" disabled')]) {
    await assert.rejects(verifyRenderedSignIn(origin, { ...fixtureBrowser(html), timeoutMs: 1000 }))
  }
})

test('anonymous browser blocks mutations before they reach a server and never submits the form', async () => {
  const fixture = fixtureBrowser(`<html><body>${form}<script>fetch('/auth/v1/otp',{method:'POST',body:'fixture-only'}).catch(()=>{})</script></body></html>`)
  const result = await verifyRenderedSignIn(origin, { ...fixture, timeoutMs: 2000 })
  assert.equal(result.blockedMutationRequests, 1)
  assert.equal(fixture.mutations(), 0)
  assert.equal(result.emailSent, false)
})

test('failure diagnostics retain only an allowlisted phase, never the caught provider message', () => {
  assert.match(safeAuthProbeFailure('email_control'), /at email_control/)
  assert.equal(safeAuthProbeFailure('https://example.test/?token=PRIVATE'), safeAuthProbeFailure('configuration'))
  assert.equal(safeAuthProbeFailure('email_control').includes('PRIVATE'), false)
})

test('unapproved origins cannot start a browser or make an HTTP request', async () => {
  await assert.rejects(verifyRenderedSignIn('https://attacker.example', { launchBrowser: async () => assert.fail('must not launch') }))
  await assert.rejects(verifyAuthEntrypoint('https://attacker.example', async () => assert.fail('must not request')))
})

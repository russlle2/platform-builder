#!/usr/bin/env node
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ORIGINS = ['https://dailyclarity.org', 'https://dailyclarity-staging.netlify.app']
const PHASES = new Set(['configuration', 'dashboard_response', 'dashboard_redirect', 'callback_response', 'callback_redirect', 'invalid_callback_response', 'invalid_callback_redirect', 'login_response', 'browser_launch', 'login_navigation', 'email_control', 'submit_control', 'login_origin'])
const validOrigin = origin => assert(ORIGINS.includes(origin), 'Unexpected Auth probe target')

/** Check the hydrated client form in a fresh, anonymous, read-only browser. */
export async function verifyRenderedSignIn(origin, { launchBrowser = () => chromium.launch(), onPhase = () => {}, timeoutMs = 20_000 } = {}) {
  validOrigin(origin)
  onPhase('browser_launch')
  const browser = await launchBrowser()
  let blockedMutationRequests = 0
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', async route => {
      const request = route.request()
      if (!['GET', 'HEAD'].includes(request.method())) {
        blockedMutationRequests += 1
        await route.abort('blockedbyclient')
      } else if (request.isNavigationRequest() && new URL(request.url()).origin !== origin) {
        await route.abort('blockedbyclient')
      } else await route.fallback()
    })
    const page = await context.newPage()
    onPhase('login_navigation')
    const response = await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    assert.equal(response?.status(), 200, 'Rendered sign-in page is unavailable')
    onPhase('email_control')
    const email = page.getByLabel('Email address', { exact: true })
    await email.waitFor({ state: 'visible', timeout: timeoutMs })
    assert.equal(await email.getAttribute('type'), 'email', 'Sign-in control has an unexpected type')
    assert.equal(await email.isEnabled(), true, 'Sign-in email control is disabled')
    onPhase('submit_control')
    const submit = page.getByRole('button', { name: 'Continue with email', exact: true })
    await submit.waitFor({ state: 'visible', timeout: timeoutMs })
    assert.equal(await submit.getAttribute('type'), 'submit', 'Sign-in action is not a form submit control')
    assert.equal(await submit.isEnabled(), true, 'Sign-in action is disabled')
    onPhase('login_origin')
    assert.equal(page.url(), `${origin}/login`, 'Rendered sign-in page left the expected URL')
    // Never fill/click a control; no screenshot, trace, storage state or browser
    // payload is retained. Mutation requests are blocked before reaching a server.
    return { signInForm: true, blockedMutationRequests, emailSent: false }
  } finally { await browser.close() }
}

/** Exercise hosting redirects and browser hydration without requesting email. */
export async function verifyAuthEntrypoint(origin, request = fetch, { render = verifyRenderedSignIn, onPhase = () => {} } = {}) {
  onPhase('configuration'); validOrigin(origin)
  const get = pathname => request(origin + pathname, { redirect: 'manual', signal: AbortSignal.timeout(20_000) })
  onPhase('dashboard_response')
  const dashboard = await get('/dashboard?site=release-check&code=discarded-probe-code')
  assert([302, 307].includes(dashboard.status), 'Protected dashboard did not redirect to sign-in')
  onPhase('dashboard_redirect')
  const login = new URL(dashboard.headers.get('location'), origin)
  assert.equal(login.href, origin + '/login?next=%2Fdashboard%3Fsite%3Drelease-check', 'Dashboard redirected away from the expected sign-in URL')
  onPhase('callback_response')
  const callback = await get('/auth/callback')
  assert([302, 307].includes(callback.status), 'Empty Auth callback did not redirect')
  onPhase('callback_redirect')
  assert.equal(new URL(callback.headers.get('location'), origin).href, origin + '/login?error=auth_callback_failed', 'Empty callback left the public origin')
  onPhase('invalid_callback_response')
  const invalidCallback = await get('/auth/callback?code=invalid-release-probe&next=%2Fdashboard')
  assert([302, 307].includes(invalidCallback.status), 'Invalid Auth callback did not redirect')
  onPhase('invalid_callback_redirect')
  assert.equal(new URL(invalidCallback.headers.get('location'), origin).href, origin + '/login?error=auth_callback_failed', 'Invalid callback carried credentials or left the expected sign-in URL')
  onPhase('login_response')
  const page = await get('/login')
  assert.equal(page.status, 200, 'Sign-in page is unavailable')
  // A statically rendered Suspense shell legitimately has no form yet. Check
  // the actual hydrated controls below instead of searching initial HTML text.
  await page.body?.cancel()
  const rendered = await render(origin, { onPhase })
  return { dashboardRedirect: true, callbackRedirect: true, invalidCallbackRedirect: true, signInPage: true, ...rendered }
}

export function safeAuthProbeFailure(phase) {
  return `Deployed public Auth route verification failed at ${PHASES.has(phase) ? phase : 'configuration'}; no email was requested. Provider details suppressed.`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let phase = 'configuration'
  const expected = process.env.DEPLOY_ENVIRONMENT === 'staging' ? 'dailyclarity-staging.netlify.app'
    : process.env.DEPLOY_ENVIRONMENT === 'production' ? 'dailyclarity.org' : null
  try {
    assert(expected && process.env.NETLIFY_EXPECTED_SITE_HOSTNAME === expected, 'Auth probe target identity mismatch')
    console.log(JSON.stringify(await verifyAuthEntrypoint('https://' + expected, fetch, { onPhase: next => { phase = next } })))
  } catch {
    console.error(safeAuthProbeFailure(phase))
    process.exitCode = 1
  }
}

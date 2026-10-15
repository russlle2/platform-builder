#!/usr/bin/env node
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Exercise the hosting adapter without sending email or creating a session. */
export async function verifyAuthEntrypoint(origin, request = fetch) {
  assert(['https://dailyclarity.org', 'https://dailyclarity-staging.netlify.app'].includes(origin), 'Unexpected Auth probe target')
  const get = pathname => request(origin + pathname, { redirect: 'manual', signal: AbortSignal.timeout(20_000) })
  const dashboard = await get('/dashboard?site=release-check&code=discarded-probe-code')
  assert([302, 307].includes(dashboard.status), 'Protected dashboard did not redirect to sign-in')
  const login = new URL(dashboard.headers.get('location'), origin)
  assert.equal(login.href, origin + '/login?next=%2Fdashboard%3Fsite%3Drelease-check', 'Dashboard redirected away from the expected sign-in URL')
  const callback = await get('/auth/callback')
  assert([302, 307].includes(callback.status), 'Empty Auth callback did not redirect')
  assert.equal(new URL(callback.headers.get('location'), origin).href, origin + '/login?error=auth_callback_failed', 'Empty callback left the public origin')
  const page = await get('/login')
  assert.equal(page.status, 200, 'Sign-in page is unavailable')
  assert((await page.text()).includes('Email address'), 'Sign-in page did not contain its email control')
  return { dashboardRedirect: true, callbackRedirect: true, signInPage: true, emailSent: false }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = process.env.DEPLOY_ENVIRONMENT === 'staging' ? 'dailyclarity-staging.netlify.app'
    : process.env.DEPLOY_ENVIRONMENT === 'production' ? 'dailyclarity.org' : null
  try {
    assert(expected && process.env.NETLIFY_EXPECTED_SITE_HOSTNAME === expected, 'Auth probe target identity mismatch')
    console.log(JSON.stringify(await verifyAuthEntrypoint('https://' + expected)))
  } catch {
    console.error('Deployed public Auth route verification failed; no email was requested.')
    process.exitCode = 1
  }
}

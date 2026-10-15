import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// These tests mock the server/provider boundary. They verify browser behavior,
// never create a PayPal order, and are not evidence of a real sandbox payment.
const orderId = 'TESTORDER123456789'
const receipt = {
  orderId,
  captureId: 'TESTCAPTURE1234567',
  status: 'COMPLETED',
  amount: '1.00',
  currency: 'USD',
  environment: 'sandbox',
  capturedAt: '2026-10-14T12:00:00.000Z',
}
const config = { enabled: true, configured: true, amount: '1.00', currency: 'USD', environment: 'sandbox' }

type MockOptions = {
  config?: Record<string, unknown>
  savedReceipt?: typeof receipt | null
  savedOrderId?: string | null
  approvalUrl?: string
  captureResponse?: Record<string, unknown>
  captureStatus?: number
  captureSequence?: Array<{ status?: number; response?: Record<string, unknown>; networkError?: boolean }>
  configSequence?: Array<Record<string, unknown>>
}

async function mockSandbox(page: Page, options: MockOptions = {}) {
  const counts = { config: 0, order: 0, capture: 0, receipt: 0, reset: 0 }
  const requests: string[] = []
  let savedReceipt = options.savedReceipt ?? null
  let savedOrderId = options.savedOrderId ?? null
  await page.route('**/api/paypal/sandbox/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof counts
    expect(Object.keys(counts)).toContain(action)
    counts[action]++
    requests.push(action)
    if (action === 'config') return route.fulfill({ json: options.configSequence?.[counts.config - 1] ?? options.config ?? config })
    if (action === 'receipt') return route.fulfill({ json: { receipt: savedReceipt, orderId: savedOrderId } })
    expect(route.request().method()).toBe('POST')
    if (action === 'order') return route.fulfill({ json: { orderId, approvalUrl: options.approvalUrl ?? `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}` } })
    if (action === 'capture') {
      expect(route.request().postDataJSON()).toEqual({ orderId })
      const next = options.captureSequence?.[counts.capture - 1]
      if (next?.networkError) return route.abort('failed')
      return route.fulfill({ status: next?.status ?? options.captureStatus ?? 200, json: next?.response ?? options.captureResponse ?? { receipt } })
    }
    if (action === 'reset') {
      savedReceipt = null
      savedOrderId = null
      return route.fulfill({ json: { ok: true } })
    }
    return route.fulfill({ status: 500, json: { error: 'Unexpected test request' } })
  })
  return Object.assign(counts, { requests })
}

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(?:plausible\.io|www\.googletagmanager\.com|www\.google-analytics\.com)\//, (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
  // An unexpected PayPal navigation must never reach the real provider.
  await page.route(/https:\/\/[^/]*paypal\.com\//, (route) => route.abort())
})

for (const unavailable of [{ enabled: false, configured: true }, { enabled: true, configured: false }]) {
  test(`checkout explains setup when enabled=${unavailable.enabled}, configured=${unavailable.configured}`, async ({ page }) => {
    const counts = await mockSandbox(page, { config: { ...config, ...unavailable } })
    await page.goto('/paypal-test')
    await expect(page.getByRole('heading', { name: 'Sandbox setup is needed' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PayPal Sandbox is not ready' })).toBeDisabled()
    await expect(page.getByRole('link', { name: 'Try the free website preview' })).toHaveAttribute('href', '/preview-your-business')
    await page.getByRole('button', { name: 'Check setup again' }).click()
    await expect.poll(() => counts.config).toBe(2)
    expect(counts.order).toBe(0)
    expect(counts.capture).toBe(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')
  })
}

test('mobile checkout explains pretend funds and sends the buyer only to the sandbox', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const counts = await mockSandbox(page)
  await page.route('https://www.sandbox.paypal.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Mock PayPal Sandbox</h1>' }))
  await page.goto('/paypal-test')
  await expect(page.getByRole('heading', { name: 'Ready for your test purchase' })).toBeVisible()
  await expect(page.getByText('$1.00 USD · pretend funds', { exact: true })).toBeVisible()
  await expect(page.getByText('Real money charged', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const checkout = page.getByRole('button', { name: 'Continue to PayPal Sandbox' })
  await checkout.focus()
  await checkout.press('Enter')
  await expect(page).toHaveURL(`https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`)
  expect(counts.order).toBe(1)
})

test('PayPal return captures once, strips query IDs, and provides a downloadable printable receipt', async ({ page }) => {
  const counts = await mockSandbox(page)
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printed = 'true' } })
  await page.goto(`/paypal-test?token=${orderId}&PayerID=TESTPAYER`)
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeFocused()
  await expect(page).toHaveURL(/\/paypal-test$/)
  expect(counts.capture).toBe(1)
  await expect(page.getByText(receipt.captureId, { exact: true })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download receipt' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe(`dailyclarity-paypal-sandbox-${orderId}.json`)
  const saved = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(saved).toMatchObject({ ...receipt, testOnly: true, realMoneyCharged: '0.00', websitePurchased: false, subscriptionCreated: false })
  await page.getByRole('button', { name: 'Print receipt' }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.printed)).toBe('true')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download receipt' })).toBeHidden()
})

test('a cancelled return does not capture and lets the buyer try again', async ({ page }) => {
  const counts = await mockSandbox(page)
  await page.goto(`/paypal-test?cancelled=1&token=${orderId}`)
  await expect(page.getByRole('heading', { name: 'Checkout cancelled' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to PayPal Sandbox' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Start a fresh test' })).toBeEnabled()
  await expect(page).toHaveURL(/\/paypal-test$/)
  expect(counts.capture).toBe(0)
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toHaveCount(0)
})

test('a failed verification retains the order for an explicit retry', async ({ page }) => {
  const options: MockOptions = { savedOrderId: orderId, captureStatus: 502, captureResponse: { error: 'PayPal is temporarily unavailable. Please try again.' } }
  const counts = await mockSandbox(page, options)
  await page.goto(`/paypal-test?token=${orderId}&PayerID=TESTPAYER`)
  await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('PayPal is temporarily unavailable')
  await expect(page.getByRole('button', { name: 'Download receipt' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/paypal-test$/)
  expect(counts.capture).toBe(1)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Resume your sandbox test' })).toBeVisible()
  expect(counts.capture).toBe(1)
  options.captureStatus = 200
  options.captureResponse = { receipt }
  await page.getByRole('button', { name: 'Check test payment again' }).click()
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeVisible()
  expect(counts.capture).toBe(2)
  expect(counts.order).toBe(0)
})

for (const invalidReceipt of [
  { ...receipt, status: 'PENDING' },
  { ...receipt, amount: '10.00' },
  { ...receipt, environment: 'live' },
  { ...receipt, orderId: 'DIFFERENTORDER1234' },
]) {
  test(`does not claim success for invalid receipt ${JSON.stringify(invalidReceipt)}`, async ({ page }) => {
    await mockSandbox(page, { captureResponse: { receipt: invalidReceipt } })
    await page.goto(`/paypal-test?token=${orderId}`)
    await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check test payment again' })).toBeEnabled()
    await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Download receipt' })).toHaveCount(0)
  })
}

test('a receipt survives a return visit and reset creates a fresh test session', async ({ page }) => {
  const counts = await mockSandbox(page, { savedReceipt: receipt })
  await page.goto('/paypal-test')
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeVisible()
  expect(counts.capture).toBe(0)
  await page.getByRole('button', { name: 'Run another test' }).click()
  await expect(page.getByRole('heading', { name: 'Ready for your test purchase' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download receipt' })).toHaveCount(0)
  expect(counts.reset).toBe(1)
  expect(counts.config).toBe(2)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue to PayPal Sandbox' })).toBeVisible()
})

for (const approvalUrl of [
  `https://www.paypal.com/checkoutnow?token=${orderId}`,
  `https://sandbox.paypal.com.example.org/checkoutnow?token=${orderId}`,
  `https://user:password@sandbox.paypal.com/checkoutnow?token=${orderId}`,
  'https://www.sandbox.paypal.com/checkoutnow?token=WRONGORDER',
]) {
  test(`rejects unsafe or mismatched approval URL ${approvalUrl}`, async ({ page }) => {
    await mockSandbox(page, { approvalUrl })
    await page.goto('/paypal-test')
    await page.getByRole('button', { name: 'Continue to PayPal Sandbox' }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('not a verified PayPal Sandbox address')
    await expect(page).toHaveURL(/\/paypal-test$/)
    await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toHaveCount(0)
  })
}

const originRejection = { status: 403, response: { error: 'Open the sandbox test on its configured website and try again.', code: 'origin_mismatch' } }

test('automatic return recovers one origin rejection after rechecking the same signed order, without duplicate StrictMode captures', async ({ page }) => {
  const counts = await mockSandbox(page, { savedOrderId: orderId, captureSequence: [originRejection, { response: { receipt } }] })
  await page.goto(`/paypal-test?token=${orderId}&PayerID=TESTPAYER`)
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeFocused()
  await expect(page).toHaveURL(/\/paypal-test$/)
  expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt', 'capture'])
  expect(counts.order).toBe(0)
  expect(counts.reset).toBe(0)
})

test('an already completed matching signed receipt avoids another capture after the origin rejection', async ({ page }) => {
  const counts = await mockSandbox(page, { savedOrderId: orderId, savedReceipt: receipt, captureSequence: [originRejection] })
  await page.goto(`/paypal-test?token=${orderId}`)
  await expect(page.getByRole('heading', { name: 'Test purchase complete' })).toBeVisible()
  expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt'])
})

for (const savedOrderId of [null, 'DIFFERENTORDER1234']) {
  test(`an origin rejection cannot retry without the same signed-session order: ${savedOrderId}`, async ({ page }) => {
    const counts = await mockSandbox(page, { savedOrderId, captureSequence: [originRejection] })
    await page.goto(`/paypal-test?token=${orderId}`)
    await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
    expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt'])
  })
}

for (const invalidSavedReceipt of [
  { ...receipt, orderId: 'DIFFERENTORDER1234' },
  { ...receipt, amount: '10.00' },
  { ...receipt, status: 'PENDING' },
  { ...receipt, environment: 'live' },
]) {
  test(`invalid saved receipt stops origin recovery: ${JSON.stringify(invalidSavedReceipt)}`, async ({ page }) => {
    const counts = await mockSandbox(page, { savedOrderId: orderId, savedReceipt: invalidSavedReceipt, captureSequence: [originRejection] })
    await page.goto(`/paypal-test?token=${orderId}`)
    await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download receipt' })).toHaveCount(0)
    expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt'])
  })
}

for (const failure of [
  { status: 403, response: { error: 'Unrelated forbidden request.', code: 'other_error' } },
  { status: 403, response: { error: 'Untyped rejection.' } },
  { status: 409, response: { error: 'This test expired.', code: 'sandbox_session_expired' } },
  { status: 502, response: { error: 'Provider unavailable.', code: 'paypal_unavailable' } },
  { status: 500, response: { error: 'Other status.', code: 'origin_mismatch' } },
  { networkError: true },
]) {
  test(`automatic return never retries an ambiguous or different rejection: ${JSON.stringify(failure)}`, async ({ page }) => {
    const counts = await mockSandbox(page, { savedOrderId: orderId, captureSequence: [failure] })
    await page.goto(`/paypal-test?token=${orderId}`)
    await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
    expect(counts.requests).toEqual(['config', 'capture'])
  })
}

for (const changedConfig of [{ ...config, enabled: false }, { ...config, environment: 'live' }]) {
  test(`origin recovery stops when fresh configuration is unavailable or invalid: ${JSON.stringify(changedConfig)}`, async ({ page }) => {
    const counts = await mockSandbox(page, { savedOrderId: orderId, configSequence: [config, changedConfig], captureSequence: [originRejection] })
    await page.goto(`/paypal-test?token=${orderId}`)
    await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
    expect(counts.requests).toEqual(['config', 'capture', 'config'])
  })
}

test('a second origin rejection stops, and a later manual check gets no automatic retry', async ({ page }) => {
  const counts = await mockSandbox(page, { savedOrderId: orderId, captureSequence: [originRejection, originRejection, originRejection] })
  await page.goto(`/paypal-test?token=${orderId}`)
  await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
  expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt', 'capture'])
  await page.getByRole('button', { name: 'Check test payment again' }).click()
  await expect(page.getByRole('heading', { name: 'Payment is not confirmed yet' })).toBeVisible()
  expect(counts.requests).toEqual(['config', 'capture', 'config', 'receipt', 'capture', 'config', 'capture'])
  expect(counts.order).toBe(0)
  expect(counts.reset).toBe(0)
})

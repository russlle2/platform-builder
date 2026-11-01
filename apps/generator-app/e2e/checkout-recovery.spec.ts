import { test, expect } from '@playwright/test'

test('unverified checkout prioritizes checking status without a second purchase', async ({ page }) => {
  // An invalid reference never calls Stripe. This tests the recovery UI only.
  const response = await page.goto('/success?session_id=invalid-fixture')
  expect(response?.headers()['cache-control']).toContain('no-store')
  // Next's dev server normalizes Cache-Control; no-store forbids shared and private caches.
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'self'")
  expect(response?.headers()['content-security-policy']).not.toMatch(/googletagmanager|google-analytics|posthog|plausible/)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'We couldn’t confirm this checkout' })).toBeVisible()
  await expect(main).toContainText('avoid starting another purchase')
  await expect(main.getByRole('link', { name: 'Check My websites' })).toHaveAttribute('href', '/dashboard')
  await expect(main.getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', '/contact')
  await expect(main.locator('a[href="/pricing"]')).toHaveCount(0)
  await main.getByRole('button', { name: 'Check payment again' }).click()
  await expect(main.getByRole('button', { name: 'Check payment again' })).toBeEnabled()
  await expect(main.getByRole('heading', { name: 'We couldn’t confirm this checkout' })).toBeVisible()
})

test('returning from checkout does not assert payment status or cancel a subscription', async ({ page }) => {
  await page.goto('/cancel')
  const main = page.getByRole('main')
  await expect(main).toContainText('does not confirm a payment or cancel an existing subscription')
  await expect(main).not.toContainText('No charges were made')
  await expect(main.getByRole('link', { name: 'Check My websites' })).toHaveAttribute('href', '/dashboard')
  await expect(main.getByRole('link', { name: 'Update details' })).toHaveAttribute('href', '/preview-your-business')
})

test('payment help fits a narrow screen and links customers to support', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/help#payment')
  const section = page.locator('#payment')
  await expect(section.getByRole('heading', { name: 'Checkout and payment status' })).toBeVisible()
  await expect(section).toContainText('DAILYCLARITY.ORG')
  await expect(section.getByRole('link', { name: 'contact support' })).toHaveAttribute('href', '/contact')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('updated checkout details require verified closure and a separate continue click', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ businessName: 'Updated Studio', email: 'public@example.com', accountEmail: 'private@example.com' }))
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Updated Studio', EMAIL: 'public@example.com' }))
  })
  await page.route('**/api/platform/config', route => route.fulfill({ json: { trialDays: 0 } }))
  const requests: Array<Record<string, unknown>> = []
  let closeEarlier!: () => void
  const closure = new Promise<void>(resolve => { closeEarlier = resolve })
  let navigated = false
  await page.route('**/updated-checkout-fixture', route => {
    navigated = true
    return route.fulfill({ status: 204 })
  })
  await page.route('**/api/stripe/checkout', async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    requests.push(body)
    if (body.replacePreviousCheckout) {
      await closure
      return route.fulfill({ json: { code: 'checkout_replaced', retrySafe: true } })
    }
    if (requests.length > 2) return route.fulfill({ json: { url: '/updated-checkout-fixture' } })
    return route.fulfill({ status: 409, json: {
      code: 'checkout_draft_changed', error: 'Earlier checkout has different details.',
      previousBusinessName: 'Earlier Studio', previousPlan: 'Basic',
    } })
  })
  await page.goto('/pricing?template=updated-layout&niche=aromatherapy')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Resume earlier checkout' })).toBeVisible()
  await page.getByRole('button', { name: 'Use updated details' }).evaluate(button => {
    ;(button as HTMLButtonElement).click()
    ;(button as HTMLButtonElement).click()
  })
  await expect.poll(() => requests.length).toBe(2)
  await expect(page.getByRole('button', { name: 'Choose Plan', exact: true }).first()).toBeDisabled()
  closeEarlier()
  await expect(page.getByRole('status').filter({ hasText: 'Earlier checkout closed' })).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(navigated).toBe(false)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_template_values')!))).toMatchObject({ BUSINESS_NAME: 'Updated Studio' })
  await page.getByRole('button', { name: 'Continue with updated details' }).click({ noWaitAfter: true })
  await expect.poll(() => navigated).toBe(true)
  expect(requests).toHaveLength(3)
  expect(requests[1]).toMatchObject({ planKey: 'security_ads', replacePreviousCheckout: true, resumePreviousCheckout: false })
  expect(requests[2]).toMatchObject({ planKey: 'security_ads', replacePreviousCheckout: false, resumePreviousCheckout: false,
    accountEmail: 'private@example.com', customerValues: { BUSINESS_NAME: 'Updated Studio', EMAIL: 'public@example.com' } })
})

test('uncertain checkout closure cannot enable another purchase', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Updated Studio', EMAIL: 'public@example.com' }))
  })
  await page.route('**/api/platform/config', route => route.fulfill({ json: { trialDays: 0 } }))
  let requests = 0
  await page.route('**/api/stripe/checkout', route => {
    requests++
    return requests === 1 ? route.fulfill({ status: 409, json: {
      code: 'checkout_previous_profile_incomplete', error: 'Earlier checkout needs updated details.',
      previousBusinessName: 'Earlier Studio', previousPlan: 'Basic',
    } }) : route.fulfill({ status: 409, json: { code: 'checkout_creation_uncertain', reference: 'fixture-attempt' } })
  })
  await page.goto('/pricing?template=updated-layout&niche=aromatherapy')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Resume earlier checkout' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Use updated details' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText("Please don't start another payment yet.")
  await expect(page.getByRole('button', { name: 'Continue with updated details' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose Plan', exact: true }).last()).toBeDisabled()
  expect(requests).toBe(2)
})

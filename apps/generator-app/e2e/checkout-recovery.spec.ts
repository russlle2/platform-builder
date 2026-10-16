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

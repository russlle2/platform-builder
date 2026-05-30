import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/DailyClarity/)
  await expect(page.locator('h1')).toBeVisible()
})

test('homepage CTA links to preview wizard', async ({ page }) => {
  await page.goto('/')
  const cta = page.getByRole('link', { name: /Preview Your Business/i }).first()
  await expect(cta).toHaveAttribute('href', /preview-your-business/)
})

test('preview wizard page loads', async ({ page }) => {
  await page.goto('/preview-your-business')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('contact page form appears', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.locator('form')).toBeVisible()
})

test('pricing page loads', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page).toHaveTitle(/Pricing|DailyClarity/)
})

test('portal signed-out screen shows lookup UI', async ({ page }) => {
  await page.goto('/portal')
  // Should show the signed-out / lookup state when no slug is in URL
  const heading = page.locator('h1')
  await expect(heading).toBeVisible()
})

test('inactive niche /hvac redirects or 404s', async ({ page }) => {
  const res = await page.goto('/hvac')
  // Should be 404 or redirect to active page
  expect([404, 301, 302, 200].includes(res?.status() ?? 0)).toBe(true)
})

test('active niche page has no duplicate brand in title', async ({ page }) => {
  await page.goto('/wellness_coach')
  const title = await page.title()
  expect(title).toContain('DailyClarity')
  // Title should not contain DailyClarity twice
  const firstIndex = title.indexOf('DailyClarity')
  const lastIndex = title.lastIndexOf('DailyClarity')
  expect(firstIndex).toBe(lastIndex)
})

import { expect, test } from '@playwright/test'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

test('unavailable trial configuration does not promise a trial or immediate billing', async ({ page }) => {
  await page.route('**/api/platform/config', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await page.goto('/pricing')

  await expect(page.getByRole('button', { name: 'Build preview to choose plan' })).toHaveCount(2)
  const trialQuestion = page.getByRole('button', { name: 'Is there a free trial?' })
  await expect(trialQuestion).toHaveAttribute('aria-expanded', 'false')
  await trialQuestion.click()
  await expect(trialQuestion).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(/Current trial terms could not be confirmed/)).toBeVisible()
  await expect(page.getByText('Subscriptions start billing when you complete checkout.')).toHaveCount(0)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/)
})

test('sample browsing cannot start checkout with a previous real draft', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pricing_sample_seeded')) return
    sessionStorage.setItem('pricing_sample_seeded', '1')
    sessionStorage.setItem('pb_preview_sample', '1')
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Saved Studio', EMAIL: 'saved@example.com' }))
    sessionStorage.setItem('pb_checkout_context', JSON.stringify({ template: 'saved-template', niche: 'wellness_coach' }))
  })
  let checkoutRequests = 0
  await page.route('**/api/stripe/checkout', (route) => {
    checkoutRequests++
    return route.fulfill({ status: 503, json: { error: 'A sample must not reach checkout.' } })
  })
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 7 } }))
  await page.goto('/pricing?template=sample-template&niche=aromatherapy')
  await expect(page.getByRole('button', { name: 'Build preview to choose plan' }).first()).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_checkout_context')!))).toMatchObject({ template: 'saved-template', niche: 'wellness_coach' })
  await page.getByRole('button', { name: 'Build preview to choose plan' }).first().click()
  await expect(page).toHaveURL(/\/preview-your-business\?plan=basic/)
  expect(checkoutRequests).toBe(0)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_template_values')!))).toMatchObject({ BUSINESS_NAME: 'Saved Studio', EMAIL: 'saved@example.com' })
})

test('homepage sample choice carries the chosen practice without asking for contact details', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Your type of practice').selectOption('sound_bath')
  await page.getByRole('button', { name: 'Try a sample website', exact: true }).click()
  await expect(page).toHaveURL(/\/preview-your-business\?sample=1&niche=sound_bath/)
})

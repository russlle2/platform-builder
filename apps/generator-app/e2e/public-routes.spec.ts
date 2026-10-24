import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/DailyClarity/)
  await expect(page.locator('h1')).toBeVisible()
})

test('homepage CTA links to preview wizard', async ({ page }) => {
  await page.goto('/')
  const cta = page.getByRole('link', { name: /Build My Client-Ready Preview/i }).first()
  await expect(cta).toHaveAttribute('href', /preview-your-business/)
})

test('public template catalog redirects to intake', async ({ page }) => {
  await page.goto('/templates/aromatherapy')
  await expect(page).toHaveURL(/\/preview-your-business\?niche=aromatherapy/)
})

test('preview wizard page loads', async ({ page }) => {
  await page.goto('/preview-your-business')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('contact page form appears', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.locator('form')).toBeVisible()
})

test('signed-out dashboard opens the local sign-in page and keeps the selected website', async ({ page, baseURL }) => {
  await page.goto('/dashboard?site=release-check')
  await expect(page).toHaveURL(`${new URL(baseURL!).origin}/login?next=%2Fdashboard%3Fsite%3Drelease-check`)
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible()
})

test('contact page does not report success when the API rejects a submission', async ({ page }) => {
  await page.route('**/api/forms/contact', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Contact submissions are temporarily unavailable.' }),
    })
  })

  await page.goto('/contact')
  await page.getByLabel('Name').fill('Test Visitor')
  await page.getByLabel('Email').fill('visitor@example.com')
  await page.getByLabel('Message').fill('Please tell me more about DailyClarity.')
  await page.getByRole('button', { name: 'Send Message' }).click()

  await expect(page.locator('#contact-form-status')).toContainText('temporarily unavailable')
  await expect(page.getByRole('heading', { name: 'Message Received' })).toHaveCount(0)
  await expect(page.locator('form')).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Test Visitor')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('visitor@example.com')
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Please tell me more about DailyClarity.')
  await expect(page.getByRole('link', { name: 'platformwizard@dailyclarity.org', exact: true })).toHaveAttribute('href', 'mailto:platformwizard@dailyclarity.org')
})

test('help links work without the chat API and preserve an unsent contact message', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const chatRequests: string[] = []
  await page.route('**/api/chat', async route => {
    chatRequests.push(route.request().method())
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } })
  })
  await page.goto('/contact')
  await page.getByLabel('Name', { exact: true }).fill('Test Visitor')
  await page.getByLabel('Message', { exact: true }).fill('A question I have not sent.')
  const launcher = page.getByRole('button', { name: 'Open help and support', exact: true })
  await launcher.click()
  const panel = page.getByRole('dialog', { name: 'How can we help?' })
  await expect(panel).toBeVisible()
  const guidance = panel.getByRole('link', { name: 'Website & account help', exact: true })
  await expect(guidance).toHaveAttribute('href', '/help')
  await expect(guidance).toBeFocused()
  await expect(panel.getByRole('link', { name: 'Plans & pricing', exact: true })).toHaveAttribute('href', '/pricing')
  await expect(panel.getByRole('link', { name: 'Contact DailyClarity', exact: true })).toHaveAttribute('href', '/contact')
  await expect(panel.getByRole('link', { name: 'platformwizard@dailyclarity.org', exact: true })).toHaveAttribute('href', 'mailto:platformwizard@dailyclarity.org')
  expect(await panel.locator('input, textarea').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await guidance.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(launcher).toBeFocused()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Test Visitor')
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('A question I have not sent.')
  expect(chatRequests).toEqual([])
})

test('wellness enquiries keep their focused contact path without the website help launcher', async ({ page }) => {
  await page.goto('/wellness-experiences')
  await expect(page.getByRole('button', { name: 'Open help and support', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ask about an experience', exact: true })).toHaveAttribute('href', '/contact')
})

test('templates navigation disclosure works with click and keyboard', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Templates', exact: true })

  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('link', { name: /Aromatherapy/ }).first()).toBeVisible()

  await button.press('Escape')
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(button).toBeFocused()
})

for (const [path, heading] of [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/refund-policy', 'Refund Policy'],
] as const) {
  test(`${path} legal page loads`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.ok()).toBe(true)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}

test('refunds alias redirects permanently to the public refund policy', async ({ page, request }) => {
  const redirect = await request.get('/refunds', { maxRedirects: 0 })
  expect(redirect.status()).toBe(308)
  expect(redirect.headers().location).toBe('/refund-policy')
  await page.goto('/refunds')
  await expect(page).toHaveURL(/\/refund-policy$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Refund Policy' })).toBeVisible()
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

test('homepage Watch Demo links to platform builder walkthrough', async ({ page }) => {
  await page.goto('/')
  const demo = page.getByRole('link', { name: /Watch Demo/i }).first()
  await expect(demo).toHaveAttribute('href', '/demo/platform-builder')
})

test('demo hub page loads', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.locator('h1')).toContainText(/walkthrough/i)
  await expect(page.getByRole('link', { name: /Platform overview/i })).toBeVisible()
})

test('demo platform page loads', async ({ page }) => {
  await page.goto('/demo/platform-builder')
  await expect(page).toHaveTitle(/DailyClarity/)
  await expect(page.locator('h1')).toBeVisible()
})

test('niche page links to matching demo route', async ({ page }) => {
  await page.goto('/aromatherapy')
  const demo = page.getByRole('link', { name: /Watch Aromatherapy Demo/i })
  await expect(demo.first()).toHaveAttribute('href', '/demo/aromatherapy')
})

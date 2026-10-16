import { expect, test } from '@playwright/test'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

for (const scenario of [
  { niche: 'private_practice_therapist', label: 'therapy practices', question: 'What are the fees and insurance arrangements?', width: 1280 },
  { niche: 'sound_bath', label: 'sound bath practices', question: 'Can I participate comfortably?', width: 375 },
]) {
  test(`${scenario.niche} review is keyboard accessible and opens only a declared preview page`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 900 })
    await page.addInitScript(({ niche }) => {
      sessionStorage.setItem('pb_biz_info', JSON.stringify({
        businessName: 'My Practice', ownerName: 'Alex Morgan', email: 'hello@example.com',
        accountEmail: 'owner@example.com', phone: '', address: 'Online sessions in Ontario', niche,
        tagline: 'A welcoming introduction.', description: 'A description of my approach.', services: 'Individual sessions', website: '',
      }))
      sessionStorage.setItem('pb_style_prefs', JSON.stringify({
        vibes: ['warm'], proseStyle: 'professional', colorMood: 'cool-modern', fontPreference: 'sans-serif', layoutDensity: 'balanced',
      }))
      sessionStorage.setItem('pb_matched', JSON.stringify({
        nicheSlug: niche, templateSlug: 'review-layout', templateName: 'Review Layout',
        matchScore: 50, reason: 'saved selection', pages: ['index.html', 'contact.html'],
      }))
    }, { niche: scenario.niche })
    const requestedPages: string[] = []
    const unexpectedSubmissions: string[] = []
    await page.route('**/api/templates/*/*/preview', (route) => {
      const body = route.request().postDataJSON()
      requestedPages.push(body.page)
      return route.fulfill({ json: {
        html: `<!doctype html><html><head><title>My Practice</title></head><body><h1>My Practice</h1><p>${body.page}</p></body></html>`,
        css: '', variationCSS: '',
      } })
    })
    for (const endpoint of ['**/api/intake/contact', '**/api/profile/save-draft', '**/api/stripe/checkout']) {
      await page.route(endpoint, (route) => {
        unexpectedSubmissions.push(route.request().url())
        return route.fulfill({ json: { ok: true } })
      })
    }
    await page.goto('/preview-your-business')
    await page.getByRole('button', { name: 'Resume preview' }).click()
    const summary = page.locator('summary').filter({ hasText: 'Before you publish' })
    await expect(summary).toContainText(`5 manual checks for ${scenario.label}`)
    const review = summary.locator('..')
    await expect(review).not.toHaveAttribute('open', '')
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(review).toHaveAttribute('open', '')
    await expect(review.getByRole('heading', { name: scenario.question })).toBeVisible()
    await expect(review.getByText(/separate from your details-completeness percentage/)).toBeVisible()
    await expect(review.getByRole('button', { name: 'Open services in preview' })).toHaveCount(0)
    await expect(review.getByRole('button', { name: /booking/i })).toHaveCount(0)
    await review.getByRole('button', { name: 'Open contact in preview' }).click()
    await expect(page.frameLocator('iframe[title="Template preview"]').getByText('contact.html', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Website details 100 percent complete' })).toBeVisible()
    expect(requestedPages).toEqual(['index.html', 'contact.html'])
    expect(unexpectedSubmissions).toEqual([])
    const bounds = await review.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(scenario.width)
    await summary.focus()
    await page.keyboard.press('Space')
    await expect(review).not.toHaveAttribute('open', '')
  })
}

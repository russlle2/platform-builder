import { expect, test } from '@playwright/test'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('preview_selection_seeded')) return
    sessionStorage.setItem('preview_selection_seeded', 'true')
    sessionStorage.setItem('pb_biz_info', JSON.stringify({
      businessName: 'Saved Studio', ownerName: 'Saved Owner', email: 'preview@example.com',
      phone: '', address: '', niche: 'wellness_coach', tagline: '', description: '', services: '', website: '',
    }))
    sessionStorage.setItem('pb_matched', JSON.stringify({
      nicheSlug: 'wellness_coach', templateSlug: 'old-coach', templateName: 'Old Coach', matchScore: 1, reason: 'old',
    }))
    sessionStorage.setItem('pb_style_prefs', JSON.stringify({
      vibes: ['warm'], proseStyle: 'professional', colorMood: 'cool-modern', fontPreference: 'serif', layoutDensity: 'balanced',
    }))
  })
  // These checks exercise navigation and matching, without persisting synthetic leads.
  await page.route('**/api/intake/contact', (route) => route.fulfill({ json: { success: true } }))
  await page.route('**/api/profile/save-draft', (route) => route.fulfill({ json: { success: true } }))
  await page.route('**/api/templates/aromatherapy?all=true', (route) => route.fulfill({ json: {
    templates: [
      { slug: 'algorithm-favorite', name: 'Algorithm Favorite', nicheSlug: 'aromatherapy', pages: ['index.html'], snippet: 'Warm professional modern studio' },
      { slug: 'gallery-choice', name: 'Gallery Choice', nicheSlug: 'aromatherapy', pages: ['index.html', 'book.html'], snippet: 'Organic scent' },
    ],
  } }))
})

test('explicit niche navigation replaces a saved niche while preserving business details and style', async ({ page }) => {
  await page.goto('/preview-your-business?niche=aromatherapy')
  await expect(page.getByText('Aromatherapy', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('Wildflower Aromatherapy')).toHaveValue('Saved Studio')
  const saved = await page.evaluate(() => ({
    info: JSON.parse(sessionStorage.getItem('pb_biz_info')!),
    match: sessionStorage.getItem('pb_matched'),
    style: JSON.parse(sessionStorage.getItem('pb_style_prefs')!),
  }))
  expect(saved.info).toMatchObject({ niche: 'aromatherapy', email: 'preview@example.com', ownerName: 'Saved Owner' })
  expect(saved.match).toBe('null')
  expect(saved.style.fontPreference).toBe('serif')

  // A subsequent query navigation is applied too, even within the same tab.
  await page.evaluate(() => window.history.pushState(null, '', '/preview-your-business?niche=sound_bath'))
  await expect(page.getByText('Sound Bath', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('Resonance Sound Healing')).toHaveValue('Saved Studio')
})

test('opening the wizard without an explicit niche keeps the saved selection and draft', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/preview-your-business')
  await expect(page.getByPlaceholder('Vitality Path Coaching')).toHaveValue('Saved Studio')
  const match = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_matched')!))
  expect(match).toMatchObject({ nicheSlug: 'wellness_coach', templateSlug: 'old-coach' })
  expect(errors).toEqual([])
})

test('a gallery template link selects that published template instead of the algorithm favorite', async ({ page }) => {
  await page.goto('/preview-your-business?niche=aromatherapy&template=gallery-choice')
  await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await expect(page.getByRole('heading', { name: 'Gallery Choice', exact: true })).toBeVisible()
  const match = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_matched')!))
  expect(match).toMatchObject({ nicheSlug: 'aromatherapy', templateSlug: 'gallery-choice', pages: ['index.html', 'book.html'] })
})

test('a missing gallery template clearly explains the replacement match', async ({ page }) => {
  await page.goto('/preview-your-business?niche=aromatherapy&template=missing-template')
  await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await expect(page.getByRole('heading', { name: 'Algorithm Favorite', exact: true })).toBeVisible()
  await expect(page.getByText(/The style from your link is no longer available/)).toBeVisible()
})

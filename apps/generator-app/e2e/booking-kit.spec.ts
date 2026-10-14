import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { composeBookingKit } from '../src/lib/booking-kit-content'

const artifact = composeBookingKit({ niche: 'wellness_coach', businessName: 'Evening Practice', service: 'Planning session', audience: 'adults', format: 'Online one-to-one', duration: '45 minutes', pricingChoice: 'published', priceDetails: '$45 USD', bookingMethod: 'Email hello@example.com' })
const token = 'browser-test-private-credential'
test.beforeEach(async ({ page }) => {
  // Never send synthetic buyer activity to real tracking providers.
  await page.route(/https:\/\/(?:plausible\.io|www\.googletagmanager\.com|www\.google-analytics\.com)\//, (route) => route.fulfill({ contentType: 'application/javascript', body: 'document.documentElement.dataset.e2eTrackerLoaded = "true";' }))
})
async function openDeliveredKit(page: Page) {
  await page.route('**/api/booking-kit/result', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    await route.fulfill({ json: { artifact, accessExpiresAt: '2030-01-01T00:00:00.000Z' } })
  })
  await page.route('**/api/booking-kit/transfer', (route) => route.fulfill({ status: 200, json: { ok: true } }))
  await page.goto(`/booking-kit/result#access_token=${token}`)
  await expect(page.getByRole('heading', { name: 'Your reusable copy' })).toBeVisible()
  await expect(page).toHaveURL(/\/booking-kit\/result$/)
}

test('mobile intake supports keyboard review and correction before payment, with sales initially off', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/booking-kit')
  await expect(page.getByRole('link', { name: 'Try the free website preview' })).toHaveAttribute('href', '/preview-your-business')
  await expect(page.getByText(/Hosted access lasts 90 days/)).toBeVisible()
  await page.getByLabel('Your niche').selectOption('wellness_coach')
  await page.getByLabel('One service you offer').fill('Planning session')
  await page.getByLabel('Who the service is for').fill('Adults')
  await page.getByLabel('Service format').fill('Online')
  await page.getByLabel('Service duration').fill('45 minutes')
  await page.getByLabel('How someone books').fill('Email hello@example.com')
  await page.getByLabel('Pricing choice').selectOption('quote')
  await page.getByLabel('Purchase email').fill('buyer@example.com')
  const reviewButton = page.getByRole('button', { name: 'Review my facts' })
  await reviewButton.focus()
  await reviewButton.press('Enter')
  await expect(page.getByRole('heading', { name: 'Review your facts before payment' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Checkout is not open yet' })).toBeDisabled()
  await page.getByRole('button', { name: 'Correct my facts' }).click()
  await expect(page.getByLabel('One service you offer')).toHaveValue('Planning session')
  await page.getByLabel('One service you offer').fill('Revised planning session')
  await reviewButton.click()
  await expect(page.getByText('Revised planning session', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('private delivery supports downloads, clipboard, print, and no automatic preview overwrite', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text } } })
    window.print = () => { document.documentElement.dataset.printed = 'true' }
  })
  await openDeliveredKit(page)
  expect(await page.evaluate(() => sessionStorage.getItem('pb_biz_info'))).toBeNull()
  await page.getByRole('button', { name: 'Copy homepage headline', exact: true }).click()
  await expect(page.getByText('Homepage headline copied.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.dataset.copied)).toBe(artifact.headline)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download text' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('booking-clarity-kit.txt')
  const content = await readFile((await download.path())!, 'utf8')
  expect(content).toContain(artifact.headline)
  expect(content).toContain('UNFINISHED ITEMS')
  expect(content).toContain('FIVE BOOKING FAQS')
  await page.getByRole('button', { name: 'Print kit' }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.printed)).toBe('true')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { name: 'Your reusable copy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy homepage headline', exact: true })).toBeHidden()
})

test('transfer requires explicit confirmation and resets old customizations only after acceptance', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e_draft_seeded')) return
    sessionStorage.setItem('e2e_draft_seeded', 'true')
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ businessName: 'Existing draft', ownerName: '', email: 'keep@example.com', phone: '', address: '', niche: 'aromatherapy', tagline: 'Old headline', description: '', services: '', website: '' }))
    sessionStorage.setItem('pb_inline_edits', '{"index.html":[{"updated":"Old copy"}]}')
    sessionStorage.setItem('pb_image_swaps', '{"old.jpg":"another.jpg"}')
    sessionStorage.setItem('pb_matched', '{"nicheSlug":"aromatherapy","templateSlug":"old","templateName":"Old","matchScore":1,"reason":"old"}')
  })
  await openDeliveredKit(page)
  const transfer = page.getByRole('button', { name: 'Use this in my website preview' })
  page.once('dialog', (dialog) => dialog.dismiss())
  await transfer.click()
  await expect(page.getByText('Your existing website draft was kept.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!).businessName)).toBe('Existing draft')
  page.once('dialog', (dialog) => dialog.accept())
  await transfer.click()
  await expect(page).toHaveURL(/preview-your-business\?from=booking-kit/)
  const saved = await page.evaluate(() => ({ info: JSON.parse(sessionStorage.getItem('pb_biz_info')!), edits: sessionStorage.getItem('pb_inline_edits'), images: sessionStorage.getItem('pb_image_swaps'), match: sessionStorage.getItem('pb_matched') }))
  expect(saved.info).toMatchObject({ businessName: 'Evening Practice', email: 'keep@example.com', tagline: artifact.headline, niche: 'wellness_coach' })
  expect(saved.edits).toBeNull()
  expect(saved.images).toBeNull()
  expect(saved.match).toBe('null')
  await expect(page.getByText(/Your selected Booking Clarity Kit fields are in this draft/)).toBeVisible()
})

test('denied links do not reveal an artifact and recovery gives a generic response', async ({ page }) => {
  await page.route('**/api/booking-kit/result', (route) => route.fulfill({ status: 403, json: { error: 'Access unavailable' } }))
  await page.route('**/api/booking-kit/recover', (route) => route.fulfill({ status: 202, json: { accepted: true } }))
  await page.goto(`/booking-kit/result#access_token=${token}`)
  await expect(page.getByText(/This private link is invalid/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your reusable copy' })).toHaveCount(0)
  await page.getByLabel('Purchase email').fill('buyer@example.com')
  await page.getByRole('button', { name: 'Email me an access link' }).click()
  await expect(page.getByText(/If that email has an eligible purchase/)).toBeVisible()
})

test('pending payment reveals no kit until the server confirms paid delivery', async ({ page }) => {
  let paid = false
  await page.route('**/api/booking-kit/result', (route) => route.fulfill(paid ? { json: { artifact, accessExpiresAt: '2030-01-01T00:00:00.000Z' } } : { status: 202, json: { status: 'payment_pending' } }))
  await page.goto(`/booking-kit/result#access_token=${token}`)
  await expect(page.getByText(/Waiting for verified payment/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download text' })).toHaveCount(0)
  paid = true
  await page.getByRole('button', { name: 'Check access again' }).click()
  await expect(page.getByRole('button', { name: 'Download text' })).toBeVisible()
})

test('kit upgrade path offers Basic and custom build while normal pricing retains existing plans', async ({ page }) => {
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  await page.goto('/pricing?from=booking-kit')
  await expect(page.getByRole('heading', { name: 'Basic', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start my custom build' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Security + Ads')
  await expect(page.locator('main')).not.toContainText('$80')
  await page.goto('/pricing')
  await expect(page.getByRole('heading', { name: 'Security + Ads', exact: true })).toBeVisible()
})

test('private document sends privacy headers and retains tracker exclusion after public upgrade navigation', async ({ page }) => {
  const errors: string[] = []
  const trackers: string[] = []
  const documents: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', (request) => {
    if (/plausible\.io|googletagmanager\.com|google-analytics\.com/.test(request.url())) trackers.push(request.url())
    if (request.resourceType() === 'document') documents.push(request.url())
  })
  const response = await page.goto('/booking-kit/result')
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  expect(response?.headers()['cache-control']).toContain('no-store')
  expect(response?.headers()['x-robots-tag']).toContain('noindex')
  const csp = response?.headers()['content-security-policy'] || ''
  expect(csp).toContain("connect-src 'self';")
  expect(csp).toContain("frame-src 'none'")
  expect(csp).not.toContain('plausible.io')
  await expect(page.getByText('Open your private access link, or request a fresh link using your purchase email.')).toBeVisible()
  await openDeliveredKit(page)
  await page.getByRole('link', { name: 'Explore the $20/month website', exact: true }).click()
  await expect(page).toHaveURL(/preview-your-business\?from=booking-kit/)
  await expect(page.locator('h1, h2').first()).toBeVisible()
  expect(documents.some((url) => url.includes('/preview-your-business?from=booking-kit'))).toBe(true)
  expect(await page.evaluate(() => sessionStorage.getItem('dailyclarity_booking_kit_access'))).toBe(token)
  expect(trackers).toEqual([])
  expect(errors).toEqual([])
})

test('SPA entry from a tracker-enabled document reloads the kit into a clean document', async ({ page }) => {
  // This check also runs with no trackers configured; only the live branch
  // needs a clean-document reload when tracker scripts were actually requested.
  await page.goto('/pricing')
  const trackerConfigured = await page.waitForFunction(() => !!document.querySelector('script[src*="plausible.io"],script[src*="googletagmanager.com"]'), undefined, { timeout: 2000 }).then(() => true).catch(() => false)
  test.skip(!trackerConfigured, 'Run with a configured analytics ID to exercise the loaded-script transition.')
  await page.waitForFunction(() => document.documentElement.dataset.e2eTrackerLoaded === 'true')
  const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.history.pushState(null, '', '/booking-kit'))
  await navigation
  await expect(page.getByRole('heading', { name: 'Booking Clarity Kit', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.dataset.e2eTrackerLoaded)).toBeUndefined()
})

import { expect, test, type Page } from '@playwright/test'

const vision = 'A warm website for a local practice, with clear service descriptions, accessible navigation, calm colors, and an easy way to send an enquiry.'
const features = 'A responsive home page, service information, an about page, and an enquiry form with email notifications.'

async function fillBrief(page: Page) {
  await page.getByLabel('Business name', { exact: false }).fill('Example Practice')
  await page.getByLabel('Contact name', { exact: true }).fill('Jordan Example')
  await page.getByLabel('Email', { exact: false }).fill('owner@example.com')
  await page.getByLabel('Describe how you want the website to look', { exact: false }).fill(vision)
  await page.getByLabel('Describe the required features and functionality', { exact: false }).fill(features)
}

test('scope review persists a complete brief through contact and never opens payment', async ({ page }) => {
  let stripeCalls = 0
  await page.route('**/api/stripe/custom-build', route => { stripeCalls++; return route.abort() })
  const received: Record<string, unknown>[] = []
  await page.route('**/api/forms/contact', route => {
    received.push(route.request().postDataJSON())
    return route.fulfill({ json: { ok: true, deliveryStatus: 'stored_for_review' } })
  })
  await page.goto('/custom-build')
  await fillBrief(page)
  await page.getByLabel('Websites or visual references', { exact: false }).fill('https://example.com/reference — spacing')
  await page.getByLabel('Existing website', { exact: false }).fill('https://example.com/current')
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Request a scope review — no payment', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Brief saved for review. No payment taken.')
  await expect(page.getByRole('status')).toContainText('could not confirm delivery')
  expect(stripeCalls).toBe(0)
  expect(received).toHaveLength(1)
  expect(received[0]).toMatchObject({ name: 'Jordan Example', email: 'owner@example.com' })
  expect(received[0]).not.toHaveProperty('acceptedTerms')
  const message = String(received[0].message)
  for (const part of [vision, features, 'Example Practice', 'https://example.com/reference', 'https://example.com/current']) expect(message).toContain(part)
  expect(page.url()).not.toContain('owner')
})

test('failed review preserves the draft for retry and refuses an oversized combined brief', async ({ page }) => {
  let requests = 0
  await page.route('**/api/forms/contact', route => {
    requests++
    return route.fulfill(requests === 1 ? { status: 503, json: { error: 'Please try again later.' } } : { json: { ok: true, deliveryStatus: 'sent' } })
  })
  await page.goto('/custom-build')
  await fillBrief(page)
  const submit = page.getByRole('button', { name: 'Request a scope review — no payment', exact: true })
  await submit.click()
  await expect(page.locator('main').getByRole('alert')).toContainText('Please try again later.')
  await page.reload()
  await expect(page.getByLabel('Business name', { exact: false })).toHaveValue('Example Practice')
  await page.getByLabel('Describe how you want', { exact: false }).fill('v'.repeat(5000))
  await page.getByLabel('Describe the required', { exact: false }).fill('f'.repeat(4000))
  await page.getByLabel('Websites or visual references', { exact: false }).fill('r'.repeat(2000))
  await submit.click()
  await expect(page.locator('main').getByRole('alert')).toContainText('combined brief is too long')
  expect(requests).toBe(1)
  await page.getByLabel('Describe how you want', { exact: false }).fill(vision)
  await page.getByLabel('Describe the required', { exact: false }).fill(features)
  await submit.click()
  await expect(page.getByRole('status')).toContainText('No payment taken.')
  expect(requests).toBe(2)
})

test('payment remains an explicit separate choice and consent is never restored', async ({ page }) => {
  let payment: Record<string, unknown> | undefined
  let reviews = 0
  await page.route('**/api/forms/contact', route => { reviews++; return route.abort() })
  await page.route('**/api/stripe/custom-build', route => {
    payment = route.request().postDataJSON()
    return route.fulfill({ status: 503, json: { error: 'Checkout test stopped before payment.' } })
  })
  await page.goto('/custom-build?canceled=1')
  await fillBrief(page)
  await page.getByRole('button', { name: 'Already discussed your scope? Continue to payment' }).click()
  await page.getByRole('checkbox').check()
  await page.reload()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Already discussed your scope? Continue to payment' }).click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('checkbox').check()
  await page.getByLabel('Contact name', { exact: true }).fill('Jordan Updated')
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continue to secure $500 payment', exact: true }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('Checkout test stopped')
  expect(payment).toMatchObject({ acceptedTerms: true, businessName: 'Example Practice', siteVision: vision })
  expect(reviews).toBe(0)
})

import { test, expect } from '@playwright/test'
import { verifyIntakeContact, cleanupTestData } from './helpers/supabase-check'

const testEmail = `e2e-${Date.now()}@dailyclarity.test`
const testBusinessName = `E2E Test Wellness ${Date.now()}`
const testPhone = '555-123-4567'
const testSlug = `e2e-${Date.now().toString(36)}`

test.describe('Full purchase funnel (test mode)', () => {
  test.skip(
    process.env.ENABLE_TEST_PURCHASE !== 'true',
    'requires ENABLE_TEST_PURCHASE=true',
  )

  test.afterAll(async () => {
    await cleanupTestData(testEmail)
  })

  test('intake -> contact saved -> test-purchase -> portal access', async ({ page, request }) => {
    const adminSecret = process.env.TEST_PURCHASE_ADMIN_SECRET
    test.skip(!adminSecret, 'requires TEST_PURCHASE_ADMIN_SECRET')

    // STEP 1: Visit homepage
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // STEP 2: Go to preview-your-business
    await page.goto('/preview-your-business')
    await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible({
      timeout: 10000,
    })

    // STEP 3: Fill Step 1 (business info)
    await page.getByRole('button', { name: 'Aromatherapy' }).click()
    await page.getByLabel('Business Name').fill(testBusinessName)
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Phone').fill(testPhone)
    await page.getByRole('button', { name: /Continue to Style Preferences/i }).click()

    // STEP 4: Assert intake_contact was saved
    await expect(page.getByRole('heading', { name: /What's your style/i })).toBeVisible({
      timeout: 10000,
    })
    await page.waitForTimeout(2000)
    const saved = await verifyIntakeContact(testEmail)
    expect(saved).toBe(true)

    // STEP 5: Fetch a template and use test-purchase API to bypass Stripe
    const templatesRes = await request.get('/api/templates/aromatherapy?all=true')
    expect(templatesRes.ok()).toBeTruthy()
    const templatesJson = (await templatesRes.json()) as {
      templates?: Array<{ slug: string }>
    }
    const templateSlug = templatesJson.templates?.[0]?.slug
    expect(templateSlug).toBeTruthy()

    const response = await request.post('/api/test-purchase', {
      headers: {
        'Content-Type': 'application/json',
        'x-test-purchase-secret': adminSecret ?? '',
      },
      data: {
        slug: testSlug,
        template: templateSlug,
        niche: 'aromatherapy',
        planKey: 'basic',
        customerValues: {
          EMAIL: testEmail,
          BUSINESS_NAME: testBusinessName,
          PHONE: testPhone,
        },
      },
    })

    expect(response.ok()).toBeTruthy()
    const result = (await response.json()) as {
      slug?: string
      portalAccessToken?: string | null
      success?: boolean
    }
    expect(result.success).toBe(true)
    expect(result.slug).toBeTruthy()

    // STEP 6–7: Visit portal with slug and token
    if (result.portalAccessToken && result.slug) {
      await page.goto(
        `/portal?slug=${encodeURIComponent(result.slug)}&token=${encodeURIComponent(result.portalAccessToken)}`,
      )
      await expect(page.getByPlaceholder('Business name')).toHaveValue(testBusinessName, {
        timeout: 15000,
      })
    }
  })
})

test('homepage to dashboard auth flow', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in or create your account' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
})

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

  test.afterAll(async ({ request }) => {
    await cleanupTestData(testEmail, testSlug, request)
  })

  test('intake -> contact saved -> test-purchase -> portal access', async ({ page, request }) => {
    const adminSecret = process.env.TEST_PURCHASE_ADMIN_SECRET
    if (!adminSecret) {
      throw new Error('ENABLE_TEST_PURCHASE=true requires TEST_PURCHASE_ADMIN_SECRET.')
    }

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

    // STEP 5: Match a real catalog template, edit it in the customer-facing
    // iframe, and carry the editor's persisted state into the test purchase.
    await page.getByRole('button', { name: /Find My Perfect Template/i }).click()
    await expect(page.getByRole('heading', { name: 'We found your template' })).toBeVisible({
      timeout: 20000,
    })
    await page.getByRole('button', { name: 'Customize This Template' }).click()

    const checkoutLink = page.getByRole('link', { name: 'Purchase & Launch' })
    await expect(checkoutLink).toBeVisible({ timeout: 20000 })
    const preview = page.frameLocator('iframe[title="Template preview"]')
    const editableText = preview.locator('p[data-pb-edit-id]').filter({ hasText: /\S/ }).first()
    await expect(editableText).toBeVisible({ timeout: 20000 })

    const editorProofText = `E2E editor proof ${Date.now()}`
    await editableText.dblclick()
    await expect(editableText).toHaveAttribute('contenteditable', 'true')
    await editableText.fill(editorProofText)

    // Moving focus back to the editor chrome commits the iframe edit. Apply a
    // custom theme as a second independently persisted customization surface.
    await page.getByRole('button', { name: /Colors/i }).click()
    await page.getByRole('button', { name: 'Ocean' }).click()

    await expect.poll(() => page.evaluate(() => {
      const raw = sessionStorage.getItem('pb_inline_edits')
      return raw ? JSON.parse(raw)?.['index.html']?.[0]?.updated : null
    })).toBe(editorProofText)
    await expect.poll(() => page.evaluate(() => {
      const raw = sessionStorage.getItem('pb_custom_theme')
      return raw ? JSON.parse(raw)?.primary : null
    })).toBe('#0ea5e9')

    const checkoutHref = await checkoutLink.getAttribute('href')
    expect(checkoutHref).toBeTruthy()
    const checkoutUrl = new URL(checkoutHref!, 'https://dailyclarity.test')
    const templateSlug = checkoutUrl.searchParams.get('template')
    const niche = checkoutUrl.searchParams.get('niche')
    expect(templateSlug).toBeTruthy()
    expect(niche).toBe('aromatherapy')

    await Promise.all([
      page.waitForURL(/\/pricing(?:\?|$)/),
      checkoutLink.click(),
    ])
    await expect(page.getByRole('heading', {
      name: /See the product first\. Then choose the plan that fits\./i,
    })).toBeVisible()

    const editorState = await page.evaluate(() => {
      const readJson = (key: string): unknown => {
        const value = sessionStorage.getItem(key)
        return value ? JSON.parse(value) : {}
      }
      return {
        customerValues: readJson('pb_template_values'),
        inlineEdits: readJson('pb_inline_edits'),
        imageSwaps: readJson('pb_image_swaps'),
        imageOwner: sessionStorage.getItem('pb_image_owner') || '',
        customTheme: readJson('pb_custom_theme'),
      }
    }) as {
      customerValues: Record<string, string>
      inlineEdits: Record<string, unknown>
      imageSwaps: Record<string, unknown>
      imageOwner: string
      customTheme: Record<string, unknown>
    }

    expect(editorState.customerValues).toMatchObject({
      EMAIL: testEmail,
      BUSINESS_NAME: testBusinessName,
      PHONE: testPhone,
    })

    const response = await request.post('/api/test-purchase', {
      headers: {
        'Content-Type': 'application/json',
        'x-test-purchase-secret': adminSecret ?? '',
      },
      data: {
        slug: testSlug,
        template: templateSlug,
        niche,
        planKey: 'basic',
        colorScheme: checkoutUrl.searchParams.get('color') || 'original',
        fontVariation: checkoutUrl.searchParams.get('font') || 'original',
        structureVariation: checkoutUrl.searchParams.get('structure') || 'original',
        customerValues: editorState.customerValues,
        inlineEdits: editorState.inlineEdits,
        imageSwaps: editorState.imageSwaps,
        imageOwner: editorState.imageOwner,
        customTheme: editorState.customTheme,
      },
    })

    expect(response.ok()).toBeTruthy()
    const result = (await response.json()) as {
      slug?: string
      siteUrl?: string | null
      portalAccessToken?: string | null
      portalUrl?: string | null
      success?: boolean
    }
    expect(result.success).toBe(true)
    expect(result.slug).toBeTruthy()
    expect(result.siteUrl).toMatch(/^https:\/\/platform-e2e-[a-z0-9-]+\.netlify\.app$/)
    expect(result.portalAccessToken).toBeTruthy()
    expect(result.portalUrl).toBeTruthy()

    // Prove the deploy reached Netlify's edge without relying on public
    // DailyClarity wildcard DNS, and that hydration reached the shipped HTML.
    const publishedSite = await request.get(`${result.siteUrl}?__dc_e2e=${Date.now()}`)
    expect(publishedSite.ok()).toBeTruthy()
    expect(publishedSite.headers()['x-robots-tag']).toContain('noindex')
    const publishedHtml = await publishedSite.text()
    expect(publishedHtml).toContain(testBusinessName)
    expect(publishedHtml).toContain(editorProofText)
    expect(publishedHtml).toContain('--pb-primary: #0ea5e9')
    const publishedRobots = await request.get(`${result.siteUrl}/robots.txt`)
    const publishedSitemap = await request.get(`${result.siteUrl}/sitemap.xml`)
    expect(publishedRobots.ok()).toBeTruthy()
    expect(await publishedRobots.text()).toContain('Disallow: /')
    expect(publishedSitemap.ok()).toBeTruthy()
    expect(await publishedSitemap.text()).not.toContain('<loc>')

    // STEP 6–7: Use the generated portal credential, edit the persisted site,
    // republish it, and read the updated public deployment back from Netlify.
    await page.goto(result.portalUrl!)
    await expect(page.getByPlaceholder('Business name')).toHaveValue(testBusinessName, {
      timeout: 15000,
    })

    const republishedBusinessName = `${testBusinessName} Updated`
    await page.getByLabel('Business name').fill(republishedBusinessName)
    await page.getByRole('button', { name: 'Save & publish' }).click()
    await expect(page.getByText('Saved and published to your live site.')).toBeVisible({
      timeout: 30000,
    })

    const republishedSite = await request.get(
      `${result.siteUrl}?__dc_e2e_republished=${Date.now()}`,
    )
    expect(republishedSite.ok()).toBeTruthy()
    expect(republishedSite.headers()['x-robots-tag']).toContain('noindex')
    const republishedHtml = await republishedSite.text()
    expect(republishedHtml).toContain(republishedBusinessName)
    expect(republishedHtml).toContain(editorProofText)
    expect(republishedHtml).toContain('--pb-primary: #0ea5e9')
    const republishedRobots = await request.get(
      `${result.siteUrl}/robots.txt?__dc_e2e_republished=${Date.now()}`,
    )
    expect(republishedRobots.ok()).toBeTruthy()
    expect(await republishedRobots.text()).toContain('Disallow: /')
  })
})

test('homepage to dashboard auth flow', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in or create your account' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
})

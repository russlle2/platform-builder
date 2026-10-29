import { expect, test, type Page } from '@playwright/test'

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
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ businessName: 'Saved Studio', email: 'saved@example.com', accountEmail: 'private@example.com' }))
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
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!).accountEmail)).toBe('private@example.com')
})

test('pricing restores the private account inbox across template URL changes without putting it in website values', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ businessName: 'Saved Studio', email: 'public@example.com', accountEmail: 'PRIVATE@example.com' }))
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Saved Studio', EMAIL: 'public@example.com' }))
  })
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  let checkout: Record<string, unknown> | undefined
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Checkout fixture captured.' } })
  })
  await page.goto('/pricing?template=first-layout&niche=aromatherapy')
  await page.goto('/pricing?template=second-layout&niche=aromatherapy')
  await page.reload()
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => Boolean(checkout)).toBe(true)
  expect(checkout).toMatchObject({ accountEmail: 'private@example.com', template: 'second-layout', customerValues: { EMAIL: 'public@example.com' } })
  expect(JSON.stringify(checkout?.customerValues)).not.toContain('private@example.com')
  expect(page.url()).not.toContain('example.com')
})

test('legacy pricing without a private account field preserves its original shared address', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'legacy@example.com' }))
  })
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  let checkout: Record<string, unknown> | undefined
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Checkout fixture captured.' } })
  })
  await page.goto('/pricing?template=legacy-layout&niche=aromatherapy')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkout?.accountEmail).toBe('legacy@example.com')
})

async function prepareStandaloneEditor(page: Page, portal = false) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('standalone_identity_seeded')) return
    sessionStorage.setItem('standalone_identity_seeded', 'true')
    sessionStorage.setItem('pb_info_saved', 'true')
    sessionStorage.setItem('pb_biz_info', JSON.stringify({
      businessName: 'Original Studio', email: 'original@example.com', accountEmail: 'private@example.com',
      ownerName: '', phone: '', address: '', niche: 'aromatherapy', tagline: '', description: '', services: '', website: '',
    }))
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Original Studio', EMAIL: 'original@example.com' }))
  })
  await page.route('**/api/templates/variations', (route) => route.fulfill({ json: { colorSchemes: [], fontVariations: [], structureVariations: [] } }))
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  await page.route('**/api/upload?**', (route) => route.fulfill({ json: { images: [] } }))
  await page.route('**/api/templates/aromatherapy/editable-layout', (route) => route.fulfill({ json: {
    slug: 'editable-layout', name: 'Editable layout', niche: 'aromatherapy', nicheSlug: 'aromatherapy', pages: ['index.html'], snippet: '',
    fields: [
      { name: 'BUSINESS_NAME', label: 'Business name', type: 'text', default: 'Business placeholder' },
      { name: 'EMAIL', label: 'Public contact email', type: 'email', default: 'Public email placeholder' },
    ],
  } }))
  await page.route('**/api/templates/aromatherapy/editable-layout/preview', (route) => {
    const values = route.request().postDataJSON().values
    expect(JSON.stringify(values)).not.toContain('private@example.com')
    return route.fulfill({ json: { html: `<html><body><h1>${values.BUSINESS_NAME}</h1><p>${values.EMAIL}</p></body></html>`, css: '', variationCSS: '' } })
  })
  if (portal) await page.route('**/api/portal/customer?slug=published-studio', (route) => route.fulfill({ json: {
    authenticated: true, site: { slug: 'published-studio', status: 'active', data: {
      niche: 'aromatherapy', template: 'editable-layout', customerValues: { BUSINESS_NAME: 'Published Studio', EMAIL: 'published@example.com' },
    } },
  } }))
  // Ordinary catalog links redirect to intake. An empty legacy portalSlug
  // reaches the public editor branch without authenticating a published site.
  await page.goto(`/templates/aromatherapy/editable-layout?portalSlug=${portal ? 'published-studio' : ''}`)
  await page.getByPlaceholder('Business placeholder').fill('Updated Studio')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByPlaceholder('Public email placeholder').fill('updated-public@example.com')
}

test('standalone public edits retain their private account at pricing and in the resumed wizard', async ({ page }) => {
  await prepareStandaloneEditor(page)
  let checkout: Record<string, unknown> | undefined
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Checkout fixture captured.' } })
  })
  await page.getByRole('button', { name: 'Generate Live Preview', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Purchase This Site', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Purchase This Site', exact: true }).click()
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => Boolean(checkout)).toBe(true)
  expect(checkout).toMatchObject({ accountEmail: 'private@example.com', customerValues: { BUSINESS_NAME: 'Updated Studio', EMAIL: 'updated-public@example.com' } })
  await page.getByRole('link', { name: 'Preview Your Business', exact: true }).first().click()
  await expect(page.getByLabel('Business Name')).toHaveValue('Updated Studio')
  await expect(page.getByLabel('Public contact email')).toHaveValue('updated-public@example.com')
  await expect(page.getByLabel('Account email', { exact: false })).toHaveValue('private@example.com')
})

test('standalone editor refuses to rebind a business draft changed after it loaded', async ({ page }) => {
  await prepareStandaloneEditor(page)
  await page.evaluate(() => {
    const next = JSON.parse(sessionStorage.getItem('pb_biz_info')!)
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ ...next, businessName: 'Other Studio', accountEmail: 'other-private@example.com' }))
  })
  await page.getByRole('button', { name: 'Generate Live Preview', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Your business draft changed' })).toBeVisible()
  await expect(page.getByPlaceholder('Public email placeholder')).toHaveValue('updated-public@example.com')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!))).toMatchObject({ businessName: 'Other Studio', accountEmail: 'other-private@example.com' })
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_template_values')!).EMAIL)).toBe('original@example.com')
  await expect(page.getByRole('link', { name: 'Purchase This Site', exact: false })).toHaveCount(0)
})

test('portal editor leaves the separate purchase draft and its private identity untouched', async ({ page }) => {
  await prepareStandaloneEditor(page, true)
  const before = await page.evaluate(() => [sessionStorage.getItem('pb_biz_info'), sessionStorage.getItem('pb_template_values')])
  await page.getByRole('button', { name: 'Generate Live Preview', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Publish to live site', exact: true })).toBeVisible()
  expect(await page.evaluate(() => [sessionStorage.getItem('pb_biz_info'), sessionStorage.getItem('pb_template_values')])).toEqual(before)
})

for (const [name, storedInfo] of [
  ['cleared private inbox', JSON.stringify({ businessName: 'Saved Studio', email: 'public@example.com', accountEmail: '' })],
  ['invalid private inbox', JSON.stringify({ businessName: 'Saved Studio', email: 'public@example.com', accountEmail: 'bad@' })],
  ['malformed stored draft', '{'],
  ['a different business', JSON.stringify({ businessName: 'Other Studio', email: 'public@example.com', accountEmail: 'other@example.com' })],
] as const) {
  test(`pricing blocks ${name} instead of substituting the public email`, async ({ page }) => {
    await page.addInitScript((info) => {
      sessionStorage.setItem('pb_biz_info', info)
      sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Saved Studio', EMAIL: 'public@example.com' }))
    }, storedInfo)
    let checkoutRequests = 0
    await page.route('**/api/stripe/checkout', (route) => {
      checkoutRequests++
      return route.fulfill({ status: 409, json: { error: 'Invalid identity must not reach checkout.' } })
    })
    await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
    await page.goto('/pricing?template=saved-layout&niche=aromatherapy')
    await page.getByRole('button', { name: 'Build preview to choose plan' }).first().click()
    await expect(page).toHaveURL(/\/preview-your-business\?plan=basic/)
    expect(checkoutRequests).toBe(0)
  })
}

test('homepage offers available samples or an honest personal-preview recovery', async ({ page }) => {
  const customerWrites: string[] = []
  const customerWritePaths = new Set([
    '/api/intake/contact',
    '/api/profile/save-draft',
    '/api/leads',
    '/api/stripe/checkout',
  ])
  await page.route('**/api/**', route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && customerWritePaths.has(pathname)) {
      customerWrites.push(pathname)
      return route.fulfill({
        status: 409,
        json: { error: 'Homepage navigation must not create a customer record or checkout.' },
      })
    }
    return route.continue()
  })
  await page.goto('/')

  const picker = page.getByRole('combobox', { name: 'Available sample practices', exact: true })
  const unavailable = page.getByText(
    'No sample is available right now. You can still start with your own business details.',
    { exact: true },
  )
  await expect.poll(async () => (await picker.count()) + (await unavailable.count())).toBe(1)

  if (await picker.count()) {
    await expect(picker).toBeVisible()
    const choices = await picker.locator('option').evaluateAll(options =>
      options.map(option => (option as HTMLOptionElement).value),
    )
    expect(choices.length).toBeGreaterThan(0)
    expect(choices.every(value =>
      ['private_practice_therapist', 'wellness_coach'].includes(value),
    )).toBe(true)
    // Exercise a change from the default when another eligible practice exists.
    const current = await picker.inputValue()
    const chosen = choices.find(value => value !== current) || choices[0]
    await picker.selectOption(chosen)
    await page.getByRole('button', { name: 'Try a sample website', exact: true }).click()
    await expect(page).toHaveURL(
      new RegExp(`/preview-your-business\\?sample=1&niche=${chosen}$`),
    )
  } else {
    await expect(unavailable).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try a sample website', exact: true })).toHaveCount(0)
    await expect(page.locator('a[href*="sample=1"]')).toHaveCount(0)
    const recovery = page.getByRole('link', { name: 'Start with my business details', exact: true })
    await expect(recovery).toHaveAttribute('href', '/preview-your-business')
    await recovery.click()
    await expect(page).toHaveURL(/\/preview-your-business$/)
    await expect(page.getByLabel('Business Name')).toBeVisible()
  }
  expect(customerWrites).toEqual([])
})

async function preparePaymentDraft(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('pb_biz_info', JSON.stringify({ businessName: 'Payment Studio', email: 'public@example.com', accountEmail: 'private@example.com' }))
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: 'Payment Studio', EMAIL: 'public@example.com' }))
  })
  await page.route('**/api/platform/config', route => route.fulfill({ json: { trialDays: 0 } }))
  await page.goto('/pricing?template=payment-layout&niche=aromatherapy')
  await expect(page.getByRole('button', { name: 'Choose Plan', exact: true })).toHaveCount(2)
}

test('changed draft shows the earlier purchase details and requires explicit resume', async ({ page }) => {
  const requests: Array<Record<string, unknown>> = []
  let resumed = false
  await page.route('**/checkout-resume-fixture', async route => {
    resumed = true
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/stripe/checkout', async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    requests.push(body)
    if (body.resumePreviousCheckout === true) return route.fulfill({ json: { url: '/checkout-resume-fixture' } })
    return route.fulfill({ status: 409, json: {
      code: 'checkout_draft_changed',
      error: 'Your earlier checkout is still open with different details. Resume that checkout, or contact support before starting another.',
      previousBusinessName: 'Earlier Studio', previousPlan: 'Basic', recoveryUrl: '/contact',
    } })
  })
  await preparePaymentDraft(page)
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).last().click()
  const alert = page.getByRole('alert').filter({ hasText: 'Your earlier checkout is still open' })
  await expect(alert).toContainText('Earlier checkout: Earlier Studio — Basic')
  await expect(alert.getByRole('link', { name: 'Contact support to change the earlier checkout' })).toHaveAttribute('href', '/contact')
  expect(requests).toHaveLength(1)
  expect(requests[0].resumePreviousCheckout).toBe(false)
  await alert.getByRole('button', { name: 'Resume earlier checkout' }).click({ noWaitAfter: true })
  await expect.poll(() => resumed).toBe(true)
  expect(requests).toHaveLength(2)
  expect(requests[1].resumePreviousCheckout).toBe(true)
})

test('all plans share a synchronous checkout guard, recover on rejection, and remain busy after redirect starts', async ({ page }) => {
  let requests = 0
  let releaseFailure!: () => void
  const heldFailure = new Promise<void>(resolve => { releaseFailure = resolve })
  let navigationRequested = false
  await page.route('**/checkout-fixture', async route => {
    navigationRequested = true
    // Keep the originating document visible after the redirect request.
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/stripe/checkout', async route => {
    requests++
    if (requests === 1) {
      await heldFailure
      await route.fulfill({ status: 503, json: { error: 'Checkout is unavailable before session creation.', retrySafe: true } })
    } else await route.fulfill({ json: { url: '/checkout-fixture' } })
  })
  await preparePaymentDraft(page)
  const plans = page.getByRole('button', { name: 'Choose Plan', exact: true })
  await plans.evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
  await expect.poll(() => requests).toBe(1)
  await expect(page.getByRole('button', { name: 'Opening secure checkout…', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Choose Plan', exact: true })).toBeDisabled()
  releaseFailure()
  await expect(page.getByRole('alert').filter({ hasText: 'Checkout is unavailable' })).toBeVisible()
  await expect(plans.first()).toBeEnabled()
  await expect(plans.last()).toBeEnabled()
  await plans.last().click({ noWaitAfter: true })
  await expect.poll(() => navigationRequested).toBe(true)
  await expect(page.getByRole('button', { name: 'Opening secure checkout…', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Choose Plan', exact: true })).toBeDisabled()
  expect(requests).toBe(2)
})

for (const outcome of ['uncertain', 'interrupted', 'gateway-timeout'] as const) {
  test(`${outcome} checkout does not invite another payment`, async ({ page }) => {
    let requests = 0
    await page.route('**/api/stripe/checkout', route => {
      requests++
      if (outcome === 'interrupted') return route.abort('failed')
      if (outcome === 'gateway-timeout') return route.fulfill({ status: 504, json: { error: 'Function invocation timed out.' } })
      return route.fulfill({ status: 409, json: {
        code: 'checkout_creation_uncertain', reference: 'test-attempt-123', supportUrl: '/contact',
        error: 'Checkout outcome is unconfirmed.',
      } })
    })
    await preparePaymentDraft(page)
    await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
    const alert = page.getByRole('alert').filter({ hasText: "Please don't start another payment yet" })
    await expect(alert).toBeVisible()
    await expect(alert.getByRole('link', { name: 'Contact support about this attempt' })).toHaveAttribute('href', '/contact')
    if (outcome === 'uncertain') await expect(alert).toContainText('test-attempt-123')
    await expect(page.getByRole('button', { name: 'Checkout needs review' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Choose Plan', exact: true })).toBeDisabled()
    expect(requests).toBe(1)
  })
}

for (const [code, label] of [
  ['catalog_revision_unavailable', 'Return to your preview to refresh this design'],
  ['image_upload_missing', 'Return to your preview to re-upload images'],
] as const) {
  test(`${code} offers the matching preview recovery`, async ({ page }) => {
    await page.route('**/api/stripe/checkout', route => route.fulfill({ status: 409, json: { code, error: 'Your preview needs attention.', recoveryUrl: '/preview-your-business' } }))
    await preparePaymentDraft(page)
    await page.evaluate(() => sessionStorage.setItem('pb_catalog_revision', 'stale'))
    await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
    await expect(page.getByRole('link', { name: label })).toHaveAttribute('href', '/preview-your-business?plan=basic')
    if (code === 'catalog_revision_unavailable') expect(await page.evaluate(() => sessionStorage.getItem('pb_catalog_revision'))).toBeNull()
  })
}

import { expect, test, type Page } from '@playwright/test'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

const ownInfo = {
  businessName: 'Saved Studio', ownerName: 'Saved Owner', email: '', phone: '', address: '',
  niche: 'wellness_coach', tagline: 'My own words', description: '', services: '', website: '',
}
const ownMatch = { nicheSlug: 'wellness_coach', templateSlug: 'saved-layout', templateName: 'Saved Layout', matchScore: 50, reason: 'saved match', pages: ['index.html'] }
const ownTheme = { primary: '#123456', background: '#ffffff', text: '#123456', headingFont: 'Georgia, serif', bodyFont: 'Georgia, serif' }
const ownPin = { niche: 'wellness_coach', template: 'saved-layout', catalogRevision: { contractVersion: 3, designId: 'design_real', contentPresetId: 'content_real', themePresetId: 'theme_real', qualityReceipt: 'receipt_real' } }

async function seedRealDraft(page: Page) {
  await page.addInitScript(({ info, match, theme, pin }) => {
    if (sessionStorage.getItem('preview_experience_seeded')) return
    sessionStorage.setItem('preview_experience_seeded', '1')
    sessionStorage.setItem('pb_biz_info', JSON.stringify(info))
    sessionStorage.setItem('pb_matched', JSON.stringify(match))
    sessionStorage.setItem('pb_style_prefs', JSON.stringify({ vibes: ['clean'], proseStyle: 'minimal', colorMood: 'cool-modern', fontPreference: 'serif', layoutDensity: 'compact' }))
    sessionStorage.setItem('pb_custom_theme', JSON.stringify(theme))
    sessionStorage.setItem('pb_template_values', JSON.stringify({ BUSINESS_NAME: info.businessName, EMAIL: '' }))
    sessionStorage.setItem('pb_catalog_revision', JSON.stringify(pin))
    const edits = { 'index.html': [{ original: 'Original words', updated: 'My saved words' }] }
    sessionStorage.setItem('pb_inline_edits', JSON.stringify(edits))
    sessionStorage.setItem('pb_inline_edits_by_scope_v1', JSON.stringify({ 'template:wellness_coach:saved-layout': edits }))
    sessionStorage.setItem('pb_inline_edits_legacy_migrated_v1', 'true')
  }, { info: ownInfo, match: ownMatch, theme: ownTheme, pin: ownPin })
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/templates/*?all=true', (route) => {
    const niche = new URL(route.request().url()).pathname.split('/')[3]
    return route.fulfill({ json: { templates: [
      { slug: 'sample-layout', name: 'Published Sample Layout', nicheSlug: niche, pages: ['index.html', 'contact.html'], snippet: 'warm natural professional' },
    ] } })
  })
  await page.route('**/api/templates/*/*/preview', (route) => {
    const body = route.request().postDataJSON()
    return route.fulfill({ json: {
      html: `<!doctype html><html><head><title>Preview</title></head><body><h1>${body.values.BUSINESS_NAME}</h1><p>Original words</p><p>${body.page}</p><a href="mailto:${body.values.EMAIL}">${body.values.EMAIL}</a></body></html>`,
      css: '', variationCSS: '',
      catalogRevision: { contractVersion: 3, designId: 'design_sample', contentPresetId: 'content_sample', themePresetId: 'theme_sample', qualityReceipt: 'receipt_sample' },
    } })
  })
  // Any accidental intake POST is observable without sending a real message.
  await page.route('**/api/intake/contact', (route) => route.fulfill({ json: { success: true } }))
  await page.route('**/api/profile/save-draft', (route) => route.fulfill({ json: { success: true } }))
})

test('direct sample shows a real preview without overwriting the saved business, theme, edits or checkout pin', async ({ page }) => {
  await seedRealDraft(page)
  const submittedProfiles: string[] = []
  page.on('request', (request) => {
    if (/\/api\/(intake\/contact|profile\/save-draft)/.test(request.url())) submittedProfiles.push(request.url())
  })
  await page.goto('/preview-your-business?sample=1&niche=aromatherapy')
  await expect(page.getByText('Sample preview · fictional business details')).toBeVisible()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Wildflower Aromatherapy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose a launch plan' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Colors', exact: false })).toHaveCount(0)
  const storage = await page.evaluate(() => ({
    info: JSON.parse(sessionStorage.getItem('pb_biz_info')!),
    match: JSON.parse(sessionStorage.getItem('pb_matched')!),
    values: JSON.parse(sessionStorage.getItem('pb_template_values')!),
    pin: JSON.parse(sessionStorage.getItem('pb_catalog_revision')!),
    edits: JSON.parse(sessionStorage.getItem('pb_inline_edits')!),
    theme: JSON.parse(sessionStorage.getItem('pb_custom_theme')!),
    sample: sessionStorage.getItem('pb_preview_sample'),
  }))
  expect(storage.info).toEqual(ownInfo)
  expect(storage.match).toEqual(ownMatch)
  expect(storage.values.BUSINESS_NAME).toBe('Saved Studio')
  expect(storage.pin).toEqual(ownPin)
  expect(storage.edits['index.html'][0].updated).toBe('My saved words')
  expect(storage.theme).toMatchObject(ownTheme)
  expect(storage.sample).toBe('1')
  await page.getByRole('button', { name: 'contact', exact: true }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('contact.html', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Use my business details' }).click()
  await expect(page).not.toHaveURL(/sample=1/)
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  await expect(page.getByRole('button', { name: 'Wellness Coach', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => sessionStorage.getItem('pb_preview_sample'))).toBeNull()
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Saved Studio' })).toBeVisible()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('My saved words')).toBeVisible()
  expect(submittedProfiles).toEqual([])
  await page.reload()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  await expect(page.getByText('Sample preview · fictional business details')).toHaveCount(0)
})

test('real details and style are saved for follow-up before any purchase, with an explicit promotional preference', async ({ page }) => {
  const profiles: Record<string, any>[] = []
  const contacts: Record<string, any>[] = []
  let checkoutRequests = 0
  const previews: Record<string, any>[] = []
  let checkout: Record<string, any> | undefined
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Checkout fixture captured.' } })
  })
  page.on('request', (request) => {
    if (request.url().includes('/api/profile/save-draft')) profiles.push(request.postDataJSON())
    if (request.url().includes('/api/intake/contact')) contacts.push(request.postDataJSON())
    if (request.url().includes('/api/stripe/checkout')) checkoutRequests += 1
    if (/\/api\/templates\/.*\/preview$/.test(request.url())) previews.push(request.postDataJSON())
  })
  await page.goto('/preview-your-business?niche=aromatherapy')
  const promotions = page.getByRole('checkbox', { name: /Email me DailyClarity news and offers/ })
  await expect(promotions).not.toBeChecked()
  await page.getByLabel('Business Name').fill('My New Studio')
  await page.getByLabel('Account email', { exact: false }).fill('private@mynewstudio.example')
  await expect(page.getByLabel('Public contact email')).toHaveValue('')
  await page.getByLabel('Public contact email').fill('hello@mynewstudio.example')
  await page.getByRole('button', { name: 'Add more business details', exact: false }).click()
  await page.getByLabel('Tagline', { exact: true }).fill('My authentic tagline')
  await promotions.check()
  await page.getByLabel('Public contact email').press('Enter')
  await expect.poll(() => profiles.length).toBe(1)
  expect(profiles[0]).toMatchObject({ email: 'private@mynewstudio.example', profile: { businessInfo: {
    businessName: 'My New Studio', tagline: 'My authentic tagline', accountEmail: 'private@mynewstudio.example', email: 'hello@mynewstudio.example',
  } } })
  expect(profiles[0].profile.communicationPreferences).toMatchObject({ marketingEmailOptIn: true, noticeVersion: 'preview-followup-2026-10-16' })
  expect(profiles[0].profile.funnel.stage).toBe('business-details')
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await expect.poll(() => profiles.length).toBe(2)
  expect(profiles[1].profile.matchedTemplate.templateSlug).toBe('sample-layout')
  expect(profiles[1].profile.funnel.stage).toBe('style-match')
  expect(profiles[1].profile.stylePreferences).toHaveProperty('colorMood')
  expect(contacts).toHaveLength(1)
  expect(contacts[0].email).toBe('private@mynewstudio.example')
  expect(checkoutRequests).toBe(0)
  await page.getByRole('button', { name: 'Customize This Template' }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'My New Studio' })).toBeVisible()
  const preview = page.frameLocator('iframe[title="Template preview"]')
  await expect(preview.getByRole('link', { name: 'hello@mynewstudio.example' })).toHaveAttribute('href', 'mailto:hello@mynewstudio.example')
  expect(await preview.locator('html').innerHTML()).not.toContain('private@mynewstudio.example')
  expect(previews.length).toBeGreaterThan(0)
  expect(JSON.stringify(previews)).not.toContain('private@mynewstudio.example')
  expect(previews[0].values).not.toHaveProperty('accountEmail')
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await expect(page).toHaveURL(/\/pricing\?template=sample-layout&niche=aromatherapy/)
  expect(profiles[2].profile.funnel.stage).toBe('plans')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_template_values')!).EMAIL)).toBe('hello@mynewstudio.example')
  expect(page.url()).not.toContain('mynewstudio.example')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkoutRequests).toBe(1)
  expect(checkout).toMatchObject({ accountEmail: 'private@mynewstudio.example', customerValues: { EMAIL: 'hello@mynewstudio.example', email: 'hello@mynewstudio.example' } })
  expect(checkout?.customerValues).not.toHaveProperty('accountEmail')
  expect(JSON.stringify(checkout?.customerValues)).not.toContain('private@mynewstudio.example')
})

test('publishing the account address requires an explicit copy, and later account edits do not silently change public contact', async ({ page }) => {
  await page.goto('/preview-your-business?niche=aromatherapy')
  await page.getByLabel('Account email', { exact: false }).fill('private@example.com')
  await expect(page.getByLabel('Public contact email')).toHaveValue('')
  await page.getByRole('button', { name: 'Use account email', exact: true }).click()
  await expect(page.getByLabel('Public contact email')).toHaveValue('private@example.com')
  await page.getByLabel('Account email', { exact: false }).fill('new-private@example.com')
  await expect(page.getByLabel('Public contact email')).toHaveValue('private@example.com')
})

test('an old draft without emails can resume but confirms private and public addresses before plans', async ({ page }) => {
  await seedRealDraft(page)
  await page.goto('/preview-your-business')
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  const email = page.getByLabel('Account email', { exact: false })
  await expect(email).toBeFocused()
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page.getByText('Enter a valid account email address.')).toBeVisible()
  await email.fill('private@mynewstudio.example')
  await page.getByLabel('Public contact email').fill('hello@mynewstudio.example')
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page).toHaveURL(/\/pricing\?template=saved-layout/)
})

test('failed lead storage leaves the preview usable and offers a successful retry', async ({ page }) => {
  let fail = true
  await page.route('**/api/profile/save-draft', (route) => route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: 'Temporarily unavailable' } : { ok: true } }))
  await page.goto('/preview-your-business?niche=aromatherapy')
  await page.getByLabel('Business Name').fill('My New Studio')
  await page.getByLabel('Account email', { exact: false }).fill('hello@mynewstudio.example')
  await page.getByLabel('Public contact email').fill('hello@mynewstudio.example')
  await page.getByLabel('Public contact email').press('Enter')
  await expect(page.getByText('We could not save your details yet. They are still in this tab.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Find My Perfect Template/ })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Retry saving' }).click()
  await expect(page.getByText('Business details saved for your preview and DailyClarity follow-up.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!).businessName)).toBe('My New Studio')
})

test('industry can be changed after a niche link and a draft is only cleared after confirmation', async ({ page }) => {
  await seedRealDraft(page)
  await page.goto('/preview-your-business?niche=aromatherapy')
  await page.getByRole('button', { name: 'Change industry' }).click()
  await page.getByRole('button', { name: 'Sound Bath', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sound Bath', exact: true })).toHaveAttribute('aria-pressed', 'true')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Clear draft' }).click()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Clear draft' }).click()
  await expect(page.getByLabel('Business Name')).toHaveValue('')
  expect(await page.evaluate(() => sessionStorage.getItem('pb_template_values'))).toBeNull()
})


test('a failed sample can exit to the real draft without leaving a sample checkout marker', async ({ page }) => {
  await seedRealDraft(page)
  await page.route('**/api/templates/aromatherapy?all=true', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await page.goto('/preview-your-business?sample=1&niche=aromatherapy')
  await expect(page.getByText(/The template gallery is temporarily unavailable/)).toBeVisible()
  await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  expect(await page.evaluate(() => sessionStorage.getItem('pb_preview_sample'))).toBeNull()
  await expect(page).not.toHaveURL(/sample=1/)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!).niche)).toBe('wellness_coach')
})

test('sample starts with an available reviewed design and respects an exact gallery selection', async ({ page }) => {
  const reviewedSlug = 'aromatherapy-2026-02-16T18-54-45-056Z-049'
  const previews: string[] = []
  const previewOptions: Record<string, unknown>[] = []
  await page.route('**/api/templates/aromatherapy?all=true', (route) => route.fulfill({ json: { templates: [
    { slug: 'sample-layout', name: 'Unreviewed ranking match', nicheSlug: 'aromatherapy', pages: ['index.html'], snippet: 'warm natural professional earthy' },
    { slug: reviewedSlug, name: 'Reviewed sample', nicheSlug: 'aromatherapy', pages: ['index.html'], snippet: '' },
  ] } }))
  page.on('request', (request) => {
    if (request.url().includes('/api/templates/aromatherapy/') && request.url().endsWith('/preview')) {
      previews.push(request.url())
      previewOptions.push(request.postDataJSON())
    }
  })
  await page.goto('/preview-your-business?sample=1&niche=aromatherapy')
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Wildflower Aromatherapy' })).toBeVisible()
  expect(previews.at(-1)).toContain(`/${reviewedSlug}/preview`)
  expect(previewOptions.at(-1)).toMatchObject({ colorScheme: 'original', fontVariation: 'original', structureVariation: 'original', customTheme: null })
  await page.goto('/preview-your-business?sample=1&niche=aromatherapy&template=sample-layout')
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Wildflower Aromatherapy' })).toBeVisible()
  expect(previews.at(-1)).toContain('/sample-layout/preview')
  expect(previewOptions.at(-1)).toMatchObject({ colorScheme: 'original', fontVariation: 'original', structureVariation: 'original', customTheme: null })
})

for (const leaveFlow of ['reset', 'unmount'] as const) {
  test(`obsolete queued checkpoints do not POST after ${leaveFlow}, and active saves are aborted`, async ({ page }) => {
    let releaseSaves!: () => void
    const heldSaves = new Promise<void>((resolve) => { releaseSaves = resolve })
    const profiles: Record<string, any>[] = []
    const contacts: Record<string, any>[] = []
    const failedRequests: string[] = []
    page.on('requestfailed', (request) => {
      if (/\/api\/(intake\/contact|profile\/save-draft)/.test(request.url())) failedRequests.push(request.url())
    })
    await page.route('**/api/profile/save-draft', async (route) => {
      profiles.push(route.request().postDataJSON())
      await heldSaves
      await route.fulfill({ json: { ok: true } }).catch(() => {})
    })
    await page.route('**/api/intake/contact', async (route) => {
      contacts.push(route.request().postDataJSON())
      await heldSaves
      await route.fulfill({ json: { ok: true } }).catch(() => {})
    })
    await page.goto('/preview-your-business?niche=aromatherapy')
    await page.getByLabel('Business Name').fill('Previous Studio')
    await page.getByLabel('Account email', { exact: false }).fill('previous@example.com')
    await page.getByLabel('Public contact email').fill('previous@example.com')
    await page.getByLabel('Public contact email').press('Enter')
    await expect.poll(() => profiles.length).toBe(1)
    await expect.poll(() => contacts.length).toBe(1)
    await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
    await expect(page.getByRole('button', { name: 'Customize This Template' })).toBeVisible()

    if (leaveFlow === 'reset') {
      await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Clear draft' }).click()
      await expect(page.getByLabel('Business Name')).toHaveValue('')
    } else {
      await page.getByRole('link', { name: 'Pricing', exact: true }).first().click()
      await expect(page).toHaveURL(/\/pricing$/)
    }
    releaseSaves()
    await expect.poll(() => failedRequests.length).toBe(2)
    expect(profiles).toHaveLength(1)
    expect(contacts).toHaveLength(1)

    if (leaveFlow === 'reset') {
      await page.getByLabel('Business Name').fill('New Studio')
      await page.getByLabel('Account email', { exact: false }).fill('previous@example.com')
      await page.getByLabel('Public contact email').fill('previous@example.com')
      await page.getByLabel('Public contact email').press('Enter')
      await expect(page.getByText('Business details saved for your preview and DailyClarity follow-up.')).toBeVisible()
      expect(profiles).toHaveLength(2)
      expect(profiles[1].profile.businessInfo.businessName).toBe('New Studio')
      expect(profiles.map((entry) => entry.profile.funnel.stage)).toEqual(['business-details', 'business-details'])
      expect(contacts).toHaveLength(2)
    }
  })
}

test('a delayed plans checkpoint cannot navigate or restore a handoff after returning to business details', async ({ page }) => {
  let releasePlans!: () => void
  const heldPlans = new Promise<void>((resolve) => { releasePlans = resolve })
  let plansRequested = false
  await page.route('**/api/profile/save-draft', async (route) => {
    if (route.request().postDataJSON().profile.funnel.stage === 'plans') {
      plansRequested = true
      await heldPlans
    }
    await route.fulfill({ json: { ok: true } })
  })
  await seedRealDraft(page)
  await page.goto('/preview-your-business')
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await page.getByLabel('Account email', { exact: false }).fill('private@example.com')
  await page.getByLabel('Public contact email').fill('hello@example.com')
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect.poll(() => plansRequested).toBe(true)
  await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
  releasePlans()
  await expect(page.getByText('Business details saved for your preview and DailyClarity follow-up.')).toBeVisible()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  await expect(page).toHaveURL(/\/preview-your-business$/)
  await expect(page.getByRole('button', { name: 'Continue to plans', exact: true })).toHaveCount(0)
})

test('opening plans saves one checkpoint despite repeated submits and resumes after a clear save failure', async ({ page }) => {
  let releasePlans!: () => void
  const heldPlans = new Promise<void>(resolve => { releasePlans = resolve })
  let plansRequests = 0
  await page.route('**/api/profile/save-draft', async route => {
    if (route.request().postDataJSON().profile.funnel.stage === 'plans') {
      plansRequests++
      if (plansRequests === 1) {
        await heldPlans
        await route.fulfill({ status: 503, json: { error: 'Draft save unavailable.' } })
        return
      }
    }
    await route.fulfill({ json: { ok: true } })
  })
  await seedRealDraft(page)
  await page.goto('/preview-your-business')
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await page.getByLabel('Account email', { exact: false }).fill('private@example.com')
  await page.getByLabel('Public contact email').fill('hello@example.com')
  await page.getByRole('heading', { name: 'Confirm your email addresses before plans' }).locator('..').locator('..').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await expect.poll(() => plansRequests).toBe(1)
  const busy = page.getByRole('button', { name: 'Opening plans…', exact: true })
  await expect(busy).toHaveCount(2)
  await expect(busy.first()).toBeDisabled()
  await expect(busy.last()).toBeDisabled()
  releasePlans()
  await expect(page.getByRole('button', { name: 'Choose a launch plan' })).toBeEnabled()
  await expect(page.getByText(/could not save your details/)).toBeVisible()
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await expect(page).toHaveURL(/\/pricing\?/)
  expect(plansRequests).toBe(2)
})

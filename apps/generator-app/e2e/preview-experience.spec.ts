import { expect, test, type Page } from '@playwright/test'
import { REVIEWED_SHOWCASE_SLUGS } from '../src/lib/templates/showcase-curation'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

const ownInfo = {
  businessName: 'Saved Studio', ownerName: 'Saved Owner', email: '', phone: '', address: '',
  niche: 'wellness_coach', tagline: 'My own words', description: '', services: '', website: '',
}
const ownMatch = { nicheSlug: 'wellness_coach', templateSlug: 'saved-layout', templateName: 'Saved Layout', matchScore: 50, reason: 'saved match', pages: ['index.html'] }
const ownTheme = { primary: '#123456', background: '#ffffff', text: '#123456', headingFont: 'Georgia, serif', bodyFont: 'Georgia, serif' }
const ownPin = { niche: 'wellness_coach', template: 'saved-layout', catalogRevision: { contractVersion: 3, designId: 'design_real', contentPresetId: 'content_real', themePresetId: 'theme_real', qualityReceipt: 'receipt_real' } }

async function openContactDetails(page: Page) {
  const toggle = page.getByRole('button', { name: /Add contact details/ })
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
}

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
  // Keep every write in this browser suite local to an explicit fixture.
  await page.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
    ? route.continue()
    : route.fulfill({ status: 503, json: { error: 'No write fixture is configured for this request.' } }))
  await page.route('**/api/templates/*?all=true', (route) => {
    const niche = new URL(route.request().url()).pathname.split('/')[3]
    return route.fulfill({ json: { templates: [
      { slug: 'sample-layout', name: 'Published Sample Layout', nicheSlug: niche, pages: ['index.html', 'contact.html'], snippet: 'warm natural professional' },
      ...(niche === 'wellness_coach' ? REVIEWED_SHOWCASE_SLUGS.wellness_coach!.map((slug, index) => ({ slug, name: `Sample choice ${index + 1}`, nicheSlug: niche, pages: ['index.html', 'contact.html'], snippet: '' })) : []),
    ] } })
  })
  await page.route('**/api/templates/*/*/preview', (route) => {
    const body = route.request().postDataJSON()
    return route.fulfill({ json: {
      html: `<!doctype html><html><head><title>Preview</title></head><body><h1>${body.values.BUSINESS_NAME}</h1><p>Original words</p><p>${body.page}</p><a href="mailto:${body.values.EMAIL}">${body.values.EMAIL}</a></body></html>`,
      css: '', variationCSS: '', fields: [{ name: 'BUSINESS_NAME', required: true }, { name: 'EMAIL', type: 'email', required: true }],
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
  await page.goto('/preview-your-business?sample=1&niche=wellness_coach')
  await expect(page.getByText('Sample preview · fictional business details')).toBeVisible()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
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
  await openContactDetails(page)
  await page.getByLabel('Account email', { exact: false }).fill('private@mynewstudio.example')
  await expect(page.getByLabel('Public contact email')).toHaveValue('')
  await page.getByLabel('Public contact email').fill('hello@mynewstudio.example')
  await page.getByRole('button', { name: 'Add more business details', exact: false }).click()
  await page.getByLabel('Tagline', { exact: true }).fill('My authentic tagline')
  await promotions.check()
  await page.getByLabel('Public contact email').press('Enter')
  await expect(page.getByRole('button', { name: 'Original design colors', exact: false })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Cool & Modern', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Nature & Organic', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Nature & Organic', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Original design colors', exact: false }).click()
  await expect.poll(() => profiles.length).toBe(1)
  expect(profiles[0]).toMatchObject({ email: 'private@mynewstudio.example', profile: { businessInfo: {
    businessName: 'My New Studio', tagline: 'My authentic tagline', accountEmail: 'private@mynewstudio.example', email: 'hello@mynewstudio.example',
  } } })
  expect(profiles[0].profile.communicationPreferences).toMatchObject({ marketingEmailOptIn: true, noticeVersion: 'preview-followup-2026-10-24' })
  expect(profiles[0].profile.funnel.stage).toBe('business-details')
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await expect.poll(() => profiles.length).toBe(2)
  expect(profiles[1].profile.matchedTemplate.templateSlug).toBe('sample-layout')
  expect(profiles[1].profile.funnel.stage).toBe('style-match')
  expect(profiles[1].profile.stylePreferences.colorMood).toBe('original')
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
  expect(previews[0]).toMatchObject({ colorScheme: 'original', customTheme: null })
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await expect(page).toHaveURL(/\/pricing\?template=sample-layout&niche=aromatherapy/)
  expect(new URL(page.url()).searchParams.get('color')).toBe('original')
  expect(profiles[2].profile.funnel.stage).toBe('plans')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_template_values')!).EMAIL)).toBe('hello@mynewstudio.example')
  expect(page.url()).not.toContain('mynewstudio.example')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkoutRequests).toBe(1)
  expect(checkout).toMatchObject({ colorScheme: 'original', customTheme: null, accountEmail: 'private@mynewstudio.example', customerValues: { EMAIL: 'hello@mynewstudio.example', email: 'hello@mynewstudio.example' } })
  expect(checkout?.customerValues).not.toHaveProperty('accountEmail')
  expect(JSON.stringify(checkout?.customerValues)).not.toContain('private@mynewstudio.example')
})

test('a saved palette and custom colors survive reload, preview and checkout after the new default', async ({ page }) => {
  await seedRealDraft(page)
  const previews: Record<string, any>[] = []
  let checkout: Record<string, any> | undefined
  page.on('request', (request) => {
    if (/\/api\/templates\/.*\/preview$/.test(request.url())) previews.push(request.postDataJSON())
  })
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Checkout fixture captured.' } })
  })
  await page.goto('/preview-your-business')
  await page.reload()
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Saved Studio' })).toBeVisible()
  expect(previews.at(-1)).toMatchObject({ colorScheme: 'ocean-breeze', customTheme: ownTheme })
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_style_prefs')!).colorMood)).toBe('cool-modern')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_custom_theme')!))).toEqual(ownTheme)
  await page.getByRole('button', { name: 'Choose a launch plan' }).click()
  await page.getByLabel('Account email', { exact: false }).fill('private@savedstudio.example')
  await page.getByLabel('Public contact email').fill('hello@savedstudio.example')
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page).toHaveURL(/\/pricing\?template=saved-layout/)
  expect(new URL(page.url()).searchParams.get('color')).toBe('ocean-breeze')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkout).toBeTruthy()
  expect(checkout).toMatchObject({ colorScheme: 'ocean-breeze', customTheme: ownTheme })
})

test('publishing the account address requires an explicit copy, and later account edits do not silently change public contact', async ({ page }) => {
  await page.goto('/preview-your-business?niche=aromatherapy')
  await openContactDetails(page)
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
  await openContactDetails(page)
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

test('sample URL choices and manual alternatives stay inside the active eligible selection without touching a personal draft', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedRealDraft(page)
  const [first, second] = REVIEWED_SHOWCASE_SLUGS.wellness_coach!
  const held = 'wellness_coach-2026-06-18T0600-095'
  const previews: { url: string; options: Record<string, unknown> }[] = []
  const writes: string[] = []
  await page.route('**/api/templates/wellness_coach?all=true', route => route.fulfill({ json: { templates: [
    { slug: held, name: 'Held featured sample', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: 'warm natural professional earthy' },
    { slug: 'unreviewed', name: 'Unreviewed ranking favorite', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: 'warm natural professional earthy' },
    { slug: second, name: 'Second sample choice', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' },
    { slug: first, name: 'First sample choice', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' },
  ] } }))
  page.on('request', request => {
    if (/\/api\/templates\/.*\/preview$/.test(request.url())) previews.push({ url: request.url(), options: request.postDataJSON() })
    if (/\/api\/(intake\/contact|profile\/save-draft|stripe\/checkout)/.test(request.url())) writes.push(request.url())
  })
  for (const requested of [held, 'unreviewed', second]) {
    await page.goto(`/preview-your-business?sample=1&niche=wellness_coach&template=${requested}`)
    await expect(page.getByText('Sample preview · fictional business details')).toBeVisible({ timeout: 15_000 })
    await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
    expect(previews.at(-1)?.url).toContain(`/${requested === second ? second : first}/preview`)
  }
  await page.getByRole('button', { name: 'Choose another sample', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Wellness Coach Samples', exact: true })).toBeVisible()
  await expect(page.getByText('2 samples available. These previews use fictional business details.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Held featured sample|Unreviewed ranking favorite|Load More/ })).toHaveCount(0)
  await expect(page.getByText('Your info is saved.', { exact: false })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await test.info().attach('sample-picker-mobile', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await page.getByRole('button', { name: /First sample choice/ }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
  expect(previews.at(-1)?.url).toContain(`/${first}/preview`)
  await page.getByLabel('Sample practice', { exact: true }).selectOption('aromatherapy')
  await expect(page.getByText('No sample is available for this practice yet. Choose another sample practice or start with your own details.')).toBeVisible()
  await expect(page.locator('iframe[title="Template preview"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await test.info().attach('sample-unavailable-mobile', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await page.getByLabel('Sample practice', { exact: true }).selectOption('wellness_coach')
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
  expect(previews.every(({ options }) => options.colorScheme === 'original' && options.fontVariation === 'original' && options.structureVariation === 'original' && options.customTheme === null)).toBe(true)
  expect(previews.every(({ url }) => !url.includes(`/${held}/`) && !url.includes('/unreviewed/'))).toBe(true)
  expect(writes).toEqual([])
  const saved = await page.evaluate(() => Object.fromEntries(['pb_biz_info', 'pb_matched', 'pb_style_prefs', 'pb_custom_theme', 'pb_catalog_revision', 'pb_inline_edits'].map(key => [key, JSON.parse(sessionStorage.getItem(key)!)])))
  expect(saved.pb_biz_info).toEqual(ownInfo)
  expect(saved.pb_matched).toEqual(ownMatch)
  expect(saved.pb_style_prefs).toMatchObject({ colorMood: 'cool-modern', fontPreference: 'serif', layoutDensity: 'compact' })
  expect(saved.pb_custom_theme).toEqual(ownTheme)
  expect(saved.pb_catalog_revision).toEqual(ownPin)
  expect(saved.pb_inline_edits['index.html'][0].updated).toBe('My saved words')
  await page.getByRole('button', { name: 'Use my business details', exact: true }).click()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
  expect(await page.evaluate(() => sessionStorage.getItem('pb_preview_sample'))).toBeNull()
  expect(writes).toEqual([])
})

test('a curated practice with no eligible active sample never previews an unreviewed URL choice', async ({ page }) => {
  await seedRealDraft(page)
  const previews: string[] = []
  let sampleAvailable = false
  const reviewed = REVIEWED_SHOWCASE_SLUGS.wellness_coach![0]
  await page.route('**/api/templates/wellness_coach?all=true', route => route.fulfill({ json: { templates: [
    { slug: 'sample-layout', name: 'Unreviewed choice', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' },
    ...(sampleAvailable ? [{ slug: reviewed, name: 'Available sample', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' }] : []),
  ] } }))
  page.on('request', request => { if (request.url().endsWith('/preview')) previews.push(request.url()) })
  await page.goto('/preview-your-business?sample=1&niche=wellness_coach&template=sample-layout')
  await expect(page.getByText('No sample is available for this practice yet. Choose another sample practice or start with your own details.')).toBeVisible()
  await expect(page.locator('iframe[title="Template preview"]')).toHaveCount(0)
  expect(previews).toEqual([])
  sampleAvailable = true
  await page.getByRole('button', { name: 'Try loading templates again' }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
  expect(previews).toHaveLength(1)
  expect(previews[0]).toContain(`/${reviewed}/preview`)
  await page.getByRole('button', { name: 'Use my business details', exact: true }).click()
  await expect(page.getByLabel('Business Name')).toHaveValue('Saved Studio')
})

for (const delayedPage of [1, 2]) {
  test(`a late personal browse page ${delayedPage} cannot replace sample choices or totals`, async ({ page }) => {
    await seedRealDraft(page)
    let release!: () => void
    const heldResponse = new Promise<void>(resolve => { release = resolve })
    let requested = false
    const writes: string[] = []
    page.on('request', request => {
      if (/\/api\/(intake\/contact|profile\/save-draft|stripe\/checkout)/.test(request.url())) writes.push(request.url())
    })
    await page.route('**/api/templates/wellness_coach?page=*', async route => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'))
      if (pageNumber === delayedPage) { requested = true; await heldResponse }
      await route.fulfill({ json: { templates: [{ slug: `personal-${pageNumber}`, name: `Unreviewed personal page ${pageNumber}`, nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' }], total: 99, hasMore: true } })
    })
    await page.goto('/preview-your-business')
    await openContactDetails(page)
    await page.getByLabel('Account email', { exact: false }).fill('saved@example.com')
    await page.getByLabel('Public contact email').fill('hello@example.com')
    await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
    await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
    await page.getByRole('button', { name: 'Browse Custom Templates' }).click()
    if (delayedPage === 2) await page.getByRole('button', { name: /Load More/ }).click()
    await expect.poll(() => requested).toBe(true)
    await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
    const saved = await page.evaluate(() => Object.fromEntries(['pb_biz_info', 'pb_matched', 'pb_style_prefs', 'pb_custom_theme', 'pb_catalog_revision', 'pb_inline_edits'].map(key => [key, sessionStorage.getItem(key)])))
    await page.getByRole('button', { name: /Try with sample details/ }).click()
    await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Vitality Path Coaching' })).toBeVisible()
    await page.getByRole('button', { name: 'Choose another sample', exact: true }).click()
    const writeCount = writes.length
    await expect(page.getByText('3 samples available. These previews use fictional business details.')).toBeVisible()
    const response = page.waitForResponse(value => new URL(value.url()).pathname === '/api/templates/wellness_coach' && new URL(value.url()).searchParams.get('page') === String(delayedPage))
    release()
    await (await response).finished()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(page.getByText('3 samples available. These previews use fictional business details.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Unreviewed personal|Load More|Loading\.\.\./ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Sample choice.*Open sample/ })).toHaveCount(3)
    expect(writes).toHaveLength(writeCount)
    expect(await page.evaluate(() => Object.fromEntries(['pb_biz_info', 'pb_matched', 'pb_style_prefs', 'pb_custom_theme', 'pb_catalog_revision', 'pb_inline_edits'].map(key => [key, sessionStorage.getItem(key)])))).toEqual(saved)
  })
}

test('an older browse response cannot clear a newer request loading state for the same personal niche', async ({ page }) => {
  await seedRealDraft(page)
  const releases: (() => void)[] = []
  await page.route('**/api/templates/wellness_coach?page=*', async route => {
    const index = releases.length
    await new Promise<void>(resolve => { releases.push(resolve) })
    await route.fulfill({ json: { templates: [{ slug: `request-${index}`, name: index === 0 ? 'Stale browse result' : 'Current browse result', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' }], total: 1, hasMore: false } })
  })
  await page.goto('/preview-your-business')
  await openContactDetails(page)
  await page.getByLabel('Account email', { exact: false }).fill('saved@example.com')
  await page.getByLabel('Public contact email').fill('hello@example.com')
  const startBrowse = async () => {
    await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
    await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
    await page.getByRole('button', { name: 'Browse Custom Templates' }).click()
  }
  await startBrowse()
  await expect.poll(() => releases.length).toBe(1)
  await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
  await startBrowse()
  await expect.poll(() => releases.length).toBe(2)
  const firstResponse = page.waitForResponse(value => value.url().includes('/api/templates/wellness_coach?page='))
  releases[0]()
  await (await firstResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('button', { name: 'Loading...' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Stale browse result/ })).toHaveCount(0)
  const secondResponse = page.waitForResponse(value => value.url().includes('/api/templates/wellness_coach?page='))
  releases[1]()
  await (await secondResponse).finished()
  await expect(page.getByRole('button', { name: /Current browse result/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Loading...' })).toHaveCount(0)
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
    await openContactDetails(page)
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
      await openContactDetails(page)
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
  await page.getByRole('heading', { name: 'Review website details before plans' }).locator('..').locator('..').evaluate(form => {
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

async function startMinimalPreview(page: Page) {
  await page.goto('/preview-your-business?niche=wellness_coach')
  await page.getByLabel('Business Name', { exact: false }).fill('Aster Practice')
  await page.getByLabel('What do you offer?', { exact: false }).fill('Small group workshops and individual sessions.')
  await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
}

test('style direction reacts to colors, fonts, tone and spacing without submitting private details', async ({ page }) => {
  const writes: string[] = []
  page.on('request', request => { if (/\/api\/(intake\/contact|profile\/save-draft|stripe\/checkout)/.test(request.url())) writes.push(request.url()) })
  await startMinimalPreview(page)
  const illustration = page.getByRole('figure', { name: 'Style direction preview' })
  await expect(illustration).toHaveAttribute('data-color-scheme', 'original')
  await expect(illustration).toContainText('Aster Practice')
  await expect(illustration).toContainText('Small group workshops and individual sessions.')
  await page.getByRole('button', { name: 'Nature & Organic', exact: true }).click()
  await expect(illustration).toHaveAttribute('data-color-scheme', 'sage-garden')
  await expect(illustration).toHaveCSS('background-color', 'rgb(15, 26, 20)')
  await page.getByRole('button').filter({ has: page.getByText('Serif', { exact: true }) }).click()
  await page.getByRole('button').filter({ has: page.getByText('Spacious', { exact: true }) }).click()
  await page.getByRole('button').filter({ has: page.getByText('Conversational', { exact: true }) }).click()
  await expect(illustration).toHaveAttribute('data-font-variation', 'source-serif')
  await expect(illustration).toHaveAttribute('data-structure-variation', 'elegant-serif')
  await expect(illustration).toContainText('Let’s talk')
  await expect(illustration).toContainText('Small group workshops and individual sessions.')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(writes).toEqual([])
})

test('a personal preview needs no email but plans require private and public addresses before checkout', async ({ page }) => {
  const writes: string[] = []
  const previews: Record<string, any>[] = []
  let checkout: Record<string, any> | undefined
  page.on('request', request => {
    if (/\/api\/(intake\/contact|profile\/save-draft)/.test(request.url())) writes.push(request.url())
    if (/\/preview$/.test(new URL(request.url()).pathname)) previews.push(request.postDataJSON())
  })
  await page.route('**/api/platform/config', route => route.fulfill({ json: { trialDays: 0 } }))
  await page.route('**/api/stripe/checkout', route => { checkout = route.request().postDataJSON(); return route.fulfill({ status: 409, json: { error: 'Fixture only.' } }) })
  await startMinimalPreview(page)
  await page.getByRole('button', { name: 'Light & Airy', exact: true }).click()
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Customize This Template', exact: true }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Aster Practice' })).toBeVisible()
  expect(writes).toEqual([])
  expect(previews.at(-1)).toMatchObject({ colorScheme: 'arctic-frost', fontVariation: 'inter', structureVariation: 'rounded-soft' })
  await page.getByRole('button', { name: 'Choose a launch plan', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page.getByText('Enter a valid account email address.')).toBeVisible()
  await expect(page.getByText('Enter a valid public contact email address.')).toBeVisible()
  expect(checkout).toBeUndefined()
  expect(writes).toEqual([])
  await page.getByLabel('Account email', { exact: false }).fill('private@aster.example')
  await page.getByLabel('Public contact email', { exact: false }).fill('hello@aster.example')
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page).toHaveURL(/\/pricing\?template=sample-layout&niche=wellness_coach/)
  expect(new URL(page.url()).searchParams.get('color')).toBe('arctic-frost')
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkout).toBeTruthy()
  expect(checkout).toMatchObject({ colorScheme: 'arctic-frost', accountEmail: 'private@aster.example', customerValues: { BUSINESS_NAME: 'Aster Practice', EMAIL: 'hello@aster.example' } })
  expect(JSON.stringify(checkout?.customerValues)).not.toContain('private@aster.example')
})

test('Customize opens the editor immediately and a delayed failed preview can retry successfully', async ({ page }) => {
  let finish: () => void = () => {}
  const pending = new Promise<void>(resolve => { finish = resolve })
  let first = true
  await page.route('**/api/templates/*/*/preview', async route => {
    if (first) { first = false; await pending; return route.fulfill({ status: 503, json: { error: 'Preview temporarily unavailable.' } }) }
    return route.fulfill({ json: { html: '<!doctype html><html><body><h1>Recovered preview</h1></body></html>', css: '', variationCSS: '' } })
  })
  await startMinimalPreview(page)
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Customize This Template', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Loading website preview' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Customize This Template', exact: true })).toHaveCount(0)
  finish()
  await expect(page.getByRole('alert').filter({ hasText: 'Preview temporarily unavailable.' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry preview', exact: true }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Recovered preview' })).toBeVisible()
})

test('Browse distinguishes an unavailable catalogue from no matches and recovers without losing details', async ({ page }) => {
  let fail = true
  await page.route('**/api/templates/*?page=1&limit=12&seed=*', route => route.fulfill(fail ? { status: 503, json: { error: 'Unavailable' } } : { json: { templates: [{ slug: 'recovered-layout', name: 'Recovered choice', nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' }], total: 1, hasMore: false } }))
  await startMinimalPreview(page)
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Browse Custom Templates', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'We could not load the templates.' })).toBeVisible()
  await expect(page.getByText('No templates found for this niche.', { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Retry loading templates', exact: true }).click()
  await page.getByRole('button', { name: /Recovered choice/ }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Aster Practice' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_biz_info')!).businessName)).toBe('Aster Practice')
})

test('failed browse pagination retains current choices and retries the same next page', async ({ page }) => {
  let fail = true
  const requestedPages: string[] = []
  await page.route('**/api/templates/*?page=*&limit=12&seed=*', route => {
    const requested = new URL(route.request().url()).searchParams.get('page')!
    requestedPages.push(requested)
    if (requested === '2' && fail) return route.fulfill({ status: 503, json: { error: 'Unavailable' } })
    return route.fulfill({ json: { templates: [{ slug: `layout-${requested}`, name: `Choice ${requested}`, nicheSlug: 'wellness_coach', pages: ['index.html'], snippet: '' }], total: 2, hasMore: requested === '1' } })
  })
  await startMinimalPreview(page)
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Browse Custom Templates', exact: true }).click()
  await page.getByRole('button', { name: /Load More/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'We could not load more templates.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Choice 1/ })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Retry loading templates', exact: true }).click()
  await expect(page.getByRole('button', { name: /Choice 2/ })).toBeVisible()
  expect(requestedPages).toEqual(['1', '2', '2'])
})

test('a stalled browse request times out with a usable retry instead of trapping the visitor', async ({ page }) => {
  let release: () => void = () => {}
  let requested = false
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.clock.install()
  await page.route('**/api/templates/*?page=1&limit=12&seed=*', async route => {
    requested = true
    await pending
    await route.fulfill({ json: { templates: [], total: 0, hasMore: false } }).catch(() => {})
  })
  await startMinimalPreview(page)
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Browse Custom Templates', exact: true }).click()
  await expect.poll(() => requested).toBe(true)
  await page.clock.fastForward(21000)
  await expect(page.getByRole('alert').filter({ hasText: 'We could not load the templates.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry loading templates', exact: true })).toBeEnabled()
  release()
})

for (const earlierSave of ['completed', 'delayed']) {
  test(`continuing without an account email retires a ${earlierSave} older remote-save status`, async ({ page }) => {
    let release: () => void = () => {}
    const pending = new Promise<void>(resolve => { release = resolve })
    const profiles: Record<string, any>[] = []
    await page.route('**/api/profile/save-draft', async route => {
      profiles.push(route.request().postDataJSON())
      if (earlierSave === 'delayed') await pending
      await route.fulfill({ json: { ok: true } }).catch(() => {})
    })
    await page.goto('/preview-your-business?niche=wellness_coach')
    await page.getByLabel('Business Name').fill('Earlier saved practice')
    await openContactDetails(page)
    await page.getByLabel('Account email', { exact: false }).fill('private@earlier.example')
    await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
    await expect.poll(() => profiles.length).toBe(1)
    const saved = page.getByText('Business details saved for your preview and DailyClarity follow-up.')
    if (earlierSave === 'completed') await expect(saved).toBeVisible()
    await page.getByRole('button', { name: 'Edit business details', exact: true }).click()
    await page.getByLabel('Business Name').fill('New local-only practice')
    await page.getByLabel('Account email', { exact: false }).fill('')
    await page.getByRole('button', { name: /Continue to Style Preferences/ }).click()
    await expect(saved).toHaveCount(0)
    release()
    await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
    await page.getByRole('button', { name: 'Customize This Template', exact: true }).click()
    await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'New local-only practice' })).toBeVisible()
    await expect(saved).toHaveCount(0)
    await expect(page.getByText(/could not save your details/)).toHaveCount(0)
    expect(profiles).toHaveLength(1)
    expect(profiles[0].profile.businessInfo.businessName).toBe('Earlier saved practice')
  })
}

test('selected design details and pending review edits are previewed before plans and preserved at checkout', async ({ page }) => {
  const previews: Record<string, any>[] = []
  let checkout: Record<string, any> | undefined
  const fields = [
    { name: 'BUSINESS_NAME', required: true }, { name: 'EMAIL', type: 'email', required: true },
    { name: 'CITY', required: true, default: 'Your City' }, { name: 'STATE', required: true, default: 'Your State' },
    { name: 'PHONE', type: 'tel', required: true }, { name: 'SERVICES', required: true },
    { name: 'TAGLINE', required: true, default: 'A gentle place to begin.' },
  ]
  await seedRealDraft(page)
  await page.route('**/api/templates/*/*/preview', (route) => {
    const body = route.request().postDataJSON()
    previews.push(body)
    return route.fulfill({ json: {
      html: `<!doctype html><html><body><h1>${body.values.BUSINESS_NAME}</h1><p>${body.values.CITY || 'Your City'}, ${body.values.STATE || 'Your State'}</p><p>${body.values.PHONE || ''}</p><p>${body.values.SERVICES || ''}</p></body></html>`,
      css: '', variationCSS: '', fields, catalogRevision: ownPin.catalogRevision,
    } })
  })
  await page.route('**/api/platform/config', (route) => route.fulfill({ json: { trialDays: 0 } }))
  await page.route('**/api/stripe/checkout', (route) => {
    checkout = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: { error: 'Fixture only.' } })
  })
  await page.goto('/preview-your-business')
  await page.getByRole('button', { name: 'Resume preview' }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByRole('heading', { name: 'Saved Studio' })).toBeVisible()
  expect(checkout).toBeUndefined()
  await page.getByRole('button', { name: 'Choose a launch plan', exact: true }).click()
  await page.getByLabel('Account email', { exact: false }).fill('private@example.com')
  await page.getByLabel('Public contact email', { exact: false }).fill('hello@example.com')
  await page.getByRole('button', { name: 'Update preview', exact: true }).click()
  await expect(page.getByText('Enter city used by this design.')).toBeVisible()
  await expect(page.getByLabel('Tagline', { exact: false })).toHaveCount(0)
  await page.getByLabel('City', { exact: false }).fill('Albany')
  await page.getByLabel('State / region', { exact: false }).fill('New York')
  await page.getByLabel('Phone', { exact: false }).fill('+1 555 0100')
  await page.getByLabel('Services', { exact: false }).fill('Sound baths')
  await page.getByRole('button', { name: 'Update preview', exact: true }).click()
  await expect(page.getByText('Preview updated. Review your website below, then continue to plans.')).toBeVisible()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('Albany, New York')).toBeVisible()
  await expect(page).toHaveURL(/\/preview-your-business$/)
  await page.getByRole('button', { name: 'index', exact: true }).click()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('Albany, New York')).toBeVisible()
  expect(previews.at(-1)?.values).toMatchObject({ CITY: 'Albany', STATE: 'New York', PHONE: '+1 555 0100', SERVICES: 'Sound baths' })
  expect(JSON.stringify(previews)).not.toContain('private@example.com')
  // The editor's top CTA must not bypass unsaved review-form values after an
  // earlier successful apply. The form is the only way forward while open.
  await page.getByLabel('City', { exact: false }).fill('Boston')
  await page.getByLabel('State / region', { exact: false }).fill('Massachusetts')
  await page.getByLabel('Account email', { exact: false }).fill('updated-private@example.com')
  await expect(page.getByRole('button', { name: 'Choose a launch plan', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue to plans', exact: true })).toHaveCount(0)
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('Albany, New York')).toBeVisible()
  expect(checkout).toBeUndefined()
  await page.getByRole('button', { name: 'Update preview', exact: true }).click()
  await expect(page.getByText('Preview updated. Review your website below, then continue to plans.')).toBeVisible()
  await expect(page.frameLocator('iframe[title="Template preview"]').getByText('Boston, Massachusetts')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose a launch plan', exact: true })).toHaveCount(0)
  // A private inbox change needs no public-preview regeneration, but must be
  // the address sent with checkout rather than an older persisted address.
  await page.getByLabel('Account email', { exact: false }).fill('final-private@example.com')
  await page.getByRole('button', { name: 'Continue to plans', exact: true }).click()
  await expect(page).toHaveURL(/\/pricing\?template=saved-layout/)
  await page.getByRole('button', { name: 'Choose Plan', exact: true }).first().click()
  await expect.poll(() => checkout).toBeTruthy()
  expect(checkout?.customerValues).toMatchObject({ CITY: 'Boston', STATE: 'Massachusetts', PHONE: '+1 555 0100', SERVICES: 'Sound baths' })
  expect(checkout?.accountEmail).toBe('final-private@example.com')
  for (const privateAddress of ['private@example.com', 'updated-private@example.com', 'final-private@example.com']) {
    expect(JSON.stringify(previews)).not.toContain(privateAddress)
    expect(JSON.stringify(checkout?.customerValues)).not.toContain(privateAddress)
  }
})

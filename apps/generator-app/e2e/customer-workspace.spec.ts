import { expect, test, type Page } from '@playwright/test'

const slug = 'evening-practice'
const token = 'browser-workspace-private-token'
const site = {
  slug,
  status: 'active',
  data: {
    email: 'owner@example.com',
    niche: 'wellness_coach',
    template: 'calm-practice',
    plan: 'basic',
    stripe_customer_id: 'cus_workspace_fixture',
    site_url: 'https://evening-practice.example.com',
    customerValues: {
      BUSINESS_NAME: 'Evening Practice',
      EMAIL: 'hello@example.com',
      PHONE: '555-123-4567',
      SERVICES: 'Consultations, Group sessions',
    },
  },
}

async function mockWorkspace(
  page: Page,
  options: {
    authenticated?: boolean
    status?: string
    publishFailure?: boolean
    inboxFailure?: boolean
  } = {},
) {
  const requests: Record<string, unknown>[] = []
  let inboxCalls = 0
  await page.route('**/api/portal/customer**', async (route) => {
    expect(route.request().headers()['x-portal-token']).toBe(token)
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      requests.push(body)
      return route.fulfill(
        options.publishFailure
          ? {
              status: 502,
              json: { saved: true, republished: false, code: 'publish_failed' },
            }
          : { json: { ok: true, republished: true } },
      )
    }
    return route.fulfill({
      json:
        options.authenticated === false
          ? {
              authenticated: false,
              site: { slug, public: { siteUrl: site.data.site_url } },
            }
          : {
              authenticated: true,
              site: { ...site, status: options.status || site.status },
            },
    })
  })
  await page.route('**/api/sites/domain**', (route) =>
    route.fulfill({
      json: { siteUrl: site.data.site_url, customDomain: null },
    }),
  )
  await page.route('**/api/upload?**', (route) =>
    route.fulfill({ json: { images: [] } }),
  )
  await page.route('**/api/portal/contacts?**', (route) => {
    inboxCalls++
    expect(route.request().headers()['x-portal-token']).toBe(token)
    expect(new URL(route.request().url()).searchParams.has('token')).toBe(false)
    return route.fulfill(
      options.inboxFailure
        ? { status: 503, json: { error: 'Unavailable' } }
        : {
            json: {
              messages: [],
              nextOffset: null,
              paginationLimitReached: false,
            },
          },
    )
  })
  return { requests, inboxCalls: () => inboxCalls }
}

async function openWorkspace(page: Page) {
  await page.goto(`/portal?slug=${slug}#token=${token}`)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Evening Practice' }),
  ).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/portal\\?slug=${slug}$`))
}

test.beforeEach(async ({ page }) => {
  await page.route(
    /https:\/\/(?:plausible\.io|www\.googletagmanager\.com|www\.google-analytics\.com)\//,
    (route) =>
      route.fulfill({ contentType: 'application/javascript', body: '' }),
  )
})

test('mobile owner workspace edits service copy and publishes only the selected website', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await mockWorkspace(page)
  await openWorkspace(page)
  const services = page.getByRole('region', { name: 'Website services', exact: true })
  await expect(services).toBeVisible()
  await expect(services).toContainText('Subscription billing only')
  await expect(services).toContainText('does not set up payments from your own customers')
  await expect(services).toContainText('owner@example.com')
  await expect(services).not.toContainText('hello@example.com')
  await expect(services.getByRole('link', { name: 'Review subscription billing' })).toHaveAttribute(
    'href', `/dashboard?site=${slug}#billing`,
  )
  await expect(services.locator('input')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Save & publish', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('link', { name: 'Open visual editor' }),
  ).toHaveAttribute(
    'href',
    `/templates/wellness_coach/calm-practice?portalSlug=${slug}`,
  )
  await expect(
    page.getByText(/does not change your account email/),
  ).toBeVisible()
  await page
    .getByLabel('Business name', { exact: true })
    .fill('Evening Practice Studio')
  await page
    .getByLabel('Services', { exact: true })
    .fill('Initial consultation, Weekly coaching')
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Service names' })).toContainText(
    'Weekly coaching',
  )
  await page
    .getByRole('button', { name: 'Save & publish', exact: true })
    .click()
  await expect(
    page.getByText('Saved and published to your live site.', { exact: true }),
  ).toBeVisible()
  expect(state.requests).toHaveLength(1)
  expect(state.requests[0]).toMatchObject({
    slug,
    customerValues: {
      BUSINESS_NAME: 'Evening Practice Studio',
      SERVICES: 'Initial consultation, Weekly coaching',
      EMAIL: 'hello@example.com',
    },
  })
  expect(state.requests[0]).not.toHaveProperty('email')
  expect(state.requests[0]).not.toHaveProperty('owner_email')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByLabel('Business name', { exact: true })
    .fill('New unsaved title')
  await expect(
    page.getByText('Saved and published to your live site.', { exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'Evening Practice Studio',
  )
})

test('saved-but-unpublished changes show a warning and explicit publish retry', async ({
  page,
}) => {
  const options = { publishFailure: true }
  const state = await mockWorkspace(page, options)
  await openWorkspace(page)
  await page
    .getByLabel('Business name', { exact: true })
    .fill('Updated Practice')
  await page
    .getByRole('button', { name: 'Save & publish', exact: true })
    .click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'live website has not been updated',
  )
  await expect(
    page.getByText('Saved and published to your live site.', { exact: true }),
  ).toHaveCount(0)
  options.publishFailure = false
  await page.getByRole('button', { name: 'Retry publishing' }).click()
  await expect(
    page.getByText('Saved and published to your live site.', { exact: true }),
  ).toBeVisible()
  expect(state.requests).toHaveLength(2)
  expect(state.requests[1]).toEqual(state.requests[0])
})

test('owner form validates public email and preserves unsaved edits when leaving is cancelled', async ({
  page,
}) => {
  const state = await mockWorkspace(page)
  await openWorkspace(page)
  await page.getByLabel('Email address', { exact: true }).fill('not-an-email')
  await page
    .getByRole('button', { name: 'Save & publish', exact: true })
    .click()
  expect(
    await page
      .getByLabel('Email address', { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.typeMismatch),
  ).toBe(true)
  expect(state.requests).toHaveLength(0)
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('link', { name: 'Open visual editor' }).click()
  await expect(page).toHaveURL(new RegExp(`/portal\\?slug=${slug}$`))
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(
    'not-an-email',
  )
})

test('slug lookup really loads a website while denied access exposes no editor or enquiries', async ({
  page,
}) => {
  let loads = 0
  await page.route('**/api/portal/customer?**', (route) => {
    loads++
    return route.fulfill({
      json: {
        authenticated: false,
        site: { slug, public: { siteUrl: site.data.site_url } },
      },
    })
  })
  await page.goto('/portal')
  await page.getByLabel('Site slug', { exact: true }).fill(slug)
  await page.getByRole('button', { name: 'Check site status' }).click()
  await expect(
    page.getByRole('link', { name: 'View this website' }),
  ).toBeVisible()
  expect(loads).toBeGreaterThan(0)
  await expect(page.getByLabel('Business name', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Website services', exact: true })).toHaveCount(0)
  await expect(page.getByText('owner@example.com', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Website enquiries' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Save & publish', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Sign in to your account', exact: true }),
  ).toHaveAttribute(
    'href',
    `/login?next=${encodeURIComponent(`/portal?slug=${slug}`)}`,
  )
})

test('a suspended website cannot publish and has an account recovery path', async ({
  page,
}) => {
  const state = await mockWorkspace(page, { status: 'billing_suspended' })
  await openWorkspace(page)
  await expect(
    page.getByText('Billing needs attention', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Business name', { exact: true })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Save & publish', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('link', { name: 'Open account & billing' }),
  ).toHaveAttribute('href', `/dashboard?site=${slug}#billing`)
  expect(state.requests).toHaveLength(0)
})

test('enquiries expose failed notifications, render visitor text safely, and deduplicate pagination', async ({
  page,
}) => {
  await mockWorkspace(page)
  const messages = [
    {
      id: 'one',
      name: 'Jordan',
      email: 'jordan@example.com',
      phone: null,
      message:
        '<img src=x onerror="window.contactInjected=true"> Can I book a session?',
      createdAt: '2026-10-15T12:00:00Z',
      notificationStatus: 'failed',
    },
    {
      id: 'two',
      name: 'Morgan',
      email: 'morgan@example.com',
      phone: null,
      message: 'Do you offer online coaching?',
      createdAt: '2026-10-15T11:00:00Z',
      notificationStatus: 'sent',
    },
    {
      id: 'three',
      name: 'Taylor',
      email: 'taylor@example.com',
      phone: '555-555-1212',
      message: 'Please send more information.',
      createdAt: '2026-10-15T10:00:00Z',
      notificationStatus: 'unknown',
    },
  ]
  await page.route('**/api/portal/contacts?**', (route) => {
    expect(route.request().headers()['x-portal-token']).toBe(token)
    const offset = new URL(route.request().url()).searchParams.get('offset')
    return route.fulfill({
      json: {
        messages: offset === '0' ? messages.slice(0, 2) : messages.slice(1),
        nextOffset: offset === '0' ? 20 : null,
        paginationLimitReached: false,
      },
    })
  })
  await openWorkspace(page)
  const inbox = page.locator('#inbox')
  await expect(
    inbox.getByText('Email notification failed', { exact: true }),
  ).toBeVisible()
  await expect(
    inbox.getByText('Email accepted by provider', { exact: true }),
  ).toBeVisible()
  await expect(inbox).toContainText('<img src=x')
  await expect(inbox.locator('img')).toHaveCount(0)
  await inbox.getByRole('button', { name: 'Load older enquiries' }).click()
  await expect(inbox.getByRole('listitem')).toHaveCount(3)
  await inbox.getByRole('button', { name: 'Refresh inbox' }).click()
  await expect(inbox.getByRole('listitem')).toHaveCount(2)
})

test('an inbox error remains an error until a successful retry', async ({
  page,
}) => {
  const options = { inboxFailure: true }
  await mockWorkspace(page, options)
  await openWorkspace(page)
  const inbox = page.locator('#inbox')
  await expect(inbox.getByRole('alert')).toContainText('could not be loaded')
  await expect(
    inbox.getByText('No enquiries yet', { exact: true }),
  ).toHaveCount(0)
  options.inboxFailure = false
  await inbox.getByRole('button', { name: 'Retry loading enquiries' }).click()
  await expect(
    inbox.getByText('No enquiries yet', { exact: true }),
  ).toBeVisible()
})

async function preparePreview(page: Page) {
  await page.route('**/api/intake/contact', (route) =>
    route.fulfill({ json: { success: true } }),
  )
  await page.route('**/api/profile/save-draft', (route) =>
    route.fulfill({ json: { success: true } }),
  )
  await page.goto('/preview-your-business')
  await page.getByRole('button', { name: /Aromatherapy/ }).click()
  await page
    .getByLabel('Business Name', { exact: false })
    .fill('Evening Aromatherapy')
  await page.getByLabel('Email', { exact: false }).fill('owner@example.com')
}

test('empty template catalog cannot enter customization or checkout, and retry preserves details', async ({
  page,
}) => {
  let requests = 0
  await page.route('**/api/templates/aromatherapy?all=true', (route) => {
    requests++
    return route.fulfill({ json: { templates: [] } })
  })
  await preparePreview(page)
  await page
    .getByRole('button', { name: /Continue to Style Preferences/ })
    .click()
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Choose an available template' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Customize This Template' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Purchase & Launch' }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Try loading templates again' })
    .click()
  await expect.poll(() => requests).toBe(2)
  await page.getByRole('button', { name: 'Edit business details' }).click()
  await expect(page.getByLabel('Business Name', { exact: false })).toHaveValue(
    'Evening Aromatherapy',
  )
})

test('preview email validation is associated with the visible field', async ({
  page,
}) => {
  await preparePreview(page)
  await page.getByLabel('Email', { exact: false }).fill('not-an-email')
  await page
    .getByRole('button', { name: /Continue to Style Preferences/ })
    .click()
  await expect(page.getByLabel('Email', { exact: false })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Enter a valid email address',
  )
  await expect(
    page.getByRole('heading', { name: 'Tell us about your business' }),
  ).toBeVisible()
})

test('a failed website preview cannot advance to purchase', async ({
  page,
}) => {
  await page.route('**/api/templates/aromatherapy?all=true', (route) =>
    route.fulfill({
      json: {
        templates: [
          {
            slug: 'calm-practice',
            name: 'Calm Practice',
            nicheSlug: 'aromatherapy',
            pages: ['index.html'],
            snippet: '',
          },
        ],
      },
    }),
  )
  await page.route(
    '**/api/templates/aromatherapy/calm-practice/preview',
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'The template preview is temporarily unavailable.' },
      }),
  )
  await page.route('**/api/upload/session', (route) =>
    route.fulfill({ json: { owner: 'draft-browser-test' } }),
  )
  await page.route('**/api/upload?**', (route) =>
    route.fulfill({ json: { images: [] } }),
  )
  await preparePreview(page)
  await page
    .getByRole('button', { name: /Continue to Style Preferences/ })
    .click()
  await page.getByRole('button', { name: /Find My Perfect Template/ }).click()
  await page.getByRole('button', { name: 'Customize This Template' }).click()
  await expect(
    page.getByText('The template preview is temporarily unavailable.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Preview required before purchase' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('link', { name: 'Purchase & Launch' }),
  ).toHaveCount(0)
})

test('expired inbox access removes previously loaded private enquiries', async ({
  page,
}) => {
  await mockWorkspace(page)
  let expired = false
  await page.route('**/api/portal/contacts?**', (route) =>
    route.fulfill(
      expired
        ? { status: 401, json: { error: 'Access expired' } }
        : {
            json: {
              messages: [
                {
                  id: 'private-message',
                  name: 'Private Customer',
                  email: 'customer@example.com',
                  phone: null,
                  message: 'Private enquiry details',
                  createdAt: '2026-10-15T12:00:00Z',
                  notificationStatus: 'sent',
                },
              ],
              nextOffset: null,
              paginationLimitReached: false,
            },
          },
    ),
  )
  await openWorkspace(page)
  const inbox = page.locator('#inbox')
  await expect(
    inbox.getByText('Private enquiry details', { exact: true }),
  ).toBeVisible()
  expired = true
  await inbox.getByRole('button', { name: 'Refresh inbox' }).click()
  await expect(inbox.getByRole('alert')).toContainText(
    'Access to this inbox has expired',
  )
  await expect(
    inbox.getByText('Private enquiry details', { exact: true }),
  ).toHaveCount(0)
})

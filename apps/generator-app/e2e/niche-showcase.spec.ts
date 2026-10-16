import { expect, test } from '@playwright/test'
import path from 'node:path'
import type { ViteDevServer } from 'vite'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } })

let server: ViteDevServer
let fixtureOrigin: string

// Mount the real component with two known designs; never create a catalog
// override or weaken the production catalog's publication checks for a test.
test.beforeAll(async () => {
  const { createServer } = await import('vite')
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { 'next/link': path.resolve('e2e/fixtures/showcase-link.tsx') } },
    oxc: { jsx: { runtime: 'automatic' } },
    server: { host: '127.0.0.1', port: 0, headers: {
      // Match the production restrictions relevant to embedded previews.
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; connect-src 'self'; frame-src https://js.stripe.com https://hooks.stripe.com",
      'X-Frame-Options': 'DENY',
    } },
  })
  await server.listen()
  const address = server.httpServer!.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server did not open a port')
  fixtureOrigin = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => server?.close())

const sampleHtml = '<!doctype html><html><head><style>body{margin:0;background:#e9f3e9;color:#173c2e;font:24px system-ui}main{padding:32px}h1{overflow-wrap:anywhere}</style></head><body><main><h1>Sample wellness homepage</h1><p>Example content for this selected design.</p><a href="https://example.com">Book now</a><form action="https://example.com"><input name="email"><button>Send</button></form><script>window.parent.postMessage("unexpected-script", "*")</script></main></body></html>'

test('opens one real preview, changes width, preserves exact style CTAs and returns focus on close', async ({ page }) => {
  const reads: string[] = []
  await page.route('**/api/templates/**/html?sample=1', (route) => {
    reads.push(route.request().url())
    return route.fulfill({ contentType: 'text/html', body: sampleHtml })
  })
  await page.goto(`${fixtureOrigin}/e2e/fixtures/showcase.html`)
  await page.evaluate(() => {
    window.addEventListener('message', (event) => {
      if (event.data === 'unexpected-script') document.documentElement.dataset.scriptExecuted = 'yes'
    })
  })
  expect(reads).toHaveLength(0)
  const trigger = page.getByRole('button', { name: 'Open homepage preview: Calm Studio' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Sample wellness homepage' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', '')
  await expect(page.locator('iframe')).toHaveAttribute('tabindex', '-1')
  expect(await page.locator('iframe').evaluate((frame) => getComputedStyle(frame).pointerEvents)).toBe('none')
  await expect(page.locator('html')).not.toHaveAttribute('data-script-executed', 'yes')
  expect(reads).toHaveLength(1)
  const wideWidth = (await page.locator('iframe').boundingBox())!.width
  await dialog.getByRole('button', { name: 'Mobile view' }).click()
  await expect(dialog.getByRole('button', { name: 'Mobile view' })).toHaveAttribute('aria-pressed', 'true')
  expect((await page.locator('iframe').boundingBox())!.width).toBeLessThanOrEqual(390)
  await dialog.getByRole('button', { name: 'Wide view' }).click()
  expect((await page.locator('iframe').boundingBox())!.width).toBe(wideWidth)
  await expect(dialog.getByRole('link', { name: 'Try this style with sample details' })).toHaveAttribute('href', '/preview-your-business?niche=wellness_coach&template=calm-studio&sample=1')
  await expect(dialog.getByRole('link', { name: 'Use my business details' })).toHaveAttribute('href', '/preview-your-business?niche=wellness_coach&template=calm-studio')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('handles failures with retry and keeps the narrow-screen dialog inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  let fail = true
  await page.route('**/api/templates/**/html?sample=1', (route) => route.fulfill(fail
    ? { status: 503, body: 'Unavailable' }
    : { contentType: 'text/html', body: sampleHtml }))
  await page.goto(`${fixtureOrigin}/e2e/fixtures/showcase.html`)
  await page.getByRole('button', { name: /Open homepage preview: A very long/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/This homepage preview couldn't load/)).toBeVisible()
  fail = false
  await dialog.getByRole('button', { name: 'Try again' }).click()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Sample wellness homepage' })).toBeVisible()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  const box = (await dialog.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  await dialog.getByRole('button', { name: 'Close preview' }).click()
  await expect(dialog).not.toBeVisible()
})

test('closing during a request cannot populate the next selected design with stale content', async ({ page }) => {
  await page.route('**/api/templates/**/html?sample=1', async (route) => {
    if (route.request().url().includes('calm-studio')) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      await route.fulfill({ contentType: 'text/html', body: '<h1>Stale first design</h1>' }).catch(() => {})
    } else {
      await route.fulfill({ contentType: 'text/html', body: '<h1>Second design</h1>' })
    }
  })
  await page.goto(`${fixtureOrigin}/e2e/fixtures/showcase.html`)
  await page.getByRole('button', { name: 'Open homepage preview: Calm Studio' }).click()
  await page.getByRole('button', { name: 'Close preview' }).click()
  await page.getByRole('button', { name: /Open homepage preview: A very long/ }).click()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Second design' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(1)
})

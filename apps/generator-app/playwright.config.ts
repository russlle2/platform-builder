import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Keep ephemeral Playwright output away from the checked-in demo media that
  // lives under test-results/. Playwright clears its output directory at the
  // start of a run.
  outputDir: '.playwright-results',
  use: {
    // Never make an unqualified developer test run exercise the live site.
    // Connected staging runs provide BASE_URL explicitly; local runs fail
    // safely unless a developer has started the app on port 3000.
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})

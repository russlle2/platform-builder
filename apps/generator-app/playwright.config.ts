import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.BASE_URL || 'https://dailyclarity.org',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})

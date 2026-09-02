import { defineConfig, devices } from '@playwright/test'

/**
 * E2E runs against the built app in a real browser — the File System Access API and
 * IndexedDB cannot be exercised in jsdom, and neither can the storage-mode split that
 * separates Chromium from Firefox.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Each worker runs a full React Flow application; too many at once starves the machine
  // and surfaces as context-teardown timeouts rather than as real failures.
  workers: process.env.CI ? 2 : 3,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'pnpm --filter @tricc/app-local preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

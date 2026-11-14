import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 * Environment variables are loaded from a local `.env` file by `dotenv/config`.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* One worker on CI: tests share one account and assert exact seat counts. */
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: 'https://eventhub.rahulshettyacademy.com/',
    /* Take a screenshot as evidence on failure */
    screenshot: 'on-first-failure',
    /* Keep a trace for failed tests locally only. Traces record request headers
     * (bearer token) and typed values (password); CI artifacts are public, so
     * tracing is off in CI. Failures there still report errors and screenshots. */
    trace: process.env.CI ? 'off' : 'retain-on-failure'
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // Never trace login: the trace would contain the typed password.
      use: { trace: 'off' }
    },
    {
      name: 'chromium',
      testMatch: /UI_Testing[\\/].*\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },
    {
      name: 'api',
      testMatch: /API_Testing[\\/].*\.test\.ts/
    }
  ]
});

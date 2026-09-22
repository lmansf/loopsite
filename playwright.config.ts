import { defineConfig, devices } from '@playwright/test';

const PORT = 3111;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  testIgnore: ['**/unit/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2, // four starves the 4 s clock on a 4-CPU box and makes timing specs lie
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: [/reduced-motion\.spec\.ts/] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: [/reduced-motion\.spec\.ts/] },
    {
      name: 'reduced-motion',
      testMatch: /reduced-motion\.spec\.ts/,
      // Playwright 1.56 moved reducedMotion under contextOptions (doc 03 §10.10
      // wrote it at the top level, which no longer typechecks).
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' },
  },
});

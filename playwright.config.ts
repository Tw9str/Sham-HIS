import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    channel: 'msedge',
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      SHAM_DEMO_MODE: 'true',
      DATABASE_URL: '',
      VERCEL: '',
      SHAM_PUBLIC_ORIGIN: 'http://127.0.0.1:3100',
      SHAM_DB_PATH: '.test-data/e2e.sqlite',
      SHAM_BUILD_DIR: '.next-e2e',
    },
  },
});

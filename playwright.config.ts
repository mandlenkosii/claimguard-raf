import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (Section 12.2). Starts `npm run dev` if it is not already running.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  // The backend is a hosted project (Section 18 #46): limit simultaneous sign-ins and allow for network time.
  // Speed targets are measured separately in T-NFR-1 and T-NFR-2.
  workers: 2,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});

import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the built app served by `vite preview`.
// The screenshot harness (e2e/daily-quests.spec.ts) needs the dev server, because its page
// dev/quests.html is not part of the build.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173',
      url: 'http://localhost:4173/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx vite --port 5175 --strictPort',
      url: 'http://localhost:5175/dev/quests.html',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: /daily-quests\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173/' },
    },
    {
      name: 'harness',
      testMatch: /daily-quests\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175/' },
    },
  ],
});

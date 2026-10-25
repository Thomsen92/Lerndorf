import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the built app served by `vite preview`.
// The screenshot harnesses (e2e/daily-quests.spec.ts, e2e/tutorial.spec.ts) need the dev server, because their pages
// dev/quests.html and dev/tutorial.html are not part of the build.
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/playwright-artifacts',
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
      testIgnore: /(daily-quests|tutorial|build-feedback|xp-level|sir-byte)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173/' },
    },
    {
      name: 'harness',
      testMatch: /(daily-quests|tutorial|build-feedback|xp-level|sir-byte)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5175/',
        // the tutorial harness renders the real 3D village: software WebGL for headless runs
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

// Browser-driven e2e (the gap CLAUDE.md flagged: everything else here is
// engine-level Vitest). Runs against the real dev server with a fresh
// browser context — and therefore fresh IndexedDB — per test.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // N8 is mobile-first — run the same flows at phone size.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // In CI this suite gates a deploy, so it runs against the actual
    // production build (`vite preview`) rather than the dev server —
    // that's what catches build-only breakage: base-path/asset
    // resolution, the service worker, or a chunk that only splits wrong
    // in a production build (all of which Phase 7 introduced surface for).
    // Locally the dev server stays the default for fast iteration.
    command: process.env.CI
      ? 'npm run preview -- --port 5173 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});

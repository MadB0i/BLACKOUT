import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  // Software GL (SwiftShader) makes timing jittery; retries re-run only
  // genuinely failed tests and are reported as flaky, never silent.
  retries: 1,
  // One browser at a time. Every spec drives a WebGL canvas, and four
  // concurrent software renderers starve each other's frame loops — that
  // contention, not the app, is what made the perf probe flaky.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'no-preference',
    actionTimeout: 20000,
    launchOptions: {
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], hasTouch: true, isMobile: true } },
  ],
});

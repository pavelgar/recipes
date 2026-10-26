import { defineConfig, devices } from '@playwright/test'

const port = 3100

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  // Phone first, as DESIGN.md asks. Chromium only: Playwright's WebKit
  // isn't supported on Fedora.
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  // Tests run against a production build, the app as the image ships it, on
  // Node and with a database and photos folder that start empty on every
  // run.
  webServer: {
    command:
      'rm -rf e2e.db e2e.db-* e2e-photos && bun run build && bun run start',
    url: `http://localhost:${port}`,
    env: {
      PORT: String(port),
      DATABASE_URL: 'file:e2e.db',
      PHOTOS_DIR: 'e2e-photos',
    },
  },
})

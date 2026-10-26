import { defineConfig, devices } from '@playwright/test'
import { aiModelPort, aiPort, port, testSitePort } from './e2e/servers'

// Not an address by IP or a localhost name, which browsers treat as
// secure. The phone resolves it to this machine.
const plainHttpHost = 'recipes.test'

const noAi = { AI_PROVIDER: '', AI_MODEL: '', AI_API_KEY: '', AI_BASE_URL: '' }

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  // Phone first, as DESIGN.md asks. WebKit runs on CI only: Playwright's
  // WebKit isn't supported on Fedora.
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] }, testIgnore: /plain-http/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /plain-http/,
    },
    ...(process.env.CI
      ? [
          {
            name: 'iphone',
            use: { ...devices['iPhone 15'] },
            testIgnore: /plain-http/,
          },
        ]
      : []),
    // The app reached by its address on the home network, without HTTPS,
    // where browsers leave out installing, offline use and some APIs.
    {
      name: 'plain-http',
      testMatch: /plain-http/,
      use: {
        ...devices['Pixel 7'],
        baseURL: `http://${plainHttpHost}:${port}`,
        launchOptions: {
          args: [`--host-resolver-rules=MAP ${plainHttpHost} 127.0.0.1`],
        },
      },
    },
  ],
  // Tests run against a production build, the app as the image ships it, on
  // Node and with databases that start empty on every run. The servers
  // start in order, so the second app runs the build the first made.
  webServer: [
    {
      // The e2e build also imports from the test site.
      command:
        'rm -f e2e*.db e2e*.db-* && bun run build --mode e2e && bun run start',
      url: `http://localhost:${port}`,
      env: { ...noAi, PORT: String(port), DATABASE_URL: 'file:e2e.db' },
    },
    {
      command: 'node e2e/test-site.ts',
      port: testSitePort,
      env: { PORT: String(testSitePort) },
    },
    {
      command: 'node e2e/fake-ai.ts',
      port: aiModelPort,
      env: { PORT: String(aiModelPort) },
    },
    {
      command: 'bun run start',
      url: `http://localhost:${aiPort}`,
      env: {
        PORT: String(aiPort),
        DATABASE_URL: 'file:e2e-ai.db',
        AI_PROVIDER: 'openai-compatible',
        AI_MODEL: 'fake',
        AI_API_KEY: '',
        AI_BASE_URL: `http://localhost:${aiModelPort}/v1`,
      },
    },
  ],
})

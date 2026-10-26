import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so tests don't load the Start, Nitro,
// devtools and Paraglide plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // Playwright runs these (bun run test:e2e).
          exclude: [...configDefaults.exclude, 'e2e/**', '**/*.browser.test.*'],
        },
      },
      // Components, rendered in Chromium, with the server functions they
      // call replaced in each test.
      {
        extends: true,
        // The tests replace the modules that import Start's server, which
        // only builds inside Start's own plugin, so it's left unbundled.
        optimizeDeps: {
          exclude: ['@tanstack/react-start', '@tanstack/react-start/server'],
        },
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
})

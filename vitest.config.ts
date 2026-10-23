import { configDefaults, defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so tests don't load the Start, Nitro,
// devtools and Paraglide plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    // Playwright runs these (bun run test:e2e).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})

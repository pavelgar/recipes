import { configDefaults, defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so tests don't load the Start, Nitro,
// devtools and Paraglide plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    // Corpus-wide checks loop over every line and grow with the corpus.
    // "parses as it is typed" takes 3.5 s on a laptop and 6.4 s on GitHub's
    // runners, past the 5 s default.
    testTimeout: 30_000,
    // Playwright runs these (bun run test:e2e).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})

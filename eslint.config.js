//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import boundaries from 'eslint-plugin-boundaries'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'

// The layers of src/ (AGENTS.md, "Code organization"). Each folder is one
// layer, and a file belongs to the first that matches.
const layers = [
  ['core', 'src/core'],
  ['server', 'src/server'],
  ['i18n', ['src/i18n', 'src/paraglide']],
  ['hooks', 'src/hooks'],
  ['ui', 'src/components/ui'],
  ['components', 'src/components'],
  ['routes', 'src/routes'],
  ['testing', 'src/testing'],
  // Built on its own, and free to import any layer, like Start's entry
  // files (boundaries/files below).
  ['app', 'src/service-worker'],
]

// What each layer may import, besides itself.
const imports = {
  core: [],
  server: ['core'],
  i18n: ['core'],
  hooks: ['core'],
  ui: ['hooks', 'i18n'],
  components: ['core', 'i18n', 'hooks', 'ui'],
  routes: ['core', 'server', 'i18n', 'hooks', 'ui', 'components'],
  testing: ['core', 'server', 'i18n'],
  app: layers.map(([type]) => type),
}

// Of src/server, components may import only its server functions, which
// the build turns into calls to the server.
const serverFunctions = {
  element: { type: 'server' },
  file: { categories: 'functions' },
}

const coreIsPure =
  'src/core is pure logic, the same in the browser, on the server and in tests: no React, TanStack, Node or server packages, and no browser globals (AGENTS.md, "Code organization").'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    files: ['src/**'],
    plugins: { 'no-relative-import-paths': noRelativeImportPaths },
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: false, rootDir: 'src', prefix: '@' },
      ],
    },
  },
  {
    // Core features must work over plain HTTP (DESIGN.md, "Deployment and
    // access"), where browsers leave these out. A use that checks for the
    // API first and degrades without it can disable the rule on its line,
    // saying so.
    files: ['src/**'],
    ignores: ['src/service-worker/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...[
          'randomUUID',
          'subtle',
          'clipboard',
          'wakeLock',
          'serviceWorker',
        ].map((property) => ({
          property,
          message: `${property} exists only over HTTPS, and core features must work over plain HTTP.`,
        })),
        {
          object: 'navigator',
          property: 'share',
          message:
            'navigator.share exists only over HTTPS, and core features must work over plain HTTP.',
        },
        // A transaction holds SQLite's write lock across every await in its
        // callback, and every other save fails meanwhile
        // (src/server/db/AGENTS.md).
        {
          object: 'db',
          property: 'transaction',
          message:
            "db.transaction() makes every other save fail until it ends. Write several rows as one db.batch([...]), getting a new row's id in SQL (src/server/db/AGENTS.md).",
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'caches',
          message:
            'The Cache API exists only over HTTPS, and core features must work over plain HTTP.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // So imports through @/ resolve to the files they name.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': layers.map(([type, pattern]) => ({
        type,
        pattern,
        partialMatch: false,
      })),
      'boundaries/files': [
        // Start's entry files and the app's styles, beside the layers.
        { category: 'app', pattern: 'src/*.{ts,tsx,css}' },
        { category: 'test', pattern: 'src/**/*.test.{ts,tsx}' },
        { category: 'functions', pattern: 'src/server/**/*.functions.ts' },
      ],
    },
    rules: {
      // A file outside every layer, such as one in a new src/ folder.
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            ...Object.entries(imports).map(([type, below]) => ({
              from: { element: { type } },
              allow: {
                to: {
                  element: { types: { anyOf: [type, ...below] } },
                },
              },
            })),
            {
              from: { element: { type: 'components' } },
              allow: { to: serverFunctions },
            },
            // The entry files and tests reach into any layer, and only tests
            // use src/testing.
            {
              from: { file: { categories: ['app', 'test'] } },
              allow: {
                to: [{ element: { type: '*' } }, { file: { path: '**' } }],
              },
            },
            // The root route links the styles.
            {
              from: { element: { type: 'routes' } },
              allow: { to: { file: { categories: 'app' } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            'react',
            'react-dom',
            'drizzle-orm',
            'sharp',
            'ai',
            'node-fetch',
            'request-filtering-agent',
            'nitro',
          ].map((name) => ({ name, message: coreIsPure })),
          patterns: [
            {
              group: [
                'react/*',
                'react-dom/*',
                '@tanstack/*',
                'node:*',
                'drizzle-orm/*',
                '@ai-sdk/*',
                'nitro/*',
              ],
              message: coreIsPure,
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        // Repeated from above, which this list replaces for src/core.
        {
          name: 'caches',
          message:
            'The Cache API exists only over HTTPS, and core features must work over plain HTTP.',
        },
        ...[
          'window',
          'document',
          'navigator',
          'location',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'fetch',
          'process',
        ].map((name) => ({ name, message: coreIsPure })),
      ],
    },
  },
  {
    // Generated by the shadcn CLI, which writes inline type imports.
    files: ['src/components/ui/**'],
    rules: {
      'import/consistent-type-specifier-style': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'src/paraglide/**',
    ],
  },
]

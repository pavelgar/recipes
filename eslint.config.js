//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import boundaries from 'eslint-plugin-boundaries'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

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
  // Built on its own, like Start's entry files (entryFiles below).
  ['app', 'src/service-worker'],
]

// What each layer may import, besides itself. Only tests use src/testing.
const imports = {
  core: [],
  server: ['core'],
  i18n: ['core'],
  hooks: ['core'],
  ui: ['hooks', 'i18n'],
  components: ['core', 'i18n', 'hooks', 'ui'],
  routes: ['core', 'server', 'i18n', 'hooks', 'ui', 'components'],
  testing: ['core', 'server', 'i18n'],
  app: layers.map(([type]) => type).filter((type) => type !== 'testing'),
}

// Start's entry files and the app's styles, beside the layers, which they
// may import as the service worker does. Any other file directly in src/
// belongs to no layer.
const entryFiles =
  'src/{client.tsx,router.tsx,start.ts,server.ts,routeTree.gen.ts,styles.css}'

// Of src/server, components may import only its server functions, which
// the build turns into calls to the server.
const serverFunctions = {
  element: { type: 'server' },
  file: { categories: 'functions' },
}

// The packages core may use, each the same in the browser, on the server
// and in tests. A new pure package goes here before core imports it.
const coreModules = [
  'countries-and-timezones',
  'entities',
  'es-toolkit',
  'franc',
  'htmlparser2',
  'jsonrepair',
  'linkify-it',
  'minisearch',
  'pluralize',
  'tlds',
  'wink-porter2-stemmer',
  'zod',
]

// The globals core can't count on: the browser's or Node's alone, the
// shared ones that reach outside the code (storage, the network, the
// device, randomness and timing), and globalThis, which reaches them all.
const coreGlobals = [
  ...new Set([...Object.keys(globals.browser), ...Object.keys(globals.node)]),
]
  .filter(
    (name) =>
      !(name in globals['shared-node-browser']) && !(name in globals.builtin),
  )
  .concat([
    'fetch',
    'localStorage',
    'sessionStorage',
    'navigator',
    'crypto',
    'performance',
    'WebSocket',
    'BroadcastChannel',
    'globalThis',
  ])

const coreIsPure =
  'src/core is pure logic, the same in the browser, on the server and in tests: it imports only the packages in coreModules (eslint.config.js), and uses no browser or Node globals (AGENTS.md, "Code organization").'

const staysOnServer =
  'A .server.ts file stays on the server, and the build refuses it in the browser. Import it from src/server, a route or another .server.ts file (AGENTS.md, "Code organization").'

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
        { category: 'entry', pattern: entryFiles },
        { category: 'test', pattern: 'src/**/*.test.{ts,tsx}' },
        { category: 'functions', pattern: 'src/server/**/*.functions.ts' },
        { category: 'server-only', pattern: 'src/**/*.server.ts' },
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
          // Packages and Node's modules too, and imports within a layer,
          // which is one element: all of src/core is one.
          checkAllOrigins: true,
          checkInternals: true,
          // The last policy that matches an import decides it.
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
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
            // The root route links the styles.
            {
              from: { element: { type: 'routes' } },
              allow: { to: { file: { path: 'src/styles.css' } } },
            },
            {
              from: { file: { categories: 'entry' } },
              allow: {
                to: [
                  { element: { types: { anyOf: imports.app } } },
                  { file: { categories: 'entry' } },
                ],
              },
            },
            // What can reach the browser imports no .server.ts file.
            {
              from: {
                element: {
                  types: { anyOf: ['i18n', 'hooks', 'ui', 'components'] },
                },
              },
              disallow: { to: { file: { categories: 'server-only' } } },
              message: staysOnServer,
            },
            {
              from: {
                element: { type: 'core' },
                file: { path: '!**/*.server.ts' },
              },
              disallow: { to: { file: { categories: 'server-only' } } },
              message: staysOnServer,
            },
            {
              from: { element: { type: 'core' } },
              disallow: { to: { module: { origin: ['external', 'core'] } } },
              message: coreIsPure,
            },
            {
              from: { element: { type: 'core' } },
              allow: {
                to: { module: { origin: 'external', source: coreModules } },
              },
            },
            // Tests reach anything.
            {
              from: { file: { categories: 'test' } },
              allow: {
                to: [
                  { element: { type: '*' } },
                  { file: { path: '**' } },
                  { module: { origin: '*' } },
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: ['src/core/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...coreGlobals.map((name) => ({ name, message: coreIsPure })),
      ],
      // Where the file is, which differs between the browser and Node.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][property.name=/^(url|dirname|filename|resolve|glob)$/]",
          message: coreIsPure,
        },
      ],
    },
  },
  {
    // React's two rules of hooks: hooks called the same way on every render,
    // and effects listing what they read. Not the React Compiler's rules.
    files: ['src/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
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

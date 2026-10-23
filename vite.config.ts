import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'

import type { Plugin, Rolldown } from 'vite'

// "use client" only matters for React Server Components, which this app
// doesn't use, so Rolldown dropping it from dependencies is fine.
const dropUseClientWarnings: NonNullable<Rolldown.InputOptions['onLog']> = (
  level,
  log,
  handler,
) => {
  if (
    log.code === 'MODULE_LEVEL_DIRECTIVE' &&
    log.message.includes('"use client"')
  ) {
    return
  }
  handler(level, log)
}

// Start builds the client, the server and Nitro as separate Vite
// environments, and plugins run in each of them. The service worker belongs
// to the client build only: built there once, it lands in Nitro's public
// folder before Nitro lists the files it serves, which it does only once.
const inClientBuildOnly = (plugins: Array<Plugin>) =>
  plugins.map((plugin) => ({
    ...plugin,
    applyToEnvironment: (environment: { name: string }) =>
      environment.name === 'client',
  }))

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    rolldownOptions: { onLog: dropUseClientWarnings },
  },
  plugins: [
    devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['cookie', 'baseLocale'],
    }),
    nitro({
      plugins: ['./src/nitro/check-env.ts'],
      rolldownConfig: {
        onLog: dropUseClientWarnings,
        // Otherwise Rolldown can put its CommonJS helper in a chunk that runs
        // after a chunk that needs it, and the server stops at start with
        // "__commonJSMin is not a function" (rolldown/rolldown#9993). The
        // first server function in the app was enough to cause it.
        output: { strictExecutionOrder: true },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    ...inClientBuildOnly(
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src/service-worker',
        filename: 'sw.ts',
        // Nitro's public folder, where the client build goes too.
        outDir: '.output/public',
        // src/client.tsx registers it; a server route serves the manifest.
        injectRegister: false,
        manifest: false,
        registerType: 'autoUpdate',
        // From public/, which is copied after the precache list is made.
        // Installed apps keep their own copy of the manifest icons.
        includeAssets: ['favicon.ico', 'favicon.svg'],
        injectManifest: {
          // A classic script, which every browser runs as a service worker.
          rollupFormat: 'iife',
          globPatterns: ['**/*.{js,css,woff2}'],
        },
      }),
    ),
  ],
})

export default config

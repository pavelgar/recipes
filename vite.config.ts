import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

import type { Rolldown } from 'vite'

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
      rolldownConfig: { onLog: dropUseClientWarnings },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config

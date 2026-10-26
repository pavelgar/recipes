import { m } from '@/paraglide/messages'
import type { Locale } from '@/paraglide/runtime'

// The page background (--sorbet-canvas, which --background follows, in
// src/styles.css), behind the app while it starts and around it once
// installed.
const background = '#fffaf6'

// The web app manifest, which browsers read to install the app. The name
// follows the interface language. The icons are written into public/ by
// `bun run icons`.
export function webManifest(locale: Locale) {
  const name = m.app_name({}, { locale })
  return {
    // The same app whichever language its manifest is in.
    id: '/',
    name,
    short_name: name,
    lang: locale,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: background,
    theme_color: background,
    icons: [
      { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

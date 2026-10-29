import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// The theme orange (--primary in src/styles.css), behind the icons that
// platforms crop or round themselves.
const background = '#ca3500'

// Writes the app icons into public/ from public/favicon.svg, for
// `bun run icons`. The manifest lists them (src/routes/-web-manifest.ts).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0, resizeOptions: { background } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})

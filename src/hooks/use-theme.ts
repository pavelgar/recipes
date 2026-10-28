import { cookiePreference } from '@/hooks/cookie-preference'
import { THEME_COOKIE, applyTheme, themeOf } from '@/core/theme'

// The theme chosen on this device. Setting it changes the page at once.
export const [useTheme, setTheme] = cookiePreference(
  THEME_COOKIE,
  themeOf,
  () => applyTheme(THEME_COOKIE),
)

// While the page follows the device, it changes when the device does.
// Called from src/client.tsx.
export function followDeviceTheme() {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyTheme(THEME_COOKIE))
}

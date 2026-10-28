import { cookiePreference } from '@/hooks/cookie-preference'
import { THEME_COOKIE, themeOf } from '@/core/theme'

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

// Puts the device's theme on the page: dark when chosen, or when following
// the device and the device is dark. The page head runs it as text before
// anything paints (themeScript), so it can't use anything from outside.
export function applyTheme(cookieName: string) {
  const chosen = new RegExp(`(?:^|; )${cookieName}=(light|dark)(?:;|$)`).exec(
    document.cookie,
  )?.[1]
  const dark = chosen
    ? chosen === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export const themeScript = `(${applyTheme.toString()})(${JSON.stringify(THEME_COOKIE)})`

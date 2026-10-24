// Light or dark, set per device in a cookie the settings screen writes.
// src/start.ts renews it. Until someone picks one, the page follows the
// device's own setting.
export type Theme = 'system' | 'light' | 'dark'

export const THEME_COOKIE = 'theme'

export function themeOf(cookieValue: string | undefined): Theme {
  return cookieValue === 'light' || cookieValue === 'dark'
    ? cookieValue
    : 'system'
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

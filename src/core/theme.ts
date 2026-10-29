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

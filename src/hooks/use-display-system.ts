import { cookiePreference } from '@/hooks/cookie-preference'
import { DISPLAY_SYSTEM_COOKIE, displaySystemOf } from '@/core/display-system'

// The unit system this device shows recipes in.
export const [useDisplaySystem, setDisplaySystem] = cookiePreference(
  DISPLAY_SYSTEM_COOKIE,
  (value) =>
    displaySystemOf(value, Intl.DateTimeFormat().resolvedOptions().timeZone),
)

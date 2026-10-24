import { getCountryForTimezone } from 'countries-and-timezones'
import type { DisplaySystem } from '@/lib/quantities'

// The unit system recipes are shown in is set per device, in a cookie the
// settings screen writes. src/start.ts renews it.
export const DISPLAY_SYSTEM_COOKIE = 'units'

// The device's choice, or until someone makes one, a guess from its time
// zone: US units in the United States, metric everywhere else.
export function displaySystemOf(
  cookieValue: string | undefined,
  timeZone: string,
): DisplaySystem {
  if (cookieValue === 'metric' || cookieValue === 'us') return cookieValue
  // Browsers still report some older names, such as America/Indianapolis,
  // which the library counts as deprecated.
  const country = getCountryForTimezone(timeZone, { deprecated: true })
  return country?.id === 'US' ? 'us' : 'metric'
}

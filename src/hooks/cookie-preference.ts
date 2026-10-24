import { useSyncExternalStore } from 'react'

import { PREFERENCE_MAX_AGE } from '@/lib/preferences'

// A preference set per device, kept in a cookie: a hook that reads it, and a
// setter that saves it and updates every component using the hook. Screens
// render in the browser only (src/start.ts), so the hook reads the cookie
// directly. `parse` turns the cookie's value, if any, into the preference.
export function cookiePreference<T extends string>(
  name: string,
  parse: (value: string | undefined) => T,
  onSet?: () => void,
) {
  const listeners = new Set<() => void>()
  const prefix = `${name}=`

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot() {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(prefix))
    return parse(cookie?.slice(prefix.length))
  }

  function usePreference() {
    return useSyncExternalStore(subscribe, getSnapshot)
  }

  function setPreference(value: T) {
    document.cookie = `${name}=${value}; path=/; max-age=${PREFERENCE_MAX_AGE}; samesite=lax`
    onSet?.()
    listeners.forEach((listener) => listener())
  }

  return [usePreference, setPreference] as const
}

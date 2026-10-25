import { useSyncExternalStore } from 'react'

// Whether the media query matches, kept up to date. Rendered in the
// browser, the answer is there from the first render; the server answers
// no, and hydration then catches up.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

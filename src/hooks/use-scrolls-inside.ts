import { useMediaQuery } from '@/hooks/use-media-query'

// Whether each screen scrolls inside the app rather than the page itself
// scrolling: on wider screens and in the installed app. The same media
// query as the scroll-inside variant in src/styles.css.
export function useScrollsInside(): boolean {
  return useMediaQuery('(width >= 48rem), (display-mode: standalone)')
}

// How the app's own scrolling moves: it glides, unless the device asks for
// less motion.
export function scrollBehavior(): ScrollBehavior {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'
}

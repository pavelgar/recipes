import { useMediaQuery } from '@/hooks/use-media-query'

// Whether the main pointer is a finger, as on phones and tablets, rather
// than a mouse or trackpad.
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)')
}

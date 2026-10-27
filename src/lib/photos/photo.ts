import { z } from 'zod'

// A cover photo is kept as one file, named by a random id that is never
// reused, so its address always shows the same photo and browsers can keep
// it for good.
export const photoIdSchema = z.string().regex(/^[\w-]{22}$/)

export function photoUrl(id: string): string {
  return `/photos/${id}.webp`
}

// Phone photos run to a few megabytes, and recipe sites' to less.
export const MAX_PHOTO_BYTES = 20_000_000

// What became of a photo given to the app: stored under its id, or why not.
export type PhotoResult =
  { ok: true; photo: string } | { ok: false; error: 'unreadable' | 'too-large' }

import { createServerFn } from '@tanstack/react-start'
import { storePhoto } from '@/server/photos/store.server'
import { MAX_PHOTO_BYTES } from '@/core/photo'
import type { PhotoResult } from '@/core/photo'

// Stores a photo chosen in the editor, sent as the form field "photo", and
// gives its id for the draft. It belongs to no recipe until one is saved
// with it.
export const uploadPhoto = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const file = data instanceof FormData ? data.get('photo') : null
    if (!(file instanceof File)) throw new Error('Expected a photo')
    return file
  })
  .handler(async ({ data }): Promise<PhotoResult> => {
    if (data.size > MAX_PHOTO_BYTES) return { ok: false, error: 'too-large' }
    return storePhoto(new Uint8Array(await data.arrayBuffer()))
  })

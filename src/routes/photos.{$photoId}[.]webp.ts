import { createFileRoute } from '@tanstack/react-router'
import { photoIdSchema } from '@/core/photo'
import { readPhoto } from '@/server/photos/store.server'

// A stored cover photo. Its id is never reused, so browsers keep it for
// good.
export const Route = createFileRoute('/photos/{$photoId}.webp')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = photoIdSchema.safeParse(params.photoId)
        const photo = id.success ? await readPhoto(id.data) : null
        if (!photo) return new Response(null, { status: 404 })
        return new Response(new Uint8Array(photo), {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})

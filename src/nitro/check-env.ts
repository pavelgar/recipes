import { definePlugin } from 'nitro'
import { getDatabaseUrl, getPhotosDir } from '@/env.server'

// Runs once when the server starts, so a missing DATABASE_URL or PHOTOS_DIR
// stops the server immediately instead of failing on the first query or
// photo.
export default definePlugin(() => {
  getDatabaseUrl()
  getPhotosDir()
})

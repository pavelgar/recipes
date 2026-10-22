import { definePlugin } from 'nitro'
import { getDatabaseUrl } from '@/env.server'

// Runs once when the server starts, so a missing DATABASE_URL stops the
// server immediately instead of failing on the first query.
export default definePlugin(() => {
  getDatabaseUrl()
})

import { definePlugin } from 'nitro'
import { getAiSettings, getDatabaseUrl } from '@/env.server'

// Runs once when the server starts, so a missing DATABASE_URL or a wrong AI
// setting stops the server immediately instead of failing on the first
// request that needs it.
export default definePlugin(() => {
  getDatabaseUrl()
  getAiSettings()
})

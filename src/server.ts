import handler from '@tanstack/react-start/server-entry'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from '@/db/index.server'
import { paraglideMiddleware } from '@/paraglide/server'

// Brings the database up to date before the server answers its first
// request, so a new image upgrades its own data. The folder is relative to
// the working directory, as in drizzle.config.ts.
await migrate(db, { migrationsFolder: 'drizzle' })

// Makes the locale cookie available to getLocale() during SSR.
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}

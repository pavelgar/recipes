import handler from '@tanstack/react-start/server-entry'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from '@/server/db/index.server'
import { paraglideMiddleware } from '@/paraglide/server'

// Lets a save go through while another request reads, which SQLite's
// default journal doesn't. The database file keeps the mode. What it
// doesn't fix is in src/server/db/AGENTS.md.
await db.run(sql`PRAGMA journal_mode = WAL`)

// Brings the database up to date before the server answers its first
// request, so a new image upgrades its own data. The folder is relative to
// the working directory, as in src/server/db/drizzle.config.ts.
await migrate(db, { migrationsFolder: 'src/server/db/migrations' })

// Makes the locale cookie available to getLocale() during SSR.
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}

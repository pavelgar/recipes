import { drizzle } from 'drizzle-orm/libsql'
import { getDatabaseUrl } from '@/server/env.server'
import * as schema from '@/server/db/schema'

export const db = drizzle({ connection: { url: getDatabaseUrl() }, schema })

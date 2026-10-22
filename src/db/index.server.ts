import { drizzle } from 'drizzle-orm/libsql'
import { getDatabaseUrl } from '@/env.server'
import * as schema from '@/db/schema'

export const db = drizzle({ connection: { url: getDatabaseUrl() }, schema })

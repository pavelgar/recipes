import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { isNull } from 'drizzle-orm'
import { db } from '@/db/index.server'
import { recipes } from '@/db/schema'

// Every recipe that isn't deleted, whole, for the screens to show and
// search in the browser. The service worker keeps the last answer, so they
// can be read offline.
export const listRecipes = createServerFn({ method: 'GET' }).handler(() =>
  db.select().from(recipes).where(isNull(recipes.deletedAt)),
)

export const recipesQuery = queryOptions({
  queryKey: ['recipes'],
  queryFn: () => listRecipes(),
})

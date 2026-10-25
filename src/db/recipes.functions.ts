import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/index.server'
import { recipeInputSchema } from '@/db/recipe-input'
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

// One recipe that isn't deleted.
export const getRecipe = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const found = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, data.id), isNull(recipes.deletedAt)))
    const recipe = found.at(0)
    if (!recipe) throw notFound()
    return recipe
  })

// Under the list's key, so saving a recipe refreshes both.
export const recipeQuery = (id: number) =>
  queryOptions({
    queryKey: ['recipes', id],
    queryFn: () => getRecipe({ data: { id } }),
  })

// Saves a new recipe from the editor, and gives its id.
export const createRecipe = createServerFn({ method: 'POST' })
  .validator(recipeInputSchema)
  .handler(async ({ data }) => {
    const [saved] = await db
      .insert(recipes)
      .values(data)
      .returning({ id: recipes.id })
    return { id: saved.id }
  })

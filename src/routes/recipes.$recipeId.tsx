import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { BookXIcon } from 'lucide-react'

import { NotFound } from '@/components/not-found'
import { RecipeReadout } from '@/components/recipe-readout'
import { recipeQuery } from '@/server/recipes.functions'
import { m } from '@/paraglide/messages'

// A saved recipe, shown plainly until the recipe view is built.
export const Route = createFileRoute('/recipes/$recipeId')({
  // Ids are written as saved, so /recipes/1e3 or /recipes/012 is no
  // recipe's address.
  params: {
    parse: ({ recipeId }) => {
      const id = Number(recipeId)
      if (!/^[1-9]\d*$/.test(recipeId) || !Number.isSafeInteger(id)) {
        throw notFound()
      }
      return { recipeId: id }
    },
    stringify: ({ recipeId }) => ({ recipeId: String(recipeId) }),
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(recipeQuery(params.recipeId)),
  component: RecipePage,
  // No recipe has this id, or it was deleted.
  notFoundComponent: () => (
    <NotFound
      icon={BookXIcon}
      title={m.not_found_recipe_title()}
      description={m.not_found_recipe_description()}
    />
  ),
})

function RecipePage() {
  const { recipeId } = Route.useParams()
  const { data: recipe } = useSuspenseQuery(recipeQuery(recipeId))
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <RecipeReadout recipe={recipe} />
    </main>
  )
}

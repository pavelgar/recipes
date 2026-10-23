import { createFileRoute } from '@tanstack/react-router'
import { recipesQuery } from '@/db/recipes.functions'

export const Route = createFileRoute('/library')({
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
})

import { createFileRoute } from '@tanstack/react-router'
import { recipesQuery } from '@/server/recipes.functions'

export const Route = createFileRoute('/library')({
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
})

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isRecipeLanguage } from '@/core/languages'
import { suggestedLanguage } from '@/core/languages.server'

// The language a recipe's text is in, when the one chosen in the editor
// doesn't fit it, offered under the language. franc runs on the server, so
// its data isn't part of what the app downloads; without the server the
// editor offers nothing. A POST, so the service worker never answers it
// from its cache.
export const suggestLanguage = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      text: z.string().max(100_000),
      current: z.string().refine(isRecipeLanguage),
    }),
  )
  .handler(({ data }) => suggestedLanguage(data.text, data.current))

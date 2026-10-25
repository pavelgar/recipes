import { z } from 'zod'
import { MEASURING_SYSTEMS } from '@/db/choices'
import { linkSchema } from '@/lib/import/link'
import { isRecipeLanguage } from '@/lib/languages'

// A recipe as the editor saves it. The save server function checks what it
// is given against this, since anyone on the network can call it.

// Read-only, like the Section the database keeps.
const sections = z
  .array(
    z.object({
      heading: z.string().trim().min(1).max(500).nullable(),
      lines: z.array(z.string().trim().min(1).max(5000)).max(1000).readonly(),
    }),
  )
  .max(200)
  .readonly()

const minutes = z.number().int().min(1).max(100_000).nullable()

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  language: z.string().refine(isRecipeLanguage),
  measuringSystem: z.enum(MEASURING_SYSTEMS),
  servings: z.string().trim().min(1).max(200).nullable(),
  prepMinutes: minutes,
  cookMinutes: minutes,
  totalMinutes: minutes,
  ingredients: sections,
  steps: sections,
  sourceName: z.string().trim().min(1).max(500).nullable(),
  sourceUrl: linkSchema.nullable(),
})

export type RecipeInput = z.infer<typeof recipeInputSchema>

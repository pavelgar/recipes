import { z } from 'zod'
import { MEASURING_SYSTEMS } from '@/db/choices'
import { sectionsFromText, textFromSections } from '@/lib/editor/lines'
import { isRecipeLanguage, rulesFor } from '@/lib/languages'
import { guessMeasuringSystem } from '@/lib/measuring-system'
import { m } from '@/paraglide/messages'
import type { RecipeInput } from '@/db/recipe-input'
import type { ImportedRecipe } from '@/lib/import/types'
import type { RecipeLanguage } from '@/lib/languages'

// What the editor holds: every field as typed, ingredients and steps as
// text with one line each. It becomes a recipe only when saved.
const draftShape = z.object({
  title: z.string(),
  language: z.string().refine(isRecipeLanguage),
  measuringSystem: z.enum(MEASURING_SYSTEMS),
  servings: z.string(),
  prepMinutes: z.string(),
  cookMinutes: z.string(),
  totalMinutes: z.string(),
  ingredients: z.string(),
  steps: z.string(),
  sourceName: z.string(),
  // An import's page, which nobody edits. A typed recipe has none.
  sourceUrl: z.string(),
  // The id of its stored cover photo, or empty.
  photo: z.string(),
})

export type Draft = z.infer<typeof draftShape>

const minutes = z
  .string()
  .trim()
  .regex(/^\d{0,5}$/, { error: () => m.editor_minutes_invalid() })

// Checks a draft before saving, with messages for the person typing.
export const draftSchema = draftShape.extend({
  title: z
    .string()
    .trim()
    .min(1, { error: () => m.editor_title_required() }),
  prepMinutes: minutes,
  cookMinutes: minutes,
  totalMinutes: minutes,
})

export function emptyDraft(language: RecipeLanguage): Draft {
  return {
    title: '',
    language,
    measuringSystem: guessMeasuringSystem(null, language),
    servings: '',
    prepMinutes: '',
    cookMinutes: '',
    totalMinutes: '',
    ingredients: '',
    steps: '',
    sourceName: '',
    sourceUrl: '',
    photo: '',
  }
}

export function draftFromImport(
  recipe: ImportedRecipe,
  photo: string | null,
): Draft {
  const text = (value: number | string | null) =>
    value === null ? '' : String(value)
  return {
    title: recipe.title,
    language: recipe.language,
    measuringSystem: recipe.measuringSystem,
    servings: text(recipe.servings),
    prepMinutes: text(recipe.prepMinutes),
    cookMinutes: text(recipe.cookMinutes),
    totalMinutes: text(recipe.totalMinutes),
    ingredients: textFromSections(recipe.ingredients),
    steps: textFromSections(recipe.steps),
    sourceName: text(recipe.sourceName),
    sourceUrl: recipe.sourceUrl,
    photo: text(photo),
  }
}

// The recipe to save. Empty fields are left out, and the text becomes
// sections.
export function recipeFromDraft(draft: Draft): RecipeInput {
  const text = (value: string) => value.trim() || null
  const number = (value: string) => Number(value.trim()) || null
  const opts = {
    language: rulesFor(draft.language),
    system: draft.measuringSystem,
  }
  return {
    title: draft.title.trim(),
    language: draft.language,
    measuringSystem: draft.measuringSystem,
    servings: text(draft.servings),
    prepMinutes: number(draft.prepMinutes),
    cookMinutes: number(draft.cookMinutes),
    totalMinutes: number(draft.totalMinutes),
    ingredients: sectionsFromText(draft.ingredients, 'ingredient', opts),
    steps: sectionsFromText(draft.steps, 'step', opts),
    sourceName: text(draft.sourceName),
    sourceUrl: text(draft.sourceUrl),
    photo: text(draft.photo),
  }
}

// Unsaved drafts are kept in the browser, so a reload, a closed tab or a
// new version of the app doesn't lose them. There are two: one typed by
// hand, and one being checked after an import, kept with its link.
const STORAGE_KEY = 'recipes.drafts.v1'

// Stored drafts are checked for their shape only: one saved before its
// title was typed still loads, and one kept before photos came has none.
const storedDraft = draftShape.extend({ photo: z.string().default('') })

const stored = z.object({
  manual: storedDraft.optional().catch(undefined),
  imported: z
    .object({ link: z.string(), draft: storedDraft })
    .optional()
    .catch(undefined),
})

type Stored = z.infer<typeof stored>

function readAll(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = stored.safeParse(raw === null ? {} : JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

function writeAll(drafts: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // Storage full or blocked: the draft lives only in the open page.
  }
}

export function loadDraft(link: string | null): Draft | null {
  const drafts = readAll()
  if (link === null) return drafts.manual ?? null
  return drafts.imported?.link === link ? drafts.imported.draft : null
}

export function saveDraft(link: string | null, draft: Draft) {
  const drafts = readAll()
  writeAll(
    link === null
      ? { ...drafts, manual: draft }
      : { ...drafts, imported: { link, draft } },
  )
}

export function clearDraft(link: string | null) {
  const drafts = readAll()
  writeAll(
    link === null
      ? { ...drafts, manual: undefined }
      : { ...drafts, imported: undefined },
  )
}

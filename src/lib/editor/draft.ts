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
  // Lines AI wrote differently from the page or text it read them from,
  // which the editor marks until they're changed.
  reworded: z.array(z.string()),
})

export type Draft = z.infer<typeof draftShape>

// Where a draft came from: typed in, imported from a page (from its Recipe
// data or read with AI), or read with AI from photos or pasted text.
export type DraftOrigin =
  | { kind: 'typed' }
  | { kind: 'page'; link: string }
  | { kind: 'photos' }
  | { kind: 'text' }

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

// The add page's address for a draft, by where it came from.
export function addSearch(origin: DraftOrigin) {
  switch (origin.kind) {
    case 'typed':
      return {}
    case 'page':
      return { link: origin.link }
    case 'photos':
    case 'text':
      return { from: origin.kind }
  }
}

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
    reworded: [],
  }
}

export function draftFromImport(
  recipe: ImportedRecipe,
  {
    photo = null,
    reworded = [],
  }: {
    photo?: string | null
    reworded?: ReadonlyArray<string>
  } = {},
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
    sourceUrl: text(recipe.sourceUrl),
    photo: text(photo),
    reworded: [...reworded],
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
// hand, and one being checked after an import, kept with its link, or
// "photos" or "text" for one read from those. A new import's draft takes
// the place of the last.
const STORAGE_KEY = 'recipes.drafts.v1'

// Stored drafts are checked for their shape only: one saved before its
// title was typed still loads. Drafts kept before cover photos or AI
// imports came have no photo or reworded lines.
const storedDraft = draftShape.extend({
  photo: z.string().default(''),
  reworded: z.array(z.string()).default([]),
})

const stored = z.object({
  manual: storedDraft.optional().catch(undefined),
  imported: z
    .object({ link: z.string(), draft: storedDraft })
    .optional()
    .catch(undefined),
})

// What an import's draft is kept under. Links are web addresses, so they
// can't be "photos" or "text".
function importKey(origin: Exclude<DraftOrigin, { kind: 'typed' }>): string {
  return origin.kind === 'page' ? origin.link : origin.kind
}

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

export function loadDraft(origin: DraftOrigin): Draft | null {
  const drafts = readAll()
  if (origin.kind === 'typed') return drafts.manual ?? null
  return drafts.imported?.link === importKey(origin)
    ? drafts.imported.draft
    : null
}

export function saveDraft(origin: DraftOrigin, draft: Draft) {
  const drafts = readAll()
  writeAll(
    origin.kind === 'typed'
      ? { ...drafts, manual: draft }
      : { ...drafts, imported: { link: importKey(origin), draft } },
  )
}

export function clearDraft(origin: DraftOrigin) {
  const drafts = readAll()
  writeAll(
    origin.kind === 'typed'
      ? { ...drafts, manual: undefined }
      : { ...drafts, imported: undefined },
  )
}

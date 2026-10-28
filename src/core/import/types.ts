import type { Section } from '@/core/recipe/section'
import type { RecipeLanguage } from '@/core/languages'
import type { MeasuringSystem } from '@/core/quantities'

// What an import read from a recipe page, or AI from photos or pasted
// text, before anyone has checked it. Lines are as the source wrote them,
// with HTML entities decoded and runs of spaces made single.
export type ImportedRecipe = {
  title: string
  // The language the page states, unless its text says otherwise; unknown
  // when neither tells.
  language: RecipeLanguage
  // Guessed from the site's domain, then from the region the page states
  // with its language, then from the language. For photos and pasted text,
  // what the model finds the recipe states, then the language.
  measuringSystem: MeasuringSystem
  servings: string | null
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
  sourceName: string | null
  // The page it was read from. Photos and pasted text have none.
  sourceUrl: string | null
  // The address of the photo the recipe's data gives, if any.
  imageUrl: string | null
}

// Why a page couldn't be imported. The add screen words each one.
export type ImportError =
  | { code: 'private-address'; site: string }
  | { code: 'unreachable'; site: string }
  | { code: 'http-error'; site: string; status: number }
  // The site lets only browsers in.
  | { code: 'blocked'; site: string }
  | { code: 'not-a-page'; site: string }
  | { code: 'too-large'; site: string }
  | { code: 'no-recipe'; site: string }

// A recipe read comes with its photo, stored for the editor, when the page
// gives one the server could read.
export type ImportResult =
  | { ok: true; recipe: ImportedRecipe; photo: string | null }
  | { ok: false; error: ImportError }

// What AI read, with the lines it wrote differently from the page or
// pasted text it read them from, which the editor marks. Headings are
// among them as the editor writes them, ending with a colon.
export type AiImport = {
  recipe: ImportedRecipe
  reworded: ReadonlyArray<string>
}

// Why AI didn't read a recipe. The add dialog words each one.
export type AiReadError =
  // The container wasn't given a model.
  | { code: 'ai-unavailable' }
  | { code: 'text-too-long' }
  // The provider couldn't be reached or failed, or its answer wasn't a
  // recipe's shape.
  | { code: 'ai-failed' }
  // The model doesn't take images.
  | { code: 'photos-refused' }
  // The model found no recipe in what it read.
  | { code: 'nothing-read'; from: 'page' | 'photos' | 'text' }

export type AiReadResult =
  ({ ok: true } & AiImport) | { ok: false; error: AiReadError | ImportError }

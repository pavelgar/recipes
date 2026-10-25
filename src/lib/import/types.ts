import type { Section } from '@/db/schema'
import type { RecipeLanguage } from '@/lib/languages'
import type { MeasuringSystem } from '@/lib/quantities'

// What an import read from a recipe page, before anyone has checked it.
// Lines are as the page published them, with HTML entities decoded and
// runs of spaces made single.
export type ImportedRecipe = {
  title: string
  // The language the page states, unless its text says otherwise; unknown
  // when neither tells.
  language: RecipeLanguage
  // Guessed from the site's domain, then from the region the page states
  // with its language, then from the language.
  measuringSystem: MeasuringSystem
  servings: string | null
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
  sourceName: string | null
  sourceUrl: string
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

export type ImportResult =
  { ok: true; recipe: ImportedRecipe } | { ok: false; error: ImportError }

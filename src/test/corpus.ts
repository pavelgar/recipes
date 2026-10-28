import { decodeHTML } from 'entities'
import type { Language } from '@/lib/quantities/numbers'
import type { MeasuringSystem } from '@/lib/quantities/scan'

// Reads the real recipe data in tests/corpus/ (see tests/corpus/AGENTS.md)
// for tests.

type Country = 'FI' | 'US' | 'GB' | 'AU'

// rare-forms recipes may have only ingredients or only sentences.
type CorpusFile<T extends string> = {
  site: string
  country: Country
  language: Language
  recipes: Array<
    { url: string; name?: string } & Partial<Record<T, Array<string>>>
  >
}

const ingredientFiles = import.meta.glob<CorpusFile<'ingredients'>>(
  [
    '/tests/corpus/ingredients/*.json',
    '/tests/corpus/rare-units/*.json',
    '/tests/corpus/rare-forms/*.json',
    '/tests/corpus/former-held-out/*.json',
  ],
  { eager: true, import: 'default' },
)
const stepFiles = import.meta.glob<CorpusFile<'sentences'>>(
  [
    '/tests/corpus/steps/*.json',
    '/tests/corpus/rare-forms/*.json',
    '/tests/corpus/former-held-out/*.json',
  ],
  { eager: true, import: 'default' },
)

// The held-out sample (tests/corpus/held-out/) is read only by the
// held-out.test.ts files, which run on request. Don't use it while writing
// rules.
const heldOutFiles = import.meta.glob<CorpusFile<'ingredients' | 'sentences'>>(
  '/tests/corpus/held-out/*.json',
  { eager: true, import: 'default' },
)

const SYSTEMS: Record<Country, MeasuringSystem> = {
  FI: 'metric',
  US: 'us',
  GB: 'british',
  AU: 'australian',
}

// Sites publish some text with HTML entities. The importer decodes them
// before parsing (clean() in src/lib/import/recipe.ts, which also makes
// runs of spaces single); this stands in for the decoding.
export function decodeEntities(text: string): string {
  return decodeHTML(text)
}

export type CorpusLine = {
  site: string
  language: Language
  system: MeasuringSystem
  text: string
}

function lines<T extends string>(
  files: Record<string, CorpusFile<T>>,
  field: T,
): Array<CorpusLine> {
  return Object.values(files).flatMap((file) =>
    file.recipes.flatMap((recipe) =>
      (recipe[field] ?? []).map((raw) => ({
        site: file.site,
        language: file.language,
        system: SYSTEMS[file.country],
        text: decodeEntities(raw),
      })),
    ),
  )
}

export const ingredientLines = lines(ingredientFiles, 'ingredients')
export const stepSentences = lines(stepFiles, 'sentences')
export const heldOutIngredientLines = lines(heldOutFiles, 'ingredients')
export const heldOutStepSentences = lines(heldOutFiles, 'sentences')

export type CorpusRecipe = {
  site: string
  language: Language
  url: string
  title: string
  ingredients: Array<string>
}

function recipes(
  files: Record<string, CorpusFile<'ingredients'>>,
): Array<CorpusRecipe> {
  return Object.values(files).flatMap((file) =>
    file.recipes.map((recipe) => ({
      site: file.site,
      language: file.language,
      url: recipe.url,
      title: decodeEntities(recipe.name ?? ''),
      ingredients: (recipe.ingredients ?? []).map(decodeEntities),
    })),
  )
}

// Every recipe of the development corpus with its title and ingredient
// lines, for search. rare-forms recipes may have no ingredients.
export const corpusRecipes = recipes(ingredientFiles)
export const heldOutRecipes = recipes(heldOutFiles)

type TagFile = {
  site: string
  language: Language
  recipes: Array<
    { url: string } & Partial<
      Record<'recipeCategory' | 'recipeCuisine' | 'keywords', unknown>
    >
  >
}

const tagFiles = import.meta.glob<TagFile>('/tests/corpus/tags/*.json', {
  eager: true,
  import: 'default',
})

export type CorpusTag = { site: string; language: Language; text: string }

// The categories, cuisines and keywords of tests/corpus/tags/, one tag each, as
// the importer will split them: a list's items, and a string at commas
// and at the ";;" kingarthurbaking.com uses. Repeats within a site are
// left out.
export const corpusTags: Array<CorpusTag> = Object.values(tagFiles).flatMap(
  (file) => {
    const seen = new Set<string>()
    return file.recipes.flatMap((recipe) =>
      [recipe.recipeCategory, recipe.recipeCuisine, recipe.keywords]
        .flatMap((field) => (Array.isArray(field) ? field : [field]))
        .filter((field) => typeof field === 'string')
        .flatMap((field) => field.split(/,|;;/))
        .map((part) => decodeEntities(part).trim())
        .filter((text) => {
          if (text === '' || seen.has(text)) return false
          seen.add(text)
          return true
        })
        .map((text) => ({ site: file.site, language: file.language, text })),
    )
  },
)

export function inCorpus(corpus: Array<CorpusLine>, text: string): boolean {
  return corpus.some((line) => line.text === text)
}
